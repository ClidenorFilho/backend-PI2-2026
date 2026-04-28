// src/controllers/ProjectController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair id do usuário logado (req.user via middleware auth)
//   2. Extrair dados já validados do req.body
//   3. Invocar o ProjectService
//   4. Mapear erros de negócio → respostas HTTP semânticas
//   5. Retornar 201 Created com o ID do projeto
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  ProjectService,
  ProjectCreationError,
  ConstruktorNotFoundError,
} from "../services/ProjectService";
import { CreateProjectInput } from "../middlewares/validateCreateProject";

export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * POST /projects
   * Cria um novo Projeto vinculado ao Construtor logado.
   */
  create = async (req: Request, res: Response): Promise<void> => {
    // 1. Extrair o ID do Construtor (usuario logado)
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Usuário não autenticado. Realize o login primeiro.",
      });
      return;
    }

    const idConstrutor = req.user.id;

    // 2. Extrair dados validados do body
    const data = req.body as CreateProjectInput;

    try {
      // 3. Chamar o service
      const projeto = await this.projectService.createProject(
        data,
        idConstrutor
      );

      // 4. Retornar 201 Created com dados mínimos
      res.status(201).json({
        status: "success",
        message: "Projeto criado com sucesso.",
        data: {
          id: projeto.idProjeto,
          nomeProjeto: projeto.nomeProjeto,
          dataInicio: projeto.dataInicio,
        },
      });
    } catch (error) {
      // ── Construtor não encontrado ────────────────────────────────
      if (error instanceof ConstruktorNotFoundError) {
        res.status(403).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao criar projeto (validação de negócio, etc) ────────
      if (error instanceof ProjectCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 sem vazar detalhes internos ──────
      console.error("[ProjectController] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao criar o projeto. Tente novamente mais tarde.",
      });
    }
  };
}
