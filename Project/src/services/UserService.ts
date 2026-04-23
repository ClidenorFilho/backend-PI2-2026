// src/services/UserService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Hash da senha com bcrypt
//   2. Verificação de unicidade (e-mail e CPF)
//   3. Sanitização do CPF (apenas dígitos)
//   4. Persistência via PrismaClient
// ─────────────────────────────────────────────────────────────────

import bcrypt from "bcrypt";
import { Prisma, ProfileType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { RegisterUserInput } from "../middlewares/validateUserRegistration";

// ── Tipos de retorno ──────────────────────────────────────────────

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  profile: ProfileType;
}

export class ConflictError extends Error {
  public readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "ConflictError";
    this.field = field;
  }
}

// ── Constantes ────────────────────────────────────────────────────

const BCRYPT_SALT_ROUNDS = 12;

// ── Service ───────────────────────────────────────────────────────

export class UserService {
  /**
   * Cria um novo usuário aplicando todas as regras de negócio.
   * @throws {ConflictError} se e-mail ou CPF já estiverem cadastrados.
   */
  async createUser(input: RegisterUserInput): Promise<CreatedUser> {
    const cpfDigitsOnly = input.cpf.replace(/\D/g, "");

    // 1. Verificar unicidade (e-mail e CPF em paralelo)
    await this.assertUniqueness(input.email, cpfDigitsOnly);

    // 2. Hash da senha
    const hashedPassword = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);

    // 3. Montar payload — CREA só é salvo se perfil for CONSTRUTOR
    const data: Prisma.UserCreateInput = {
      nome: input.name.trim(),
      email: input.email,
      cpf: cpfDigitsOnly,
      hashSenha: hashedPassword,
      profile: input.profile as ProfileType,
      ...(input.profile === "CONSTRUTOR"
        ? { construtor: { create: { crea: input.crea!.trim() } } }
        : { proprietario: { create: {} } }),
    };

    // 4. Persistir
    let user;
    try {
      user = await prisma.user.create({ data });
    } catch (error) {
      throw this.mapPrismaError(error);
    }

    // 5. Retornar apenas os campos públicos (sem password, sem cpf)
    return {
      id: user.id,
      name: user.nome,
      email: user.email,
      profile: user.profile,
    };
  }

  // ── Helpers privados ────────────────────────────────────────────

  private async assertUniqueness(
    email: string,
    cpf: string
  ): Promise<void> {
    // Busca paralela para economizar RTT com o banco
    const [existingEmail, existingCpf] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { cpf }, select: { id: true } }),
    ]);

    if (existingEmail) {
      throw new ConflictError(
        "email",
        "Este e-mail já está cadastrado. Utilize outro ou faça login."
      );
    }

    if (existingCpf) {
      throw new ConflictError(
        "cpf",
        "Este CPF já está vinculado a uma conta existente."
      );
    }
  }

  private mapPrismaError(error: unknown): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta?.target
        : [String(error.meta?.target ?? "")];

      if (target.includes("email_user") || target.includes("email")) {
        return new ConflictError(
          "email",
          "Este e-mail já está cadastrado. Utilize outro ou faça login."
        );
      }

      if (target.includes("cpf_user") || target.includes("cpf")) {
        return new ConflictError(
          "cpf",
          "Este CPF já está vinculado a uma conta existente."
        );
      }

      return new ConflictError(
        "general",
        "Já existe um cadastro com os dados informados."
      );
    }

    return error instanceof Error ? error : new Error("Erro inesperado");
  }
}
