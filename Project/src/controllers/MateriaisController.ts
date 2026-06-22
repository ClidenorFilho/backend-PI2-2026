// src/controllers/MateriaisController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair projectId / materialId dos params de rota
//   2. Extrair body já validado pelos middlewares Zod
//   3. Invocar MateriaisService e mapear erros de domínio → HTTP
//
// Mapeamento HTTP:
//   create  → POST   /projects/:projectId/materials   → 201
//   update  → PATCH  /materials/:materialId            → 200
//   list    → GET    /projects/:projectId/materials   → 200
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  MateriaisService,
  MaterialNotFoundError,
  ProjectNotFoundError,
  RoomNotFoundError,
} from "../services/MateriaisService";
import {
  CreateMaterialInput,
  UpdateMaterialInput,
  ListMateriaisFilters,
} from "../middlewares/validateMateriais";

// Extensão local para acessar parsedFilters injetado pelo middleware
type RequestWithFilters = Request & {
  parsedFilters: ListMateriaisFilters;
};

export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  // ================================================================
  // POST /projects/:projectId/materials
  // ================================================================

  create = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;
    const input = req.body as CreateMaterialInput;

    try {
      const material = await this.materiaisService.createMaterial(
        projectId,
        input
      );

      res.status(201).json({
        status: "success",
        message: "Material criado e vinculado aos cômodos com sucesso.",
        data: { material },
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

      // ── Cômodos inválidos / não pertencem ao projeto ──────────────
      if (error instanceof RoomNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
          errors: { comodos: error.missing },
        });
        return;
      }

      console.error("[MateriaisController.create] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };

  // ================================================================
  // PATCH /materials/:materialId
  // ================================================================

  update = async (req: Request, res: Response): Promise<void> => {
    const { materialId } = req.params;
    const input = req.body as UpdateMaterialInput;

    try {
      const result = await this.materiaisService.updateMaterial(
        materialId,
        input
      );

      res.status(200).json({
        status: "success",
        message: "Material atualizado com sucesso.",
        data: result,
      });
    } catch (error) {
      // ── Material não encontrado ───────────────────────────────────
      if (error instanceof MaterialNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Cômodos inválidos / não encontrados ───────────────────────
      if (error instanceof RoomNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
          errors: { comodos: error.missing },
        });
        return;
      }

      console.error("[MateriaisController.update] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };

  // ================================================================
  // GET /projects/:projectId/materials
  // ================================================================

  list = async (req: Request, res: Response): Promise<void> => {
    const { projectId } = req.params;
    // Filtros já validados e tipados pelo middleware validateListMateriais
    const filters = (req as RequestWithFilters).parsedFilters ?? {};

    try {
      const materiais = await this.materiaisService.listMaterials(
        projectId,
        filters
      );

      res.status(200).json({
        status: "success",
        message: "Materiais listados com sucesso.",
        data: { materiais },
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

      console.error("[MateriaisController.list] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro interno. Tente novamente mais tarde.",
      });
    }
  };
}
