// src/services/AuthService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Buscar usuário pelo e-mail
//   2. Comparar senha com bcrypt
//   3. Validar perfil
//   4. Gerar token JWT contendo id + profile
// ─────────────────────────────────────────────────────────────────

import bcrypt from "bcrypt";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { ProfileType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { LoginInput } from "../middlewares/validateLoginInput";
import { ForgotPasswordInput } from "../middlewares/validateForgotPasswordInput";
import { ResetPasswordInput } from "../middlewares/validateResetPasswordInput";

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
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_PASSWORD_GENERIC_MESSAGE =
  "Caso o e-mail esteja cadastrado, você receberá um link de recuperação.";
const FRONTEND_RESET_PASSWORD_URL =
  process.env.FRONTEND_RESET_PASSWORD_URL ||
  "http://localhost:5173/redefinir-senha";
const RESET_PASSWORD_EMAIL_SUBJECT =
  "Redefinição de Senha - Sistema Manual do Proprietário";
const BCRYPT_SALT_ROUNDS = 12;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${name}`);
  }

  return value;
}

let cachedMailer:
  | {
      transporter: nodemailer.Transporter;
      from: string;
    }
  | undefined;

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

  async forgotPassword(input: ForgotPasswordInput): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, nome: true },
    });

    if (!user) {
      return RESET_PASSWORD_GENERIC_MESSAGE;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: expiresAt,
      },
    });

    // Envio em background para não bloquear a resposta da API.
    void this.sendResetPasswordEmail({
      to: user.email,
      userName: user.nome,
      rawToken,
    });

    return RESET_PASSWORD_GENERIC_MESSAGE;
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = this.hashResetToken(input.token);
    const now = new Date();

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: tokenHash,
        resetPasswordExpires: {
          gt: now,
        },
      },
      select: { id: true },
    });

    if (!user) {
      throw new AuthenticationError("Token inválido ou expirado.");
    }

    const hashedPassword = await bcryptjs.hash(input.password, BCRYPT_SALT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashSenha: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  private hashResetToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  private async sendResetPasswordEmail(payload: {
    to: string;
    userName: string;
    rawToken: string;
  }): Promise<void> {
    try {
      const mailer = await this.getMailer();
      const resetLink = `${FRONTEND_RESET_PASSWORD_URL}?token=${encodeURIComponent(
        payload.rawToken
      )}`;

      const text = [
        "Olá,",
        "Recebemos uma solicitação para redefinir a senha da sua conta no Manual do Proprietário.",
        `Para criar uma nova senha, clique no link abaixo: Link Seguro: ${resetLink}`,
        "Este link é válido por 30 minutos e pode ser utilizado apenas uma vez.",
        "Se você não solicitou esta alteração, por favor, ignore este e-mail. A segurança da sua conta permanece inalterada.",
        "Atenciosamente, Equipe Manual do Proprietário.",
      ].join("\n");

      await mailer.transporter.sendMail({
        from: mailer.from,
        to: payload.to,
        subject: RESET_PASSWORD_EMAIL_SUBJECT,
        text,
      });

      console.log(`[AuthService] E-mail de recuperação enviado para ${payload.to}`);
    } catch (error) {
      console.error("[AuthService] Falha ao enviar e-mail de recuperação:", error);
    }
  }

  private async getMailer(): Promise<{
    transporter: nodemailer.Transporter;
    from: string;
  }> {
    if (cachedMailer) {
      return cachedMailer;
    }

    const transporter = nodemailer.createTransport({
      host: getRequiredEnv("SMTP_HOST"),
      port: SMTP_PORT,
      secure: true,
      auth: {
        user: getRequiredEnv("SMTP_USER"),
        pass: getRequiredEnv("SMTP_PASS"),
      },
    });

    cachedMailer = {
      transporter,
      from: `"Equipe Manual do Proprietário" <${getRequiredEnv("SMTP_USER")}>`,
    };

    return cachedMailer;
  }
}

export { RESET_PASSWORD_GENERIC_MESSAGE };
