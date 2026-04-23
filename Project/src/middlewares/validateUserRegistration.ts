// src/middlewares/validateUserRegistration.ts
// ─────────────────────────────────────────────────────────────────
// Valida rigorosamente todos os campos antes de chegar no Controller.
// Usa Zod para parsing + superRefine para regras cruzadas.
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Helpers de validação ──────────────────────────────────────────

/** Valida CPF com algoritmo dos dígitos verificadores */
function isValidCPF(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");

  if (digits.length !== 11) return false;

  // Rejeita sequências triviais: 000...0, 111...1, etc.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcDigit = (slice: string, factor: number): number => {
    const sum = slice
      .split("")
      .reduce((acc, d, i) => acc + parseInt(d) * (factor - i), 0);
    const rest = (sum * 10) % 11;
    return rest >= 10 ? 0 : rest;
  };

  const d1 = calcDigit(digits.slice(0, 9), 10);
  const d2 = calcDigit(digits.slice(0, 10), 11);

  return d1 === parseInt(digits[9]) && d2 === parseInt(digits[10]);
}

/** Valida senha: 8+ chars, maiúsculas, minúsculas, símbolo, sem sequências 123/abc */
function isStrongPassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8)
    return { ok: false, reason: "mínimo de 8 caracteres" };

  if (!/[A-Z]/.test(password))
    return { ok: false, reason: "deve conter ao menos uma letra maiúscula" };

  if (!/[a-z]/.test(password))
    return { ok: false, reason: "deve conter ao menos uma letra minúscula" };

  if (!/[^A-Za-z0-9]/.test(password))
    return { ok: false, reason: "deve conter ao menos um símbolo (ex: @, #, !)" };

  // Detecta sequências numéricas crescentes (ex: 123, 234, 345...)
  const hasNumericSequence = /(?:012|123|234|345|456|567|678|789)/.test(password);
  if (hasNumericSequence)
    return { ok: false, reason: "não pode conter sequências numéricas (ex: 123)" };

  // Detecta sequências alfabéticas crescentes (ex: abc, bcd...)
  const hasAlphaSequence = /(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password);
  if (hasAlphaSequence)
    return { ok: false, reason: "não pode conter sequências alfabéticas (ex: abc)" };

  return { ok: true };
}

// ── Schema Zod ────────────────────────────────────────────────────

const registerUserSchema = z
  .object({
    name: z
      .string({ required_error: "O campo 'name' é obrigatório." })
      .trim()
      .refine(
        (val) => {
          const parts = val.split(/\s+/).filter(Boolean);
          return parts.length >= 2 && parts.every((p) => p.length >= 2);
        },
        { message: "Informe nome e sobrenome (mínimo 2 letras cada)." }
      ),

    email: z
      .string({ required_error: "O campo 'email' é obrigatório." })
      .email({ message: "Formato de e-mail inválido." })
      .toLowerCase(),

    cpf: z
      .string({ required_error: "O campo 'cpf' é obrigatório." })
      .refine((val) => isValidCPF(val), {
        message: "CPF inválido. Verifique os dígitos informados.",
      }),

    password: z
      .string({ required_error: "O campo 'password' é obrigatório." })
      .superRefine((val, ctx) => {
        const check = isStrongPassword(val);
        if (!check.ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Senha fraca: ${check.reason}.`,
          });
        }
      }),

    confirmPassword: z.string({
      required_error: "O campo 'confirmPassword' é obrigatório.",
    }),

    profile: z.enum(["CONSTRUTOR", "PROPRIETARIO"], {
      required_error: "O campo 'profile' é obrigatório.",
      invalid_type_error: "Perfil inválido. Use 'CONSTRUTOR' ou 'PROPRIETARIO'.",
    }),

    crea: z.string().optional(),
  })
  // ── Regras cruzadas ─────────────────────────────────────────────
  .superRefine((data, ctx) => {
    // 1. Confirmação de senha
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "A confirmação de senha não confere com a senha informada.",
      });
    }

    // 2. CREA obrigatório para CONSTRUTOR
    if (data.profile === "CONSTRUTOR") {
      const crea = data.crea?.trim();
      if (!crea || crea.length === 0) {
        ctx.addIssue({
          path: ["crea"],
          code: z.ZodIssueCode.custom,
          message: "O campo 'crea' é obrigatório para o perfil CONSTRUTOR.",
        });
      }
    }
  });

// ── Tipo exportado para uso no Controller / Service ───────────────
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// ── Middleware Express ────────────────────────────────────────────

export function validateUserRegistration(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = registerUserSchema.safeParse(req.body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    res.status(400).json({
      status: "error",
      message: "Dados inválidos. Verifique os campos abaixo.",
      errors,
    });
    return;
  }

  // Substitui o body pelo dado validado e transformado (email lowercase, etc.)
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
