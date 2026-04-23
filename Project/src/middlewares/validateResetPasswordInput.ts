import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: "O campo 'token' é obrigatório." })
      .trim()
      .min(1, { message: "O campo 'token' é obrigatório." }),

    password: z
      .string({ required_error: "O campo 'password' é obrigatório." })
      .min(8, { message: "A senha deve conter ao menos 8 caracteres." }),

    confirmPassword: z.string({
      required_error: "O campo 'confirmPassword' é obrigatório.",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        code: z.ZodIssueCode.custom,
        message: "A confirmação de senha não confere com a senha informada.",
      });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".") || "general";
    if (!acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}

export function validateResetPasswordInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = resetPasswordSchema.safeParse(req.body);

  if (!result.success) {
    const errors = formatZodErrors(result.error);
    res.status(400).json({
      status: "error",
      message: "Erro de validação nos dados de entrada.",
      errors,
    });
    return;
  }

  req.body = result.data;
  next();
}
