// src/middlewares/validateEmployee.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de adição de Funcionário a um Projeto.
// Campos obrigatórios: nomeFunc (string), cargo (string)
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Schema Zod ────────────────────────────────────────────────────

const addEmployeeSchema = z.object({
  nomeFunc: z
    .string({ required_error: "O campo 'nomeFunc' é obrigatório." })
    .min(1, { message: "O campo 'nomeFunc' não pode estar vazio." })
    .min(3, { message: "O nome do funcionário deve ter no mínimo 3 caracteres." })
    .trim(),

  cargo: z
    .string({ required_error: "O campo 'cargo' é obrigatório." })
    .min(1, { message: "O campo 'cargo' não pode estar vazio." })
    .min(3, { message: "O cargo deve ter no mínimo 3 caracteres." })
    .trim(),
});

// ── Tipo exportado para uso no Controller / Service ───────────────

export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>;

// ── Middleware ────────────────────────────────────────────────────

export function validateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = addEmployeeSchema.safeParse(req.body);

  if (!result.success) {
    // Formatar erros do Zod
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

  // Injetar dados validados no req.body
  req.body = result.data;
  next();
}
