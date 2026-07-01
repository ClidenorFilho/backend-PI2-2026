// src/routes/projectRoutes.ts
// ---------------------------------
// Mapeamento das rotas de Projeto com documentação Swagger/OpenAPI 3.0
// ---------------------------------

import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { ProjectService } from "../services/ProjectService";
import { EntregaController } from "../controllers/EntregaController";
import { EntregaService } from "../services/EntregaService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { requireRole } from "../middlewares/roleMiddleware";
import { validateCreateProject } from "../middlewares/validateCreateProject";
import { validateEmployee } from "../middlewares/validateEmployee";
import { validateUpdateEmployee } from "../middlewares/validateUpdateEmployee";
import { validateUpdateProject } from "../middlewares/validateUpdateProject";
import { validateCreateRoom } from "../middlewares/validateCreateRoom";
import { validateCreateAlteration } from "../middlewares/validateCreateAlteration";
import { validateEntrega } from "../middlewares/validateEntrega";
import upload, { uploadAlteration } from "../config/multer";

const router = Router();

// Composição manual de dependências (sem IoC container)
const projectService = new ProjectService();
const projectController = new ProjectController(projectService);

const entregaService = new EntregaService();
const entregaController = new EntregaController(entregaService);

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

// ==================== PUT /projects/:id ====================
/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Atualiza um projeto existente
 *     description: Atualiza as informações cadastrais de um projeto existente. Campos no body são opcionais, apenas os fornecidos serão atualizados.
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
 *         description: UUID do projeto a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descricao:
 *                 type: string
 *               rua:
 *                 type: string
 *               bairro:
 *                 type: string
 *               numero:
 *                 type: string
 *               complemento:
 *                 type: string
 *               dataEntrega:
 *                 type: string
 *                 format: date
 *             description: Campos opcionais para atualização do projeto
 *     responses:
 *       200:
 *         description: Projeto atualizado com sucesso
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
 *                   example: Projeto atualizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Erro de validação
 *       404:
 *         description: Projeto não encontrado
 */
router.put(
  "/:id",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateUpdateProject,
  projectController.updateProject
);

// ==================== GET /projects/:id/rooms ====================
/**
 * @swagger
 * /projects/{id}/rooms:
 *   get:
 *     summary: Lista andares e cômodos do projeto
 *     description: Retorna uma lista leve de andares com seus respectivos cômodos para uso em selects e dropdowns do Front-end
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
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Andares e cômodos listados com sucesso
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
 *                   example: Andares e cômodos do projeto carregados com sucesso
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nome:
 *                         type: string
 *                       comodos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             nome:
 *                               type: string
 *       401:
 *         description: Usuário não autenticado ou token inválido
 *       404:
 *         description: Projeto não encontrado ou usuário sem permissão de acesso
 *       500:
 *         description: Erro interno ao buscar andares e cômodos
 */
router.get(
  "/:id/rooms",
  authMiddleware,
  projectController.getRooms
);

// ==================== GET /projects/:id/alterations ====================
/**
 * @swagger
 * /projects/{id}/alterations:
 *   get:
 *     summary: Lista as alterações de um cômodo específico do projeto
 *     description: >
 *       Retorna todas as alterações registradas para um cômodo dentro de um
 *       projeto, ordenadas por data crescente. Acessível pelo Construtor (dono
 *       do projeto) e pelo Proprietário (vinculado ao projeto após entrega).
 *     tags:
 *       - Alterações
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
 *       - name: idComodo
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID inteiro do cômodo cujas alterações serão listadas
 *     responses:
 *       200:
 *         description: Alterações listadas com sucesso
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
 *                   example: Alterações do cômodo listadas com sucesso.
 *                 data:
 *                   type: object
 *                   properties:
 *                     alteracoes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           idAlteracao:
 *                             type: string
 *                             format: uuid
 *                           nomeAlteracao:
 *                             type: string
 *                           descricaoAlteracao:
 *                             type: string
 *                           area:
 *                             type: string
 *                             enum: [ARQUITETONICA, ESTRUTURAL, HIDROSSANITARIA, ELETRICA]
 *                           dataAlteracao:
 *                             type: string
 *                             format: date-time
 *                           idComodo:
 *                             type: integer
 *                           idAndar:
 *                             type: integer
 *                           fotos:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 idFoto:
 *                                   type: string
 *                                   format: uuid
 *                                 urlDaFoto:
 *                                   type: string
 *                           funcionarios:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 funcionario:
 *                                   type: object
 *                                   properties:
 *                                     idFunc:
 *                                       type: string
 *                                       format: uuid
 *                                     nomeFunc:
 *                                       type: string
 *                                     cargo:
 *                                       type: string
 *       400:
 *         description: Parâmetro idComodo ausente ou inválido
 *       401:
 *         description: Usuário não autenticado
 *       404:
 *         description: Projeto ou cômodo não encontrado
 *       500:
 *         description: Erro interno ao listar alterações
 */
router.get(
  "/:id/alterations",
  authMiddleware,
  projectController.listAlterationsByRoom
);

