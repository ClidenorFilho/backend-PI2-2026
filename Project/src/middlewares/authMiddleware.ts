// src/middlewares/authMiddleware.ts
// ─────────────────────────────────────────────────────────────────
// Middleware JWT para proteger rotas futuras.
// Extrai o token do header Authorization: Bearer <token>
// Verifica e decodifica o token, injetando os dados no req.user
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { ProfileType } from "@prisma/client";
import { AuthService } from "../services/AuthService";

// ── Extensão do tipo Request para injetar dados do token ─────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        profile: ProfileType;
      };
    }
  }
}

// ── Middleware ────────────────────────────────────────────────────

const authService = new AuthService();

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // 1. Verificar se o header existe
  if (!authHeader) {
    res.status(401).json({
      status: "error",
      message: "Token não fornecido. Use o header: Authorization: Bearer <token>",
    });
    return;
  }

  // 2. Extrair o token do formato "Bearer <token>"
  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      status: "error",
      message: "Formato de token inválido. Use: Bearer <token>",
    });
    return;
  }

  const token = parts[1];

  // 3. Verificar e decodificar o token
  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: error instanceof Error ? error.message : "Token inválido.",
    });
  }
}
