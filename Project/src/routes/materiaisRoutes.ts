// src/routes/materiaisRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Roteamento do módulo "Gestão de Materiais".
//
// Exporta DOIS routers independentes para facilitar a montagem
// em app.ts sem conflitos de prefixo:
//
//   projectMaterialRouter  — montado em app.use("/projects", projectRoutes)
//                            ou diretamente em app.use("/projects/:projectId/materials")
//                            ┌─────────────────────────────────────────────────────┐
//                            │ POST /projects/:projectId/materials → create         │
//                            │ GET  /projects/:projectId/materials → list           │
//                            └─────────────────────────────────────────────────────┘
//
//   materialRouter          — montado em app.use("/materials")
//                            ┌─────────────────────────────────────────────────────┐
//                            │ PATCH /materials/:materialId → update                │
//                            └─────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────

import { Router } from "express";
import { MateriaisService } from "../services/MateriaisService";
import { MateriaisController } from "../controllers/MateriaisController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import {
  validateCreateMaterial,
  validateUpdateMaterial,
  validateListMateriais,
} from "../middlewares/validateMateriais";

// ── Composição de dependências (sem IoC container) ────────────────

const materiaisService = new MateriaisService();
const materiaisController = new MateriaisController(materiaisService);

// ══════════════════════════════════════════════════════════════════
// Router A — Rotas aninhadas em /projects/:projectId/materials
// mergeParams: true permite acessar req.params.projectId
// ══════════════════════════════════════════════════════════════════

export const projectMaterialRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /projects/{projectId}/materials:
 *   post:
 *     summary: Cria um novo material e vincula cômodos
 *     description: >
 *       Cria o Material e, em uma única transação atômica, cria os registros
 *       na tabela pivot ComodoMaterial para cada cômodo informado.
 *       Requer perfil CONSTRUTOR.
 *     tags:
 *       - Materiais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto ao qual o material será vinculado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nomeMaterial
 *               - area
 *               - comodos
 *             properties:
 *               nomeMaterial:
 *                 type: string
 *                 example: Porcelanato Marmorizado 60x60
 *               area:
 *                 type: string
 *                 enum: [REVESTIMENTOS, PINTURAS, LOUCAS_E_METAIS, LUMINARIAS]
 *                 example: REVESTIMENTOS
 *               referencia:
 *                 type: string
 *                 example: REF-001
 *               lote:
 *                 type: string
 *                 example: LOT-2024-A
 *               marca:
 *                 type: string
 *                 example: Portobello
 *               tamanho:
 *                 type: string
 *                 example: 60x60cm
 *               tipoMaterial:
 *                 type: string
 *                 example: Porcelanato
 *               cor:
 *                 type: string
 *                 example: Marfim
 *               descricaoMaterial:
 *                 type: string
 *                 example: Porcelanato retificado com acabamento polido
 *               comodos:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - idComodo
 *                     - idAndar
 *                   properties:
 *                     idComodo:
 *                       type: integer
 *                       example: 1
 *                     idAndar:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       201:
 *         description: Material criado e vinculado com sucesso
 *       400:
 *         description: Dados inválidos (campo obrigatório ausente ou comodos vazio)
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso negado — perfil não autorizado
 *       404:
 *         description: Projeto ou cômodo não encontrado
 *       500:
 *         description: Erro interno ao criar o material
 *
 * @route  POST /projects/:projectId/materials
 * @desc   Cria Material + vínculos ComodoMaterial em transação
 * @access Private (CONSTRUTOR)
 */
projectMaterialRouter.post(
  "/",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateCreateMaterial,
  materiaisController.create
);

/**
 * @swagger
 * /projects/{projectId}/materials:
 *   get:
 *     summary: Lista materiais do projeto com cômodos agregados
 *     description: >
 *       Retorna todos os materiais associados ao projeto, consolidados com
 *       um array de cômodos onde cada material está alocado.
 *       Suporta filtro por área do material e por cômodo específico.
 *     tags:
 *       - Materiais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto
 *       - name: area
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [REVESTIMENTOS, PINTURAS, LOUCAS_E_METAIS, LUMINARIAS]
 *         description: Filtrar materiais por área
 *       - name: comodoId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtrar materiais presentes em um cômodo específico (id numérico)
 *     responses:
 *       200:
 *         description: Materiais listados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     materiais:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           idMaterial:
 *                             type: string
 *                             format: uuid
 *                           nomeMaterial:
 *                             type: string
 *                           area:
 *                             type: string
 *                             enum: [REVESTIMENTOS, PINTURAS, LOUCAS_E_METAIS, LUMINARIAS]
 *                           comodos:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 idComodo:
 *                                   type: integer
 *                                 idAndar:
 *                                   type: integer
 *                                 nomeComodo:
 *                                   type: string
 *                                 nomeAndar:
 *                                   type: string
 *       400:
 *         description: Parâmetros de query inválidos
 *       401:
 *         description: Token ausente ou inválido
 *       404:
 *         description: Projeto não encontrado
 *       500:
 *         description: Erro interno ao listar materiais
 *
 * @route  GET /projects/:projectId/materials
 * @desc   Lista materiais do projeto com cômodos agregados e filtros opcionais
 * @access Private
 */
projectMaterialRouter.get(
  "/",
  authMiddleware,
  validateListMateriais,
  materiaisController.list
);

// ══════════════════════════════════════════════════════════════════
// Router B — Rotas standalone em /materials/:materialId
// ══════════════════════════════════════════════════════════════════

export const materialRouter = Router();

/**
 * @swagger
 * /materials/{materialId}:
 *   patch:
 *     summary: Atualiza um material existente
 *     description: >
 *       Atualiza os dados base do Material. Se o array `comodos` for enviado,
 *       os vínculos ComodoMaterial existentes são completamente substituídos
 *       em uma transação atômica (delete-all → createMany).
 *       Cada item de comodo deve incluir `idProjeto`.
 *     tags:
 *       - Materiais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: materialId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do material a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeMaterial:
 *                 type: string
 *                 example: Tinta Branco Neve Fosco
 *               area:
 *                 type: string
 *                 enum: [REVESTIMENTOS, PINTURAS, LOUCAS_E_METAIS, LUMINARIAS]
 *               referencia:
 *                 type: string
 *               lote:
 *                 type: string
 *               marca:
 *                 type: string
 *               tamanho:
 *                 type: string
 *               tipoMaterial:
 *                 type: string
 *               cor:
 *                 type: string
 *               descricaoMaterial:
 *                 type: string
 *               comodos:
 *                 type: array
 *                 description: Se enviado, substitui completamente os vínculos atuais
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - idComodo
 *                     - idAndar
 *                     - idProjeto
 *                   properties:
 *                     idComodo:
 *                       type: integer
 *                       example: 2
 *                     idAndar:
 *                       type: integer
 *                       example: 1
 *                     idProjeto:
 *                       type: string
 *                       format: uuid
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Material atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     idMaterial:
 *                       type: string
 *                       format: uuid
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dados inválidos ou nenhum campo enviado
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Acesso negado — perfil não autorizado
 *       404:
 *         description: Material ou cômodo não encontrado
 *       500:
 *         description: Erro interno ao atualizar o material
 *
 * @route  PATCH /materials/:materialId
 * @desc   Atualiza campos do Material e opcionalmente reescreve os vínculos ComodoMaterial
 * @access Private (CONSTRUTOR)
 */
materialRouter.patch(
  "/:materialId",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateUpdateMaterial,
  materiaisController.update
);