// ==================== POST /projects/:id/rooms ====================
/**
 * @swagger
 * /projects/{id}/rooms:
 *   post:
 *     summary: Adiciona um andar e um cômodo ao projeto
 *     description: Cria o andar caso ele ainda não exista no projeto e adiciona um novo cômodo com ID sequencial no andar correspondente
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
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nomeAndar:
 *                 type: string
 *                 example: Térreo
 *                 description: Nome do andar a ser criado ou reutilizado
 *               nomeComodo:
 *                 type: string
 *                 example: Sala de Estar
 *                 description: Nome do cômodo a ser criado no andar
 *             required:
 *               - nomeAndar
 *               - nomeComodo
 *     responses:
 *       201:
 *         description: Andar e cômodo criados com sucesso
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
 *                   example: Cômodo adicionado ao projeto com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     idComodo:
 *                       type: integer
 *                     idAndar:
 *                       type: integer
 *                     idProjeto:
 *                       type: string
 *                       format: uuid
 *                     nomeAndar:
 *                       type: string
 *                     nomeComodo:
 *                       type: string
 *       400:
 *         description: Erro na validação dos dados ou ao criar o cômodo
 *       404:
 *         description: Projeto não encontrado ou usuário sem permissão de acesso
 *       401:
 *         description: Usuário não autenticado ou token inválido
 */
router.post(
  "/:id/rooms",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateCreateRoom,
  projectController.addRoom
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

// ==================== POST /projects/:id/alterations ====================
/**
 * @swagger
 * /projects/{id}/alterations:
 *   post:
 *     summary: Registra uma alteração no projeto
 *     description: Cria uma alteração vinculada ao projeto, ao andar e ao cômodo informados, com fotos opcionais e planta opcional armazenadas localmente em uploads/
 *     tags:
 *       - Alterações
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
 *               fotos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Até 5 imagens da alteração
 *               planta:
 *                 type: string
 *                 format: binary
 *                 description: Planta técnica opcional em PDF ou imagem
 *               areaAlteracao:
 *                 type: string
 *                 enum: [ARQUITETONICA, ESTRUTURAL, HIDROSSANITARIA, ELETRICA]
 *                 example: ARQUITETONICA
 *               idAndar:
 *                 type: integer
 *                 example: 1
 *               idComodo:
 *                 type: integer
 *                 example: 2
 *               nomeAlteracao:
 *                 type: string
 *                 example: Ajuste de layout da sala
 *               descricao:
 *                 type: string
 *                 example: Remoção parcial de parede para ampliar o ambiente
 *               dataAlteracao:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-04T14:00:00.000Z"
 *               funcionariosIds:
 *                 type: string
 *                 example: "[\"uuid-1\",\"uuid-2\"]"
 *                 description: JSON em string com os IDs dos funcionários
 *             required:
 *               - areaAlteracao
 *               - idAndar
 *               - idComodo
 *               - nomeAlteracao
 *               - descricao
 *               - dataAlteracao
 *               - funcionariosIds
 *     responses:
 *       201:
 *         description: Alteração registrada com sucesso
 *       400:
 *         description: Erro na validação ou regra de negócio
 *       404:
 *         description: Projeto, andar, cômodo ou funcionários não encontrados
 *       500:
 *         description: Erro interno ao registrar alteração
 */
router.post(
  "/:id/alterations",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  uploadAlteration.fields([
    { name: "fotos", maxCount: 5 },
    { name: "planta", maxCount: 1 },
  ]),
  validateCreateAlteration,
  projectController.createAlteration
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

// ==================== POST /projects/:projectId/deliver ====================
/**
 * @swagger
 * /projects/{projectId}/deliver:
 *   post:
 *     summary: Entrega o projeto a um Proprietário
 *     description: >
 *       Marca o projeto como ENTREGUE e vincula um Proprietário.
 *       Se o CPF/e-mail informado não possuir conta, uma é criada automaticamente
 *       com senha padrão (hash do CPF). Se já existir conta, valida que o perfil
 *       é PROPRIETARIO — caso seja CONSTRUTOR, retorna 409.
 *       Requer perfil CONSTRUTOR e projeto com status EM_CONSTRUCAO.
 *     tags:
 *       - Projetos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do projeto a ser entregue
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cpf
 *               - email
 *             properties:
 *               cpf:
 *                 type: string
 *                 example: "111.444.777-35"
 *                 description: CPF do Proprietário destinatário (com ou sem máscara)
 *               email:
 *                 type: string
 *                 format: email
 *                 example: proprietario@email.com
 *                 description: E-mail do Proprietário destinatário
 *     responses:
 *       200:
 *         description: Projeto entregue com sucesso
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
 *                   example: Projeto entregue com sucesso. Uma conta de Proprietário foi criada automaticamente.
 *                 data:
 *                   type: object
 *                   properties:
 *                     idProjeto:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: ENTREGUE
 *                     proprietario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nome:
 *                           type: string
 *                         email:
 *                           type: string
 *                         criado:
 *                           type: boolean
 *                           description: true se a conta foi criada agora, false se já existia
 *       400:
 *         description: Dados inválidos (e-mail mal formado ou CPF ausente)
 *       401:
 *         description: Token ausente ou inválido
 *       403:
 *         description: Perfil não autorizado
 *       404:
 *         description: Projeto não encontrado
 *       409:
 *         description: Projeto já entregue ou CPF/e-mail pertence a um Construtor
 *       500:
 *         description: Erro interno ao realizar entrega
 */
router.post(
  "/:projectId/deliver",
  authMiddleware,
  requireRole("CONSTRUTOR"),
  validateEntrega,
  entregaController.deliver
);

export default router;