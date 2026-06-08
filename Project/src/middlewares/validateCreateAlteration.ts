// src/middlewares/validateCreateAlteration.ts
// ─────────────────────────────────────────────────────────────────
// Valida o payload de criação de Alteração enviado via multipart/form-data.
// Faz o parse dos campos que chegam como string e normaliza tipos.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

const createAlterationSchema = z.object({
  areaAlteracao: z.enum(
    ["ARQUITETONICA", "ESTRUTURAL", "HIDROSSANITARIA", "ELETRICA"],
    {
      required_error: "O campo 'areaAlteracao' é obrigatório.",
      invalid_type_error: "O campo 'areaAlteracao' deve ser um valor válido.",
    }
  ),

  idAndar: z.coerce
    .number({ required_error: "O campo 'idAndar' é obrigatório." })
    .int({ message: "O campo 'idAndar' deve ser um número inteiro." })
    .positive({ message: "O campo 'idAndar' deve ser maior que zero." }),

  idComodo: z.coerce
    .number({ required_error: "O campo 'idComodo' é obrigatório." })
    .int({ message: "O campo 'idComodo' deve ser um número inteiro." })
    .positive({ message: "O campo 'idComodo' deve ser maior que zero." }),

  nomeAlteracao: z
    .string({ required_error: "O campo 'nomeAlteracao' é obrigatório." })
    .trim()
    .min(1, { message: "O campo 'nomeAlteracao' não pode estar vazio." }),

  descricao: z
    .string({ required_error: "O campo 'descricao' é obrigatório." })
    .trim()
    .min(1, { message: "O campo 'descricao' não pode estar vazio." }),

  dataAlteracao: z.preprocess((value) => {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      return new Date(value);
    }

    return value;
  }, z.date({ required_error: "O campo 'dataAlteracao' é obrigatório." })),

  funcionariosIds: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (trimmed === "") {
        return value;
      }

      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }

    return value;
  }, z.array(z.union([z.string(), z.number()])).min(1, {
    message: "O campo 'funcionariosIds' deve conter ao menos um funcionário.",
  })),
});

export type CreateAlterationInput = z.infer<typeof createAlterationSchema>;

export function validateCreateAlteration(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = createAlterationSchema.safeParse(req.body);

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