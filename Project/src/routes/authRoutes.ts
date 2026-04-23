// src/routes/authRoutes.ts
// ─────────────────────────────────────────────────────────────────
// Mapeamento das rotas de autenticação.
// Pipeline: POST /auth/login → validateLoginInput → controller.login
// ─────────────────────────────────────────────────────────────────

import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { AuthService } from "../services/AuthService";
import { validateLoginInput } from "../middlewares/validateLoginInput";

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

export default router;
