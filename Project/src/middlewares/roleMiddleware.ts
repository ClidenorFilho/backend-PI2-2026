// src/middlewares/roleMiddleware.ts
// ─────────────────────────────────────────────────────────────────
// Middleware de autorização por perfil.
// Exige que req.user.profile corresponda ao perfil informado.
// ─────────────────────────────────────────────────────────────────

import { NextFunction, Request, Response } from "express";
import { ProfileType } from "@prisma/client";

export function requireRole(role: ProfileType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: "error",
        message: "Usuário não autenticado. Realize o login primeiro.",
      });
      return;
    }

    if (req.user.profile !== role) {
      res.status(403).json({
        status: "error",
        message: "Acesso negado. Perfil não autorizado para esta ação.",
      });
      return;
    }

    next();
  };
}