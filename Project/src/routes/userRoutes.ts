// src/routes/userRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de usuário.
// Pipeline: POST /users → validateUserRegistration → controller.register
// ─────────────────────────────────────────────────────────────────

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
