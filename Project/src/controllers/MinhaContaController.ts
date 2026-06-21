// src/controllers/MinhaContaController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair userId de req.user (injetado pelo authMiddleware)
//   2. Extrair body já validado pelos middlewares Zod
//   3. Invocar MinhaContaService e mapear erros → respostas HTTP
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  MinhaContaService,
  NotFoundError,
  ConflictMinhaContaError,
  InvalidCredentialsError,
} from "../services/MinhaContaService";
import { UpdateProfileInput, ChangePasswordInput } from "../middlewares/validateMinhaConta";

export class MinhaContaController {
  constructor(private readonly minhaContaService: MinhaContaService) {}

  // ================================================================
  // GET /users/me
  // ================================================================

  getMe = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
      const profile = await this.minhaContaService.getMe(userId);

      res.status(200).json({
        status: "success",
        message: "Perfil carregado com sucesso.",
        data: { user: profile },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      console.error("[MinhaContaController.getMe] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };

  // ================================================================
  // PATCH /users/me/profile
  // ================================================================

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const input = req.body as UpdateProfileInput;

    try {
      const updated = await this.minhaContaService.updateProfile(userId, input);

      res.status(200).json({
        status: "success",
        message: "Perfil atualizado com sucesso.",
        data: { user: updated },
      });
    } catch (error) {
      // ── E-mail já em uso por outro usuário ───────────────────────
      if (error instanceof ConflictMinhaContaError) {
        res.status(409).json({
          status: "error",
          message: error.message,
          errors: { [error.field]: error.message },
        });
        return;
      }

      // ── Usuário não encontrado ────────────────────────────────────
      if (error instanceof NotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      console.error("[MinhaContaController.updateProfile] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };

  // ================================================================
  // PATCH /users/me/password
  // ================================================================

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const input = req.body as ChangePasswordInput;

    try {
      await this.minhaContaService.changePassword(userId, input);

      res.status(200).json({
        status: "success",
        message: "Senha alterada com sucesso.",
      });
    } catch (error) {
      // ── Senha atual incorreta ─────────────────────────────────────
      if (error instanceof InvalidCredentialsError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Usuário não encontrado ────────────────────────────────────
      if (error instanceof NotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      console.error("[MinhaContaController.changePassword] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };
}
