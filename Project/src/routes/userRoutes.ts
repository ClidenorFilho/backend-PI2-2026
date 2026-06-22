// src/routes/userRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de usuário.
//
// Rotas públicas:
//   POST /users              → registro de novo usuário
//
// Rotas protegidas (Minha Conta — requerem authMiddleware):
//   GET  /users/me           → leitura do perfil
//   PATCH /users/me/profile  → edição de dados pessoais
//   PATCH /users/me/password → alteração de senha
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cadastra um novo usuário
 *     description: Registra um novo usuário (Construtor ou Proprietário) no sistema com validações rigorosas de senha e CPF
 *     tags:
 *       - Usuários
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - cpf
 *               - email
 *               - password
 *               - confirmPassword
 *               - profile
 *             properties:
 *               name:
 *                 type: string
 *                 example: João Silva
 *                 description: Nome completo com pelo menos 2 partes (nome e sobrenome), mínimo 2 letras cada
 *               cpf:
 *                 type: string
 *                 example: "111.444.777-35"
 *                 description: CPF válido com máscara (XXX.XXX.XXX-XX), será validado matematicamente
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@example.com
 *                 description: Email único no sistema
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SenhaF0rte@2024
 *                 description: Mínimo 8 caracteres com maiúsculas, minúsculas e símbolo (sem sequências como 123 ou abc)
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: SenhaF0rte@2024
 *                 description: Deve ser idêntica à password
 *               profile:
 *                 type: string
 *                 enum: [CONSTRUTOR, PROPRIETARIO]
 *                 example: CONSTRUTOR
 *                 description: Tipo de perfil do usuário
 *               crea:
 *                 type: string
 *                 example: "123456789"
 *                 description: Campo OBRIGATÓRIO apenas para perfil CONSTRUTOR (opcional para PROPRIETARIO)
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
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
 *                   example: Usuário registrado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     profile:
 *                       type: string
 *       400:
 *         description: Validação falhou (CPF inválido, senha fraca, email duplicado, etc)
 *       500:
 *         description: Erro ao registrar usuário
 */

import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { UserService } from "../services/UserService";
import { MinhaContaController } from "../controllers/MinhaContaController";
import { MinhaContaService } from "../services/MinhaContaService";
import { validateUserRegistration } from "../middlewares/validateUserRegistration";
import { validateUpdateProfile, validateChangePassword } from "../middlewares/validateMinhaConta";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Composição manual de dependências (sem IoC container)
const userService = new UserService();
const userController = new UserController(userService);

const minhaContaService = new MinhaContaService();
const minhaContaController = new MinhaContaController(minhaContaService);

// ═══════════════════════════════════════════════════════════════════
// ROTAS PÚBLICAS
// ═══════════════════════════════════════════════════════════════════

/**
 * @route  POST /users
 * @desc   Cadastra um novo usuário (Construtor ou Proprietário)
 * @access Public
 */
router.post(
  "/",
  validateUserRegistration,
  userController.register
);

// ═══════════════════════════════════════════════════════════════════
// ROTAS PROTEGIDAS — Módulo "Minha Conta"
// ═══════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Retorna o perfil do usuário autenticado
 *     description: Retorna os dados do usuário logado. O CPF é sempre mascarado no formato ***.XXX.XXX-** e o CREA só é retornado para perfil CONSTRUTOR.
 *     tags:
 *       - Minha Conta
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil carregado com sucesso
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nome:
 *                           type: string
 *                         email:
 *                           type: string
 *                         cpf:
 *                           type: string
 *                           example: "***.456.789-**"
 *                         profile:
 *                           type: string
 *                           enum: [CONSTRUTOR, PROPRIETARIO]
 *                         crea:
 *                           type: string
 *                           nullable: true
 *       401:
 *         description: Token não fornecido ou inválido
 *       404:
 *         description: Usuário não encontrado
 *
 * @route  GET /users/me
 * @desc   Retorna o perfil do usuário autenticado (CPF mascarado, CREA condicional)
 * @access Private
 */
router.get(
  "/me",
  authMiddleware,
  minhaContaController.getMe
);

/**
 * @swagger
 * /users/me/profile:
 *   patch:
 *     summary: Atualiza os dados pessoais do usuário
 *     description: Atualiza nome, e-mail e/ou CREA do usuário autenticado. Ao alterar o e-mail, verifica unicidade no banco. Retorna perfil atualizado com CPF mascarado.
 *     tags:
 *       - Minha Conta
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Carlos Almeida
 *                 description: Nome completo (nome + sobrenome)
 *               email:
 *                 type: string
 *                 format: email
 *                 example: carlos@email.com
 *                 description: Novo e-mail único no sistema
 *               crea:
 *                 type: string
 *                 example: CREA-SP 987654/D
 *                 description: Novo CREA (ignorado para perfil PROPRIETARIO)
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token não fornecido ou inválido
 *       404:
 *         description: Usuário não encontrado
 *       409:
 *         description: E-mail já está em uso por outro usuário
 *
 * @route  PATCH /users/me/profile
 * @desc   Atualiza nome, e-mail e/ou CREA do usuário autenticado
 * @access Private
 */
router.patch(
  "/me/profile",
  authMiddleware,
  validateUpdateProfile,
  minhaContaController.updateProfile
);

/**
 * @swagger
 * /users/me/password:
 *   patch:
 *     summary: Altera a senha do usuário
 *     description: Verifica a senha atual via bcrypt antes de salvar o hash da nova senha. A nova senha deve ter no mínimo 6 caracteres.
 *     tags:
 *       - Minha Conta
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senhaAtual
 *               - novaSenha
 *             properties:
 *               senhaAtual:
 *                 type: string
 *                 format: password
 *                 example: SenhaAntiga@123
 *               novaSenha:
 *                 type: string
 *                 format: password
 *                 example: NovaSenha@456
 *                 description: Mínimo 6 caracteres
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Senha atual incorreta ou dados inválidos
 *       401:
 *         description: Token não fornecido ou inválido
 *       404:
 *         description: Usuário não encontrado
 *
 * @route  PATCH /users/me/password
 * @desc   Altera senha após validar a senha atual com bcrypt
 * @access Private
 */
router.patch(
  "/me/password",
  authMiddleware,
  validateChangePassword,
  minhaContaController.changePassword
);

export default router;
