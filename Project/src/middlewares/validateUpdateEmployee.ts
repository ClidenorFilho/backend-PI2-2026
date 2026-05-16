// src/middlewares/validateUpdateEmployee.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de atualização de Funcionário em um Projeto.
// Campos opcionais: nomeFunc (string), cargo (string)
// Pelo menos um campo deve ser modificado.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Schema Zod ────────────────────────────────────────────────────

const updateEmployeeSchema = z.object({
  nomeFunc: z
    .string()
    .min(3, { message: "O nome do funcionário deve ter no mínimo 3 caracteres." })
    .trim()
    .optional(),

  cargo: z
    .string()
    .trim()
    .min(3, { message: "O cargo deve ter no mínimo 3 caracteres." })
    .regex(/^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)*$/, {
      message:
        "O cargo deve conter apenas letras (incluindo acentos) e espaços entre palavras.",
    })
    .optional(),
}).refine(
  (data) => data.nomeFunc || data.cargo,
  {
    message: "Pelo menos um campo (nomeFunc ou cargo) deve ser fornecido.",
    path: ["root"],
  }
);

// ── Tipo exportado para uso no Controller / Service ───────────────

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ── Middleware ────────────────────────────────────────────────────

export function validateUpdateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = updateEmployeeSchema.safeParse(req.body);

  if (!result.success) {
    // Formatar erros do Zod
    const errors = result.error.errors.map((err) => ({
      field: err.path.join(".") || "root",
      message: err.message,
    }));

    res.status(400).json({
      status: "error",
      message: "Erro na validação dos dados.",
      errors,
    });
    return;
  }

  // Dados validados → continuar
  req.body = result.data;
  next();
}
