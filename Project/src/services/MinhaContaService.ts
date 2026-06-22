// src/services/MinhaContaService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Buscar e retornar perfil do usuário com CPF mascarado e
//      regra de CREA por perfil (getMe)
//   2. Atualizar dados pessoais com verificação de e-mail duplicado
//      (updateProfile)
//   3. Alterar senha com verificação da senha atual via bcrypt
//      (changePassword)
// ─────────────────────────────────────────────────────────────────

import bcrypt from "bcrypt";
import { ProfileType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { UpdateProfileInput, ChangePasswordInput } from "../middlewares/validateMinhaConta";

// ── Constantes ────────────────────────────────────────────────────

const BCRYPT_SALT_ROUNDS = 12;

// ── Erros de domínio ──────────────────────────────────────────────

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictMinhaContaError extends Error {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "ConflictMinhaContaError";
    this.field = field;
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

// ── Tipo de retorno público do perfil ─────────────────────────────

export interface UserProfileResponse {
  id: string;
  nome: string;
  email: string;
  cpf: string;       // Sempre mascarado: ***.456.789-**
  profile: ProfileType;
  crea: string | null; // null quando PROPRIETARIO
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Mascara o CPF armazenado (somente dígitos) para o formato ***.456.789-**
 * O CPF é salvo no banco apenas com dígitos (11 chars). Ex: "12345678901"
 * Saída esperada: ***.456.789-**  (exibe posições 3-8 do número formatado)
 *
 * CPF formatado: XXX.YYY.ZZZ-WW
 *   - Posições 0-2 (XXX): mascaradas → ***
 *   - Posições 4-6 (YYY): exibidas
 *   - Posições 8-10 (ZZZ): exibidas
 *   - Posições 12-13 (WW): mascaradas → **
 */
function maskCpf(cpfDigits: string): string {
  // Garante que temos exatamente 11 dígitos
  const d = cpfDigits.replace(/\D/g, "").padStart(11, "0");
  //                   ***  .  [d3d4d5]  .  [d6d7d8]  -  **
  return `***.${d[3]}${d[4]}${d[5]}.${d[6]}${d[7]}${d[8]}-**`;
}

/**
 * Formata a resposta de perfil aplicando as regras de negócio:
 * - CPF sempre mascarado
 * - CREA retornado apenas para CONSTRUTOR; null para PROPRIETARIO
 */
function formatProfile(
  user: {
    id: string;
    nome: string;
    email: string;
    cpf: string;
    profile: ProfileType;
    construtor?: { crea: string } | null;
  }
): UserProfileResponse {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    cpf: maskCpf(user.cpf),
    profile: user.profile,
    crea: user.profile === "CONSTRUTOR" ? (user.construtor?.crea ?? null) : null,
  };
}

// ── Service ───────────────────────────────────────────────────────

export class MinhaContaService {

  // ================================================================
  // GET /users/me — Leitura do Perfil
  // ================================================================

  /**
   * Retorna os dados públicos do usuário autenticado.
   * @throws {NotFoundError} se o userId não corresponder a nenhum usuário.
   */
  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        profile: true,
        construtor: {
          select: { crea: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    return formatProfile(user);
  }

  // ================================================================
  // PATCH /users/me/profile — Edição de Dados Pessoais
  // ================================================================

  /**
   * Atualiza nome, e-mail e/ou crea do usuário.
   * @throws {NotFoundError} se o usuário não for encontrado.
   * @throws {ConflictMinhaContaError} se o novo e-mail já estiver em uso.
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserProfileResponse> {
    // 1. Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profile: true,
        construtor: { select: { crea: true } },
      },
    });

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    // 2. Se o e-mail está sendo alterado, verificar unicidade
    if (input.email && input.email !== user.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (emailInUse) {
        throw new ConflictMinhaContaError(
          "email",
          "Este e-mail já está em uso por outro usuário."
        );
      }
    }

    // 3. Atualizar tabela User (nome e/ou email)
    const userUpdateData: { nome?: string; email?: string } = {};
    if (input.nome) userUpdateData.nome = input.nome.trim();
    if (input.email) userUpdateData.email = input.email;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // 4. Atualizar CREA (apenas para CONSTRUTOR e se o campo foi enviado)
    if (input.crea !== undefined && user.profile === "CONSTRUTOR") {
      await prisma.construtor.update({
        where: { idUser: userId },
        data: { crea: input.crea.trim() },
      });
    }

    // 5. Re-buscar os dados atualizados para retornar a resposta formatada
    const updated = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        cpf: true,
        profile: true,
        construtor: { select: { crea: true } },
      },
    });

    return formatProfile(updated);
  }

  // ================================================================
  // PATCH /users/me/password — Alteração de Senha
  // ================================================================

  /**
   * Altera a senha do usuário após validar a senha atual.
   * @throws {NotFoundError} se o usuário não for encontrado.
   * @throws {InvalidCredentialsError} se a senha atual não conferir.
   */
  async changePassword(
    userId: string,
    input: ChangePasswordInput
  ): Promise<void> {
    // 1. Buscar o hash atual da senha
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, hashSenha: true },
    });

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    // 2. Comparar senha atual com o hash armazenado
    const senhaCorreta = await bcrypt.compare(input.senhaAtual, user.hashSenha);

    if (!senhaCorreta) {
      throw new InvalidCredentialsError(
        "A senha atual informada está incorreta."
      );
    }

    // 3. Gerar hash da nova senha
    const novoHash = await bcrypt.hash(input.novaSenha, BCRYPT_SALT_ROUNDS);

    // 4. Persistir nova senha
    await prisma.user.update({
      where: { id: userId },
      data: { hashSenha: novoHash },
    });
  }
}
