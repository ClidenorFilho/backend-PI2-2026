// src/routes/projectRoutes.ts
// ---------------------------------
// Mapeamento das rotas de Projeto.
// Pipeline: GET /projects -> authMiddleware -> controller.list
// Pipeline: POST /projects -> authMiddleware -> validateCreateProject -> controller.create
// Pipeline: GET /projects/:id -> authMiddleware -> controller.getById
// Pipeline: POST /projects/:id/employees -> authMiddleware -> validateEmployee -> controller.addEmployee
// Pipeline: PUT /projects/:id/employees/:idFunc -> authMiddleware -> validateUpdateEmployee -> controller.updateEmployee
// Pipeline: DELETE /projects/:id/employees/:idFunc -> authMiddleware -> controller.removeEmployee
// Pipeline: POST /projects/:id/documents -> authMiddleware -> multer -> controller.addDocument
// ---------------------------------

import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { ProjectService } from "../services/ProjectService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateCreateProject } from "../middlewares/validateCreateProject";
import { validateEmployee } from "../middlewares/validateEmployee";
import { validateUpdateEmployee } from "../middlewares/validateUpdateEmployee";
import upload from "../config/multer";

const router = Router();

// Composição manual de dependências (sem IoC container)
const projectService = new ProjectService();
const projectController = new ProjectController(projectService);

/**
 * @route  GET /projects
 * @desc   Lista todos os Projetos do Construtor logado
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Extrai o ID do usuário do token JWT
 * @return 200 { nomeProjeto: string, responsavel: string, status: string, ultimaAtualizacao: datetime }
 */
router.get(
  "/",
  authMiddleware,
  projectController.list
);

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

/**
 * @route  GET /projects/:id
 * @desc   Busca os detalhes completos de um Projeto específico
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Protege a rota
 * @param  id - ID do Projeto (path parameter)
 * @return 200 { id, nomeProjeto, descricao, status, datas, endereco, plantas[], funcionarios[] }
 */
router.get(
  "/:id",
  authMiddleware,
  projectController.getById
);

/**
 * @route  POST /projects/:id/employees
 * @desc   Adiciona um Funcionário a um Projeto existente
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Protege a rota
 * @middleware validateEmployee - Valida nomeFunc e cargo
 * @param  id - ID do Projeto (path parameter)
 * @body   { nomeFunc: string, cargo: string }
 * @return 201 { idFunc: string, nomeFunc: string, cargo: string, idProjeto: string }
 */
router.post(
  "/:id/employees",
  authMiddleware,
  validateEmployee,
  projectController.addEmployee
);

/**
 * @route  POST /projects/:id/documents
 * @desc   Adiciona um Documento (Planta em PDF) a um Projeto existente
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Protege a rota
 * @middleware upload.single('file') - Processa upload de um único arquivo PDF (max 5MB)
 * @param  id - ID do Projeto (path parameter)
 * @body   multipart/form-data com 'file' (PDF) e 'tipoPlanta' (string)
 * @return 201 { idPlanta: string, tipoPlanta: string, arquivoPlanta: string, idProjeto: string }
 */
router.post(
  "/:id/documents",
  authMiddleware,
  upload.single("file"),
  projectController.addDocument
);

/**
 * @route  PUT /projects/:id/employees/:idFunc
 * @desc   Atualiza o nome e/ou cargo de um Funcionário em um Projeto
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Protege a rota
 * @middleware validateUpdateEmployee - Valida nomeFunc e cargo (ambos opcionais, pelo menos um obrigatório)
 * @param  id - ID do Projeto (path parameter)
 * @param  idFunc - ID do Funcionário (path parameter)
 * @body   { nomeFunc?: string, cargo?: string }
 * @return 200 { idFunc: string, nomeFunc: string, cargo: string }
 */
router.put(
  "/:id/employees/:idFunc",
  authMiddleware,
  validateUpdateEmployee,
  projectController.updateEmployee
);

/**
 * @route  DELETE /projects/:id/employees/:idFunc
 * @desc   Remove um Funcionário de um Projeto (deleta-o se não estiver vinculado a outros projetos)
 * @access Private (requer autenticação)
 * @middleware authMiddleware - Protege a rota
 * @param  id - ID do Projeto (path parameter)
 * @param  idFunc - ID do Funcionário (path parameter)
 * @return 200 { message: string }
 */
router.delete(
  "/:id/employees/:idFunc",
  authMiddleware,
  projectController.removeEmployee
);

export default router;
