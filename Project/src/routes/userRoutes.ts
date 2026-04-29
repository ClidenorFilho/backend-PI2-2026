// src/routes/userRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de usuário.
// Pipeline: POST /users → validateUserRegistration → controller.register
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
 *                 description: Mínimo 8 caracteres com maiúsculas, minúsculas e símmbolo (sem sequências como 123 ou abc)
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
 *             required:
 *               - name
 *               - cpf
 *               - email
 *               - password
 *               - confirmPassword
 *               - profile
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
import { validateUserRegistration } from "../middlewares/validateUserRegistration";

const router = Router();

// Composição manual de dependências (sem IoC container)
const userService = new UserService();
const userController = new UserController(userService);

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

export default router;
