// src/middlewares/validateEntrega.ts
// ─────────────────────────────────────────────────────────────────
// Schema Zod e middleware de validação para a rota de entrega.
// POST /projects/:projectId/deliver
//
// Campos obrigatórios: cpf, email do Proprietário destinatário.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Formatador de erros Zod ───────────────────────────────────────

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".") || "general";
    if (!acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}

// ── Schema ────────────────────────────────────────────────────────

const entregaSchema = z.object({
  cpf: z
    .string({ required_error: "O campo 'cpf' é obrigatório." })
    .trim()
    .min(1, { message: "O campo 'cpf' não pode estar vazio." }),

  email: z
    .string({ required_error: "O campo 'email' é obrigatório." })
    .email({ message: "Formato de e-mail inválido." })
    .toLowerCase()
    .trim(),
});

export type EntregaInput = z.infer<typeof entregaSchema>;

// ── Middleware ────────────────────────────────────────────────────

export function validateEntrega(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = entregaSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      status: "error",
      message: "Dados inválidos. Verifique os campos abaixo.",
      errors: formatZodErrors(result.error),
    });
    return;
  }

  req.body = result.data;
  next();
}
