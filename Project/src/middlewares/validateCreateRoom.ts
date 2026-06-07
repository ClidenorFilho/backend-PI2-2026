// src/middlewares/validateCreateRoom.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de criação de andar e cômodo em um projeto.
// Campos obrigatórios: nomeAndar, nomeComodo
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const createRoomSchema = z.object({
  nomeAndar: z
    .string({ required_error: "O campo 'nomeAndar' é obrigatório." })
    .min(1, { message: "O campo 'nomeAndar' não pode estar vazio." })
    .trim(),

  nomeComodo: z
    .string({ required_error: "O campo 'nomeComodo' é obrigatório." })
    .min(1, { message: "O campo 'nomeComodo' não pode estar vazio." })
    .trim(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export function validateCreateRoom(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = createRoomSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    res.status(400).json({
      status: "error",
      message: "Erro na validação dos dados.",
      errors,
    });
    return;
  }

  req.body = result.data;
  next();
}