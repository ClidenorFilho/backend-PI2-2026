// src/routes/projectRoutes.ts
// ---------------------------------
// Mapeamento das rotas de Projeto com documentação Swagger/OpenAPI 3.0
// ---------------------------------

import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { ProjectService } from "../services/ProjectService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { validateCreateProject } from "../middlewares/validateCreateProject";
import { validateEmployee } from "../middlewares/validateEmployee";
import { validateUpdateEmployee } from "../middlewares/validateUpdateEmployee";
import upload from "../config/multer";

const router = Router();

// Composição manual de dependências (sem IoC container)
const projectService = new ProjectService();
const projectController = new ProjectController(projectService);

// ==================== GET /projects ====================
/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Lista todos os projetos do construtor logado
 *     description: Retorna lista de projetos associados ao usuário autenticado com filtros opcionais de status, ordenação, limite e busca por nome
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [EM_CONSTRUCAO, ENTREGUE, DESATIVADO]
 *         description: Filtrar projetos por status
 *       - name: order
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Ordenar projetos por data de última atualização (asc ascendente, desc descendente)
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Quantidade máxima de registros a retornar
 *       - name: search
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Busca parcial pelo nome do projeto (case-insensitive)
 *     responses:
 *       200:
 *         description: Projetos listados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Projetos listados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       nomeProjeto:
 *                         type: string
 *                       responsavel:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [EM_CONSTRUCAO, ENTREGUE, DESATIVADO]
 *                       ultimaAtualizacao:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       500:
 *         description: Erro interno ao listar projetos
 */
router.get(
  "/",
  authMiddleware,
  projectController.list
);

// ==================== POST /projects ====================
/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Cria um novo projeto
 *     description: Registra um novo projeto vinculado ao construtor autenticado com validação de campos obrigatórios
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeProjeto:
 *                 type: string
 *                 example: Condomínio Centro
 *                 description: Nome do projeto
 *               descricao:
 *                 type: string
 *                 example: Condomínio residencial de 12 andares com garagem
 *                 description: Descrição detalhada do projeto
 *               rua:
 *                 type: string
 *                 example: Av. Paulista
 *                 description: Rua ou avenida do endereço
 *               bairro:
 *                 type: string
 *                 example: Bela Vista
 *                 description: Bairro da obra
 *               numero:
 *                 type: string
 *                 example: "1000"
 *                 description: Número do imóvel
 *               complemento:
 *                 type: string
 *                 example: Complemento do endereço (opcional)
 *                 description: Informações adicionais do endereço
 *               tipoConstrucao:
 *                 type: string
 *                 example: Residencial
 *                 description: Tipo de construção (Residencial, Comercial, etc.)
 *               dataInicio:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-01-15T10:30:00Z"
 *                 description: Data e hora de início da obra (ISO 8601 format)
 *               dataConclusao:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-12-31T18:00:00Z"
 *                 description: Data prevista de conclusão (opcional)
 *               art:
 *                 type: string
 *                 example: "ART-2025-001"
 *                 description: Número da Anotação de Responsabilidade Técnica (opcional)
 *             required:
 *               - nomeProjeto
 *               - rua
 *               - bairro
 *               - numero
 *               - tipoConstrucao
 *               - dataInicio
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Projeto criado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nomeProjeto:
 *                       type: string
 *       400:
 *         description: Erro na validação dos dados obrigatórios
 *       403:
 *         description: Construtor não encontrado ou sem permissão
 *       500:
 *         description: Erro interno ao criar projeto
 */
router.post(
  "/",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateCreateProject,
  projectController.create
);

// ==================== GET /projects/:id ====================
/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Busca detalhes completos de um projeto específico
 *     description: Retorna informações detalhadas de um projeto incluindo endereço, datas, plantas e funcionários vinculados
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do projeto
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Projeto encontrado e retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Projeto localizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nomeProjeto:
 *                       type: string
 *                     descricao:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [EM_CONSTRUCAO, ENTREGUE, DESATIVADO]
 *                     tipoConstrucao:
 *                       type: string
 *                     art:
 *                       type: string
 *                     endereco:
 *                       type: object
 *                       properties:
 *                         rua:
 *                           type: string
 *                         bairro:
 *                           type: string
 *                         numero:
 *                           type: string
 *                         complemento:
 *                           type: string
 *                     datas:
 *                       type: object
 *                       properties:
 *                         dataInicio:
 *                           type: string
 *                           format: date-time
 *                         dataConclusao:
 *                           type: string
 *                           format: date-time
 *                         criadoEm:
 *                           type: string
 *                           format: date-time
 *                         ultimaAtualizacao:
 *                           type: string
 *                           format: date-time
 *                     plantas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           tipo:
 *                             type: string
 *                           arquivo:
 *                             type: string
 *                           dataCriacao:
 *                             type: string
 *                             format: date-time
 *                     funcionarios:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nome:
 *                             type: string
 *                           cargo:
 *                             type: string
 *                           dataAlocacao:
 *                             type: string
 *                             format: date-time
 *       404:
 *         description: Projeto não encontrado ou usuário não tem permissão de acesso
 *       401:
 *         description: Usuário não autenticado
 *       500:
 *         description: Erro interno ao buscar projeto
 */
