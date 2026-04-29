// src/routes/authRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de autenticação.
// Pipeline: POST /auth/login → validateLoginInput → controller.login
// ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     description: Autentica um usuário (Construtor ou Proprietário) e retorna um token JWT. Para CONSTRUTOR, CREA é obrigatório
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: construtor@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SenhaF0rte@2024
 *               profile:
 *                 type: string
 *                 enum: [CONSTRUTOR, PROPRIETARIO]
 *                 example: CONSTRUTOR
 *               crea:
 *                 type: string
 *                 example: "123456789"
 *                 description: OBRIGATÓRIO apenas se profile for CONSTRUTOR
 *             required:
 *               - email
 *               - password
 *               - profile
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
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
 *                   example: Login realizado com sucesso
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         profile:
 *                           type: string
 *       400:
 *         description: Credenciais inválidas ou erro de validação (ex. CREA faltando)
 *       500:
 *         description: Erro interno do servidor
 * 
 * /auth/forgot-password:
 *   post:
 *     summary: Solicita recuperação de senha
 *     description: Envia um email com link para recuperação de senha
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: construtor@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Email de recuperação enviado
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro ao enviar email
 * 
 * /auth/reset-password:
 *   post:
 *     summary: Reseta a senha do usuário
 *     description: Define nova senha utilizando token de recuperação enviado por email (token válido por 1 hora)
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 description: Token de recuperação recebido no email
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NovaSenha@2024
 *                 description: Nova senha (8+ chars, maiúsculas, minúsculas, símbolo)
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NovaSenha@2024
 *                 description: Confirmação da nova senha (deve ser idêntica)
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *       400:
 *         description: Token inválido/expirado ou dados de validação incorretos
 *       500:
 *         description: Erro ao alterar senha
 */

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { AuthService } from "../services/AuthService";
import { validateLoginInput } from "../middlewares/validateLoginInput";
import { validateForgotPasswordInput } from "../middlewares/validateForgotPasswordInput";
import { validateResetPasswordInput } from "../middlewares/validateResetPasswordInput";

const router = Router();

// Composição manual de dependências (sem IoC container)
const authService = new AuthService();
const authController = new AuthController(authService);

/**
 * @route  POST /auth/login
 * @desc   Realiza login do usuário (Construtor ou Proprietário)
 * @access Public
 * @body   { email: string, password: string, profile: "CONSTRUTOR" | "PROPRIETARIO" }
 * @return { token: string, user: { id, name, email, profile } }
 */
router.post(
  "/login",
  validateLoginInput,
  authController.login
);

router.post(
  "/forgot-password",
  validateForgotPasswordInput,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validateResetPasswordInput,
  authController.resetPassword
);

export default router;
