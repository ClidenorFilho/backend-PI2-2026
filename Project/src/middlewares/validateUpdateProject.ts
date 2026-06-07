// src/middlewares/validateUpdateProject.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de atualização de Projeto.
// Campos opcionais: descricao, rua, bairro, numero, complemento, dataConclusao/dataEntrega
// Pelo menos um campo deve ser modificado.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

const updateProjectSchema = z
  .object({
    descricao: z.string().trim().min(1).optional(),

    rua: z.string().trim().min(1).optional(),

    bairro: z.string().trim().min(1).optional(),

    numero: z.string().trim().min(1).optional(),

    complemento: z
      .string()
      .optional()
      .transform((val) => (val?.trim() === "" ? undefined : val?.trim())),

    dataConclusao: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),

    dataEntrega: z
      .string()
      .datetime()
      .transform((val) => new Date(val))
      .optional(),
  })
  .refine(
    (data) =>
      data.descricao !== undefined ||
      data.rua !== undefined ||
      data.bairro !== undefined ||
      data.numero !== undefined ||
      data.complemento !== undefined ||
      data.dataConclusao !== undefined ||
      data.dataEntrega !== undefined,
    {
      message:
        "Pelo menos um campo (endereço, descrição ou data) deve ser fornecido.",
      path: ["root"],
    }
  )
  .transform((data) => ({
    descricao: data.descricao,
    rua: data.rua,
    bairro: data.bairro,
    numero: data.numero,
    complemento: data.complemento,
    dataConclusao: data.dataConclusao ?? data.dataEntrega,
  }));

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export function validateUpdateProject(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = updateProjectSchema.safeParse(req.body);

  if (!result.success) {
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

  req.body = result.data;
  next();
}