import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "O campo 'email' é obrigatório." })
    .email({ message: "Formato de e-mail inválido." })
    .toLowerCase(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".") || "general";
    if (!acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}

export function validateForgotPasswordInput(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = forgotPasswordSchema.safeParse(req.body);

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