router.get(
  "/:id",
  authMiddleware,
  projectController.getById
);

// ==================== POST /projects/:id/employees ====================
/**
 * @swagger
 * /projects/{id}/employees:
 *   post:
 *     summary: Adiciona funcionário ao projeto
 *     description: Vincula um funcionário da construtora a um projeto específico
 *     tags:
 *       - Funcionários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeFunc:
 *                 type: string
 *                 example: João Silva
 *                 description: Nome completo do funcionário
 *               cargo:
 *                 type: string
 *                 example: Engenheiro Responsável
 *                 description: Cargo ou função do funcionário no projeto
 *             required:
 *               - nomeFunc
 *               - cargo
 *     responses:
 *       201:
 *         description: Funcionário adicionado ao projeto com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Funcionário adicionado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     idFunc:
 *                       type: string
 *                       format: uuid
 *                     nomeFunc:
 *                       type: string
 *                     cargo:
 *                       type: string
 *                     dataAlocacao:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Erro na validação dos dados (nomeFunc ou cargo inválido)
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro interno ao adicionar funcionário
 */
router.post(
  "/:id/employees",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateEmployee,
  projectController.addEmployee
);

// ==================== POST /projects/:id/documents ====================
/**
 * @swagger
 * /projects/{id}/documents:
 *   post:
 *     summary: Adiciona planta (documento) ao projeto
 *     description: Faz upload de arquivo PDF (planta/documento) para o projeto com validação de tipo e tamanho
 *     tags:
 *       - Documentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo PDF da planta (máximo 5MB)
 *               tipoPlanta:
 *                 type: string
 *                 example: Arquitetônica
 *                 description: Tipo ou descrição da planta (ex. Arquitetônica, Estrutural, Elétrica, etc.)
 *             required:
 *               - file
 *               - tipoPlanta
 *     responses:
 *       201:
 *         description: Documento anexado ao projeto com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Documento anexado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     idPlanta:
 *                       type: string
 *                       format: uuid
 *                     tipoPlanta:
 *                       type: string
 *                     arquivoPlanta:
 *                       type: string
 *                     tamanhoArquivo:
 *                       type: number
 *                     dataCriacao:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Arquivo não enviado, tipoPlanta não fornecido, ou arquivo inválido
 *       404:
 *         description: Projeto não encontrado
 *       413:
 *         description: Arquivo excede o tamanho máximo permitido (5MB)
 *       500:
 *         description: Erro interno ao anexar documento
 */
router.post(
  "/:id/documents",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  upload.single("file"),
  projectController.addDocument
);

// ==================== PUT /projects/:id/employees/:idFunc ====================
/**
 * @swagger
 * /projects/{id}/employees/{idFunc}:
 *   put:
 *     summary: Atualiza funcionário do projeto
 *     description: Edita nome e/ou cargo de um funcionário vinculado ao projeto (pelo menos um campo deve ser atualizado)
 *     tags:
 *       - Funcionários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto
 *       - name: idFunc
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do funcionário a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeFunc:
 *                 type: string
 *                 example: João Silva Atualizado
 *                 description: Novo nome do funcionário (opcional)
 *               cargo:
 *                 type: string
 *                 example: Engenheiro Sênior
 *                 description: Novo cargo do funcionário (opcional)
 *             description: Pelo menos um campo deve ser fornecido para atualização
 *     responses:
 *       200:
 *         description: Funcionário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Funcionário atualizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     idFunc:
 *                       type: string
 *                       format: uuid
 *                     nomeFunc:
 *                       type: string
 *                     cargo:
 *                       type: string
 *                     dataAtualizacao:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Nenhum campo foi fornecido para atualização ou dados inválidos
 *       404:
 *         description: Projeto ou funcionário não encontrado
 *       500:
 *         description: Erro interno ao atualizar funcionário
 */
router.put(
  "/:id/employees/:idFunc",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateUpdateEmployee,
  projectController.updateEmployee
);

// ==================== DELETE /projects/:id/employees/:idFunc ====================
/**
 * @swagger
 * /projects/{id}/employees/{idFunc}:
 *   delete:
 *     summary: Remove funcionário do projeto
 *     description: Desvincula funcionário do projeto. Se o funcionário não estiver alocado a nenhum outro projeto, ele é deletado da base de dados
 *     tags:
 *       - Funcionários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto
 *       - name: idFunc
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do funcionário a ser removido
 *     responses:
 *       200:
 *         description: Funcionário removido do projeto com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Funcionário removido com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     idFunc:
 *                       type: string
 *                       format: uuid
 *                     mensagem:
 *                       type: string
 *                       example: Funcionário desvinculado do projeto
 *       404:
 *         description: Projeto ou funcionário não encontrado
 *       401:
 *         description: Usuário não autenticado
 *       500:
 *         description: Erro interno ao remover funcionário
 */
router.delete(
  "/:id/employees/:idFunc",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  projectController.removeEmployee
);

export default router;
