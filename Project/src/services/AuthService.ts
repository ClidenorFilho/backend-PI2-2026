// src/services/AuthService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Buscar usuário pelo e-mail
//   2. Comparar senha com bcrypt
//   3. Validar perfil
//   4. Gerar token JWT contendo id + profile
// ─────────────────────────────────────────────────────────────────

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ProfileType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { LoginInput } from "../middlewares/validateLoginInput";

// ── Tipos de retorno ──────────────────────────────────────────────

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  profile: ProfileType;
  token: string;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ProfileMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileMismatchError";
  }
}

// ── Constantes ────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRATION = "24h";

// ── Service ───────────────────────────────────────────────────────

export class AuthService {
  /**
   * Autentica um usuário com e-mail, senha e perfil.
   * @throws {AuthenticationError} se e-mail ou senha forem inválidos.
   * @throws {ProfileMismatchError} se o perfil informado não corresponder.
   */
  async login(input: LoginInput): Promise<AuthenticatedUser> {
    // 1. Buscar usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        construtor: {
          select: { crea: true },
        },
      },
    });

    // 2. Verificar se usuário existe
    if (!user) {
      throw new AuthenticationError(
        "E-mail ou senha inválidos."
      );
    }

    // 3. Validar perfil informado
    if (user.profile !== input.profile) {
      throw new ProfileMismatchError(
        "O perfil informado não corresponde ao cadastro. Verifique sua seleção."
      );
    }

    // 4. Comparar senha com bcrypt
    const passwordMatch = await bcrypt.compare(
      input.password,
      user.hashSenha
    );

    if (!passwordMatch) {
      throw new AuthenticationError(
        "E-mail ou senha inválidos."
      );
    }

    // 5. Para CONSTRUTOR, validar também o CREA informado no login
    if (input.profile === "CONSTRUTOR") {
      const providedCrea = input.crea?.trim();
      const storedCrea = user.construtor?.crea?.trim();

      if (!providedCrea || !storedCrea || providedCrea !== storedCrea) {
        throw new AuthenticationError("E-mail ou senha inválidos.");
      }
    }

    // 6. Gerar JWT contendo id e profile
    const token = jwt.sign(
      {
        id: user.id,
        profile: user.profile,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // 7. Retornar dados públicos + token
    return {
      id: user.id,
      name: user.nome,
      email: user.email,
      profile: user.profile,
      token,
    };
  }

  /**
   * Verifica e decodifica um token JWT.
   * @throws se o token for inválido ou expirado.
   */
  verifyToken(token: string): { id: string; profile: ProfileType } {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as {
        id: string;
        profile: ProfileType;
      };
      return payload;
    } catch (error) {
      throw new Error("Token inválido ou expirado.");
    }
  }
}
