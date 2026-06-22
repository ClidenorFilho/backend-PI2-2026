// src/middlewares/checkProjectNotDelivered.ts
// ─────────────────────────────────────────────────────────────────
// Middleware de Trava de Projeto Entregue.
//
// Objetivo: Impedir que construtores editem dados físicos de uma
// obra após ela ter sido entregue ou desativada.
//
// Estratégia de extração do projectId (em ordem de prioridade):
//   1. req.params.projectId  (rotas: /projects/:projectId/...)
//   2. req.params.id         (rotas: /projects/:id/...)
//   3. req.body.idProjeto    (rotas com projectId no body)
//
// Resposta em caso de bloqueio: 403 Forbidden
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const BLOCKED_STATUSES = ["ENTREGUE", "DESATIVADO"] as const;

const BLOCKED_MESSAGE =
  "Operação negada: O projeto já foi entregue ao proprietário e não pode sofrer alterações.";

export async function checkProjectNotDelivered(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Extrair o projectId de onde ele estiver disponível
  const projectId: string | undefined =
    req.params.projectId ??
    req.params.id ??
    req.body?.idProjeto;

  // Se não houver ID, deixa passar (a rota seguinte tratará o 404)
  if (!projectId) {
    next();
    return;
  }

  try {
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto: projectId },
      select: { status: true },
    });

    // Projeto inexistente → deixa passar (a rota seguinte trata o 404)
    if (!projeto) {
      next();
      return;
    }

    // Projeto entregue ou desativado → bloqueia imediatamente
    if (BLOCKED_STATUSES.includes(projeto.status as typeof BLOCKED_STATUSES[number])) {
      res.status(403).json({
        status: "error",
        message: BLOCKED_MESSAGE,
      });
      return;
    }

    next();
  } catch (error) {
    console.error("[checkProjectNotDelivered] Erro ao consultar projeto:", error);
    res.status(500).json({
      status: "error",
      message: "Erro interno ao verificar o status do projeto.",
    });
  }
}
