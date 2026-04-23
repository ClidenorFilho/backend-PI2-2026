// src/controllers/UserController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair dados já validados do req.body (tipado via RegisterUserInput)
//   2. Invocar o UserService
//   3. Mapear erros de negócio → respostas HTTP semânticas
//   4. Retornar 201 Created com os dados públicos do usuário
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { UserService, ConflictError } from "../services/UserService";
import { RegisterUserInput } from "../middlewares/validateUserRegistration";

export class UserController {
  constructor(private readonly userService: UserService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    // O body já foi validado e transformado pelo middleware
    const input = req.body as RegisterUserInput;

    try {
      const user = await this.userService.createUser(input);

      res.status(201).json({
        status: "success",
        message: "Usuário cadastrado com sucesso.",
        data: { user },
      });
    } catch (error) {
      // ── Conflito de unicidade (e-mail ou CPF duplicado) ──────────
      if (error instanceof ConflictError) {
        res.status(409).json({
          status: "error",
          message: error.message,
          errors: { [error.field]: error.message },
        });
        return;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        res.status(409).json({
          status: "error",
          message: "Já existe um cadastro com os dados informados.",
        });
        return;
      }

      // ── Erros inesperados → 500 sem vazar detalhes internos ──────
      console.error("[UserController] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };
}
