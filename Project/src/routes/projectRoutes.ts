// src/routes/projectRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de Projeto.
// Pipeline: POST /projects → authMiddleware → validateCreateProject → controller.create
// ─────────────────────────────────────────────────────────────────

import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { ProjectService } from "../services/ProjectService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateCreateProject } from "../middlewares/validateCreateProject";

const router = Router();

// Composição manual de dependências (sem IoC container)
const projectService = new ProjectService();
const projectController = new ProjectController(projectService);

/**
 * @route  POST /projects
 * @desc   Cria um novo Projeto para um Construtor logado
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Extrai o ID do usuário do token JWT
 * @middleware validateCreateProject - Valida o payload com Zod
 * @body   { nomeProjeto, rua, bairro, numero, tipoConstrucao, dataInicio, art?, descricao?, complemento?, dataConclusao? }
 * @return 201 { id: string, nomeProjeto: string, dataInicio: datetime }
 */
router.post(
  "/",
  authMiddleware,
  validateCreateProject,
  projectController.create
);

export default router;
