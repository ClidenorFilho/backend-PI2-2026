// src/middlewares/validateLoginInput.ts
// ─────────────────────────────────────────────────────────────────
// Valida e-mail, senha e perfil no login.
// Usa Zod para parsing + superRefine para regras cruzadas.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Schema Zod ────────────────────────────────────────────────────

const loginSchema = z
  .object({
    email: z
      .string({ required_error: "O campo 'email' é obrigatório." })
      .email({ message: "Formato de e-mail inválido." })
      .toLowerCase(),

    password: z.string({
      required_error: "O campo 'password' é obrigatório.",
    }),

    profile: z.enum(["CONSTRUTOR", "PROPRIETARIO"], {
      required_error: "O campo 'profile' é obrigatório.",
      invalid_type_error: "Perfil inválido. Use 'CONSTRUTOR' ou 'PROPRIETARIO'.",
    }),

    crea: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.profile === "CONSTRUTOR") {
      const crea = data.crea?.trim();
      if (!crea) {
        ctx.addIssue({
          path: ["crea"],
          code: z.ZodIssueCode.custom,
          message: "O campo 'crea' é obrigatório para o perfil CONSTRUTOR.",
        });
      }
    }
  })
  .transform((data) => {
    if (data.profile === "PROPRIETARIO") {
      return { ...data, crea: undefined };
    }

    return { ...data, crea: data.crea?.trim() };
  });

// ── Tipo exportado para uso no Controller / Service ───────────────
export type LoginInput = z.infer<typeof loginSchema>;

// ── Formatador de erros Zod ───────────────────────────────────────

function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    formatted[path] = err.message;
  });
  return formatted;
}

// ── Middleware Express ────────────────────────────────────────────

export function validateLoginInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    res.status(400).json({
      status: "error",
      message: "Erro de validação nos dados de entrada.",
      errors,
    });
    return;
  }

  // ── Injetar dados validados no req.body ──────────────────────────
  req.body = result.data;
  next();
}
