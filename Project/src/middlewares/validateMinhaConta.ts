// src/middlewares/validateMinhaConta.ts
// ─────────────────────────────────────────────────────────────────
// Schemas Zod e middlewares de validação para o módulo "Minha Conta".
// Responsabilidades:
//   1. Validar e tipar o payload de edição de perfil (PATCH /users/me/profile)
//   2. Validar e tipar o payload de alteração de senha (PATCH /users/me/password)
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ══════════════════════════════════════════════════════════════════
// SCHEMA 1 — Edição de Dados Pessoais (PATCH /users/me/profile)
// ══════════════════════════════════════════════════════════════════

const updateProfileSchema = z
  .object({
    nome: z
      .string({ required_error: "O campo 'nome' é obrigatório." })
      .trim()
      .refine(
        (val) => {
          const parts = val.split(/\s+/).filter(Boolean);
          return parts.length >= 2 && parts.every((p) => p.length >= 2);
        },
        { message: "Informe nome e sobrenome (mínimo 2 letras cada)." }
      )
      .optional(),

    email: z
      .string({ required_error: "O campo 'email' é obrigatório." })
      .email({ message: "Formato de e-mail inválido." })
      .toLowerCase()
      .optional(),

    crea: z
      .string()
      .trim()
      .min(1, { message: "O campo 'crea' não pode ser vazio." })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "Informe ao menos um campo para atualizar." }
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export function validateUpdateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = updateProfileSchema.safeParse(req.body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    res.status(400).json({
      status: "error",
      message: "Dados inválidos. Verifique os campos abaixo.",
      errors,
    });
    return;
  }

  req.body = result.data;
  next();
}

// ══════════════════════════════════════════════════════════════════
// SCHEMA 2 — Alteração de Senha (PATCH /users/me/password)
// ══════════════════════════════════════════════════════════════════

const changePasswordSchema = z.object({
  senhaAtual: z
    .string({ required_error: "O campo 'senhaAtual' é obrigatório." })
    .min(1, { message: "O campo 'senhaAtual' não pode ser vazio." }),

  novaSenha: z
    .string({ required_error: "O campo 'novaSenha' é obrigatório." })
    .min(6, { message: "A nova senha deve ter no mínimo 6 caracteres." }),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function validateChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = changePasswordSchema.safeParse(req.body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    res.status(400).json({
      status: "error",
      message: "Dados inválidos. Verifique os campos abaixo.",
      errors,
    });
    return;
  }

  req.body = result.data;
  next();
}

// ── Formatador de erros Zod → objeto { campo: mensagem } ─────────

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".") || "general";
    if (!acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}
