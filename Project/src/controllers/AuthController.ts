// src/controllers/AuthController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair dados já validados do req.body (tipado via LoginInput)
//   2. Invocar o AuthService
//   3. Mapear erros de negócio → respostas HTTP semânticas
//   4. Retornar 200 OK com os dados públicos do usuário + token
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  AuthService,
  AuthenticationError,
  ProfileMismatchError,
  RESET_PASSWORD_GENERIC_MESSAGE,
} from "../services/AuthService";
import { LoginInput } from "../middlewares/validateLoginInput";
import { ForgotPasswordInput } from "../middlewares/validateForgotPasswordInput";
import { ResetPasswordInput } from "../middlewares/validateResetPasswordInput";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response): Promise<void> => {
    // O body já foi validado e transformado pelo middleware
    const body = req.body as LoginInput;
    const input: LoginInput = {
      email: body.email,
      password: body.password,
      profile: body.profile,
      crea: body.crea,
    };

    try {
      const user = await this.authService.login(input);

      res.status(200).json({
        status: "success",
        message: "Login realizado com sucesso.",
        data: { user },
      });
    } catch (error) {
      // ── E-mail ou senha inválidos ────────────────────────────────
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Perfil não corresponde ao cadastro ────────────────────────
      if (error instanceof ProfileMismatchError) {
        res.status(401).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 sem vazar detalhes internos ──────
      console.error("[AuthController] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as ForgotPasswordInput;

    try {
      const message = await this.authService.forgotPassword(input);

      res.status(200).json({
        status: "success",
        message,
      });
    } catch (error) {
      console.error("[AuthController] Erro inesperado no forgot-password:", error);

      // Mantém anti-enumeração mesmo em erro inesperado.
      res.status(200).json({
        status: "success",
        message: RESET_PASSWORD_GENERIC_MESSAGE,
      });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const input = req.body as ResetPasswordInput;

    try {
      await this.authService.resetPassword(input);

      res.status(200).json({
        status: "success",
        message: "Senha redefinida com sucesso.",
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      console.error("[AuthController] Erro inesperado no reset-password:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };
}
