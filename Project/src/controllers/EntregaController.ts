// src/controllers/EntregaController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair projectId de req.params
//   2. Extrair body já validado pelo middleware validateEntrega
//   3. Invocar EntregaService e mapear erros de domínio → HTTP
//
// Mapeamento HTTP:
//   deliver → POST /projects/:projectId/deliver → 200
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  EntregaService,
  ProjectNotFoundError,
  AlreadyDeliveredError,
  ProfileConflictError,
} from "../services/EntregaService";
import { EntregaInput } from "../middlewares/validateEntrega";

export class EntregaController {
  constructor(private readonly entregaService: EntregaService) {}

  // ================================================================
  // POST /projects/:projectId/deliver
  // ================================================================

  deliver = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const input = req.body as EntregaInput;

    try {
      const result = await this.entregaService.entregar(projectId, input);

      res.status(200).json({
        status: "success",
        message: result.proprietario.criado
          ? "Projeto entregue com sucesso. Uma conta de Proprietário foi criada automaticamente."
          : "Projeto entregue com sucesso ao Proprietário existente.",
        data: result,
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Projeto já entregue ───────────────────────────────────────
      if (error instanceof AlreadyDeliveredError) {
        res.status(409).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── CPF ou e-mail pertence a um Construtor ────────────────────
      if (error instanceof ProfileConflictError) {
        res.status(409).json({
          status: "error",
          message: error.message,
          errors: { [error.field]: error.message },
        });
        return;
      }

      console.error("[EntregaController.deliver] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };
}
