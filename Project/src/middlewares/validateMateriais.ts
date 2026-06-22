// src/middlewares/validateMateriais.ts
// ─────────────────────────────────────────────────────────────────
// Schemas Zod e middlewares de validação para o módulo de Materiais.
//
// Exports:
//   validateCreateMaterial  → POST /projects/:projectId/materials
//   validateUpdateMaterial  → PATCH /materials/:materialId
//   validateListMateriais   → GET  /projects/:projectId/materials (query params)
//   CreateMaterialInput, UpdateMaterialInput, ListMateriaisFilters (tipos)
// ─────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

// ── Helper: formatador de erros Zod → { campo: mensagem } ─────────

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.errors.reduce<Record<string, string>>((acc, issue) => {
    const field = issue.path.join(".") || "general";
    if (!acc[field]) acc[field] = issue.message;
    return acc;
  }, {});
}

// ── Helper: resposta 400 padronizada ──────────────────────────────

function respondValidationError(
  res: Response,
  error: ZodError
): void {
  res.status(400).json({
    status: "error",
    message: "Dados inválidos. Verifique os campos abaixo.",
    errors: formatZodErrors(error),
  });
}

// ══════════════════════════════════════════════════════════════════
// ENUM — Áreas de Material (espelha o Prisma AreaMaterial)
// ══════════════════════════════════════════════════════════════════

const AREA_MATERIAL_VALUES = [
  "REVESTIMENTOS",
  "PINTURAS",
  "LOUCAS_E_METAIS",
  "LUMINARIAS",
] as const;

// ── Sub-schema: item de cômodo para POST (projectId vem da URL) ───

const comodoPostItemSchema = z.object({
  idComodo: z
    .number({ required_error: "O campo 'idComodo' é obrigatório.", invalid_type_error: "O campo 'idComodo' deve ser um número inteiro." })
    .int({ message: "'idComodo' deve ser um número inteiro." })
    .positive({ message: "'idComodo' deve ser positivo." }),

  idAndar: z
    .number({ required_error: "O campo 'idAndar' é obrigatório.", invalid_type_error: "O campo 'idAndar' deve ser um número inteiro." })
    .int({ message: "'idAndar' deve ser um número inteiro." })
    .positive({ message: "'idAndar' deve ser positivo." }),
});

export type ComodoPostItem = z.infer<typeof comodoPostItemSchema>;

// ── Sub-schema: item de cômodo para PATCH (inclui idProjeto) ──────

const comodoPatchItemSchema = comodoPostItemSchema.extend({
  idProjeto: z
    .string({ required_error: "O campo 'idProjeto' é obrigatório." })
    .uuid({ message: "'idProjeto' deve ser um UUID válido." }),
});

export type ComodoPatchItem = z.infer<typeof comodoPatchItemSchema>;

// ══════════════════════════════════════════════════════════════════
// SCHEMA 1 — Criação de Material (POST /projects/:projectId/materials)
// ══════════════════════════════════════════════════════════════════

const createMaterialSchema = z.object({
  nomeMaterial: z
    .string({ required_error: "O campo 'nomeMaterial' é obrigatório." })
    .trim()
    .min(1, { message: "O campo 'nomeMaterial' não pode estar vazio." }),

  area: z.enum(AREA_MATERIAL_VALUES, {
    required_error: "O campo 'area' é obrigatório.",
    invalid_type_error: `O campo 'area' deve ser um dos valores: ${AREA_MATERIAL_VALUES.join(", ")}.`,
  }),

  referencia: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  lote: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  marca: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  tamanho: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  tipoMaterial: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  cor: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  descricaoMaterial: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),

  comodos: z
    .array(comodoPostItemSchema, {
      required_error: "O campo 'comodos' é obrigatório.",
      invalid_type_error: "O campo 'comodos' deve ser um array.",
    })
    .min(1, { message: "Informe ao menos um cômodo para vincular o material." }),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export function validateCreateMaterial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = createMaterialSchema.safeParse(req.body);

  if (!result.success) {
    respondValidationError(res, result.error);
    return;
  }

  req.body = result.data;
  next();
}

// ══════════════════════════════════════════════════════════════════
// SCHEMA 2 — Edição de Material (PATCH /materials/:materialId)
// ══════════════════════════════════════════════════════════════════

const updateMaterialSchema = z
  .object({
    nomeMaterial: z
      .string()
      .trim()
      .min(1, { message: "O campo 'nomeMaterial' não pode estar vazio." })
      .optional(),

    area: z
      .enum(AREA_MATERIAL_VALUES, {
        invalid_type_error: `O campo 'area' deve ser um dos valores: ${AREA_MATERIAL_VALUES.join(", ")}.`,
      })
      .optional(),

    referencia: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    lote: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    marca: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    tamanho: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    tipoMaterial: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    cor: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    descricaoMaterial: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    // Quando enviado, obrigatório ter ao menos 1 item
    comodos: z
      .array(comodoPatchItemSchema, {
        invalid_type_error: "O campo 'comodos' deve ser um array.",
      })
      .min(1, { message: "Informe ao menos um cômodo ao atualizar as relações." })
      .optional(),
  })
  // Garante que ao menos um campo foi enviado para atualizar
  .refine(
    (data) =>
      Object.values(data).some((v) => v !== undefined),
    { message: "Informe ao menos um campo para atualizar." }
  );

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

export function validateUpdateMaterial(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = updateMaterialSchema.safeParse(req.body);

  if (!result.success) {
    respondValidationError(res, result.error);
    return;
  }

  req.body = result.data;
  next();
}

// ══════════════════════════════════════════════════════════════════
// SCHEMA 3 — Filtros de Listagem (GET /projects/:projectId/materials)
// ══════════════════════════════════════════════════════════════════

const listMateriaisSchema = z.object({
  area: z
    .enum(AREA_MATERIAL_VALUES, {
      invalid_type_error: `O parâmetro 'area' deve ser: ${AREA_MATERIAL_VALUES.join(", ")}.`,
    })
    .optional(),

  // comodoId é recebido como string na query; transforma para number
  comodoId: z
    .string()
    .regex(/^\d+$/, { message: "O parâmetro 'comodoId' deve ser um número inteiro positivo." })
    .transform(Number)
    .optional(),
});

export type ListMateriaisFilters = z.infer<typeof listMateriaisSchema>;

export function validateListMateriais(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const result = listMateriaisSchema.safeParse(req.query);

  if (!result.success) {
    respondValidationError(res, result.error);
    return;
  }

  // Substitui req.query pelo objeto validado e tipado
  (req as Request & { parsedFilters: ListMateriaisFilters }).parsedFilters =
    result.data;
  next();
}
