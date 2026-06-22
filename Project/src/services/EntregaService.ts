// src/services/EntregaService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Buscar Proprietário existente por CPF ou e-mail
//   2. Se não existir: criar User (PROPRIETARIO) + Proprietario em hash
//   3. Se existir: validar que o perfil é PROPRIETARIO
//   4. Dentro de $transaction: vincular Proprietario ao Projeto
//      e alterar status → ENTREGUE
//
// Erros de domínio:
//   ProjectNotFoundError      → 404
//   AlreadyDeliveredError     → 409 (projeto já foi entregue)
//   ProfileConflictError      → 409 (CPF/email pertence a um CONSTRUTOR)
// ─────────────────────────────────────────────────────────────────

import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { EntregaInput } from "../middlewares/validateEntrega";

// ── Constantes ────────────────────────────────────────────────────

const BCRYPT_SALT_ROUNDS = 10;

// ── Erros de Domínio ──────────────────────────────────────────────

export class ProjectNotFoundError extends Error {
  constructor(message = "Projeto não encontrado.") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class AlreadyDeliveredError extends Error {
  constructor(message = "Este projeto já foi entregue a um proprietário.") {
    super(message);
    this.name = "AlreadyDeliveredError";
  }
}

export class ProfileConflictError extends Error {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "ProfileConflictError";
    this.field = field;
  }
}

// ── Tipo de retorno ───────────────────────────────────────────────

export interface EntregaResult {
  idProjeto: string;
  status: string;
  proprietario: {
    id: string;
    nome: string;
    email: string;
    criado: boolean; // true = conta nova; false = conta já existia
  };
}

// ── Service ───────────────────────────────────────────────────────

export class EntregaService {
  /**
   * Executa a entrega do projeto ao Proprietário.
   *
   * Fluxo:
   *   1. Verificar existência do projeto e se já foi entregue
   *   2. Localizar ou criar o Proprietário pelo CPF / e-mail
   *   3. Transação: atualizar Projeto (idProprietario + status ENTREGUE)
   *
   * @throws {ProjectNotFoundError}  se o projeto não existir
   * @throws {AlreadyDeliveredError} se o projeto já estiver entregue
   * @throws {ProfileConflictError}  se o CPF ou e-mail pertencer a um CONSTRUTOR
   */
  async entregar(
    projectId: string,
    input: EntregaInput
  ): Promise<EntregaResult> {
    const cpfDigitsOnly = input.cpf.replace(/\D/g, "");

    // ── 1. Verificar existência e status do projeto ────────────────
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto: projectId },
      select: { idProjeto: true, status: true, idProprietario: true },
    });

    if (!projeto) {
      throw new ProjectNotFoundError();
    }

    if (projeto.status === "ENTREGUE") {
      throw new AlreadyDeliveredError();
    }

    // ── 2. Localizar ou criar o Proprietário ──────────────────────
    const { proprietarioId, nomeProprietario, emailProprietario, criado } =
      await this.resolveProprietario(cpfDigitsOnly, input.email);

    // ── 3. $transaction: vincular + mudar status ──────────────────
    await prisma.$transaction(async (tx) => {
      await tx.projeto.update({
        where: { idProjeto: projectId },
        data: {
          idProprietario: proprietarioId,
          status: "ENTREGUE",
        },
      });
    });

    return {
      idProjeto: projectId,
      status: "ENTREGUE",
      proprietario: {
        id: proprietarioId,
        nome: nomeProprietario,
        email: emailProprietario,
        criado,
      },
    };
  }

  // ── Helper: localiza um User por CPF ou e-mail, ou cria um novo ──

  private async resolveProprietario(
    cpf: string,
    email: string
  ): Promise<{
    proprietarioId: string;
    nomeProprietario: string;
    emailProprietario: string;
    criado: boolean;
  }> {
    // Busca paralela: verifica se existe User com esse CPF ou e-mail
    const [porCpf, porEmail] = await Promise.all([
      prisma.user.findUnique({
        where: { cpf },
        select: { id: true, nome: true, email: true, profile: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true, nome: true, email: true, profile: true },
      }),
    ]);

    // Determinar qual registro encontrado usar (prioriza CPF)
    const userExistente = porCpf ?? porEmail;

    if (userExistente) {
      // Validar que o usuário encontrado é um PROPRIETARIO
      if (userExistente.profile !== "PROPRIETARIO") {
        const conflictField = porCpf ? "cpf" : "email";
        throw new ProfileConflictError(
          conflictField,
          `O ${conflictField.toUpperCase()} informado pertence a um Construtor cadastrado no sistema. ` +
            `Utilize os dados de um Proprietário válido.`
        );
      }

      // Usuário já é PROPRIETARIO — reutilizar
      return {
        proprietarioId: userExistente.id,
        nomeProprietario: userExistente.nome,
        emailProprietario: userExistente.email,
        criado: false,
      };
    }

    // Usuário não existe — criar conta de Proprietário automaticamente
    // Senha padrão = hash do CPF (sem formatação) com salt 10
    const hashedSenha = await bcrypt.hash(cpf, BCRYPT_SALT_ROUNDS);

    // Derivar um nome a partir do e-mail enquanto não há formulário
    const nomeDerivado = this.deriveNameFromEmail(email);

    const novoUser = await prisma.user.create({
      data: {
        nome: nomeDerivado,
        cpf,
        email,
        hashSenha: hashedSenha,
        profile: "PROPRIETARIO",
        proprietario: {
          create: {},
        },
      },
      select: { id: true, nome: true, email: true },
    });

    return {
      proprietarioId: novoUser.id,
      nomeProprietario: novoUser.nome,
      emailProprietario: novoUser.email,
      criado: true,
    };
  }

  /**
   * Deriva um nome de exibição a partir da parte local do e-mail.
   * Ex: "joao.silva@email.com" → "Joao Silva"
   */
  private deriveNameFromEmail(email: string): string {
    const local = email.split("@")[0] ?? "Proprietario";
    return local
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
}
