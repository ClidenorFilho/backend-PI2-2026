// src/middlewares/validateCreateProject.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de criação de Projeto.
// Campos obrigatórios: nomeProjeto, rua, bairro, numero, tipoConstrucao, dataInicio
// Campo opcional: art, descricao, complemento, dataConclusao
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Schema Zod ────────────────────────────────────────────────────

const createProjectSchema = z.object({
  nomeProjeto: z
    .string({ required_error: "O campo 'nomeProjeto' é obrigatório." })
    .min(1, { message: "O campo 'nomeProjeto' não pode estar vazio." })
    .trim(),

  descricao: z
    .string()
    .optional()
    .transform((val) => (val?.trim() === "" ? undefined : val?.trim())),

  rua: z
    .string({ required_error: "O campo 'rua' é obrigatório." })
    .min(1, { message: "O campo 'rua' não pode estar vazio." })
    .trim(),

  bairro: z
    .string({ required_error: "O campo 'bairro' é obrigatório." })
    .min(1, { message: "O campo 'bairro' não pode estar vazio." })
    .trim(),

  numero: z
    .string({ required_error: "O campo 'numero' é obrigatório." })
    .min(1, { message: "O campo 'numero' não pode estar vazio." })
    .trim(),

  complemento: z
    .string()
    .optional()
    .transform((val) => (val?.trim() === "" ? undefined : val?.trim())),

  tipoConstrucao: z
    .string({ required_error: "O campo 'tipoConstrucao' é obrigatório." })
    .min(1, { message: "O campo 'tipoConstrucao' não pode estar vazio." })
    .trim(),

  dataInicio: z
    .string({ required_error: "O campo 'dataInicio' é obrigatório." })
    .datetime()
    .transform((val) => new Date(val)),

  dataConclusao: z
    .string()
    .datetime()
    .transform((val) => new Date(val))
    .optional(),

  art: z
    .string()
    .optional()
    .transform((val) => (val?.trim() === "" ? undefined : val?.trim())),
});

// ── Tipo exportado para uso no Controller / Service ───────────────

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ── Middleware ────────────────────────────────────────────────────

export function validateCreateProject(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = createProjectSchema.safeParse(req.body);

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
