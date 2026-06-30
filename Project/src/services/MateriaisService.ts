// src/services/MateriaisService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Criar Material + vínculos ComodoMaterial em $transaction
//   2. Atualizar campos do Material e, opcionalmente, recriar os
//      vínculos ComodoMaterial (delete-all + createMany em $transaction)
//   3. Listar Materiais de um projeto com cômodos agregados e filtros
//      dinâmicos por area e comodoId
//
// Erros de domínio:
//   MaterialNotFoundError  → 404
//   ProjectNotFoundError   → 404
//   RoomNotFoundError      → 404
//   MaterialConflictError  → 409
// ─────────────────────────────────────────────────────────────────

import { AreaMaterial, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  CreateMaterialInput,
  UpdateMaterialInput,
  ListMateriaisFilters,
  ComodoPostItem,
  ComodoPatchItem,
} from "../middlewares/validateMateriais";

// ── Erros de Domínio ──────────────────────────────────────────────

export class MaterialNotFoundError extends Error {
  constructor(message = "Material não encontrado.") {
    super(message);
    this.name = "MaterialNotFoundError";
  }
}

export class ProjectNotFoundError extends Error {
  constructor(message = "Projeto não encontrado.") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class RoomNotFoundError extends Error {
  public readonly missing: Array<{ idComodo: number; idAndar: number }>;
  constructor(
    missing: Array<{ idComodo: number; idAndar: number }>,
    message = "Um ou mais cômodos informados não pertencem ao projeto."
  ) {
    super(message);
    this.name = "RoomNotFoundError";
    this.missing = missing;
  }
}

// ── Tipos de Resposta ─────────────────────────────────────────────

export type ComodoInfo = {
  idComodo: number;
  idAndar: number;
  nomeComodo: string;
  nomeAndar: string;
};

export type MaterialComComodos = {
  idMaterial: string;
  nomeMaterial: string;
  area: AreaMaterial;
  cor: string | null;
  tipoMaterial: string | null;
  tamanho: string | null;
  marca: string | null;
  descricaoMaterial: string | null;
  lote: string | null;
  referencia: string | null;
  updatedAt: Date;
  comodos: ComodoInfo[];
};

// ── Helpers privados ──────────────────────────────────────────────

/**
 * Valida que todos os cômodos enviados existem no projeto e retorna
 * os dados completos deles (incluindo nome do andar).
 * Lança RoomNotFoundError com os cômodos ausentes.
 */
async function assertRoomsExistInProject(
  projectId: string,
  comodos: Array<{ idComodo: number; idAndar: number }>
): Promise<void> {
  if (comodos.length === 0) return;

  const found = await prisma.comodo.findMany({
    where: {
      OR: comodos.map((c) => ({
        idComodo: c.idComodo,
        idAndar: c.idAndar,
        idProjeto: projectId,
      })),
    },
    select: { idComodo: true, idAndar: true },
  });

  // Verifica quais cômodos não foram encontrados
  const missing = comodos.filter(
    (c) =>
      !found.some(
        (f) => f.idComodo === c.idComodo && f.idAndar === c.idAndar
      )
  );

  if (missing.length > 0) {
    throw new RoomNotFoundError(missing);
  }
}

/**
 * Agrupa registros de ComodoMaterial em um mapa indexado por idMaterial,
 * produzindo o formato consolidado com array de cômodos por material.
 */
function groupByMaterial(
  records: Array<{
    idMaterial: string;
    material: {
      idMaterial: string;
      nomeMaterial: string;
      area: AreaMaterial;
      cor: string | null;
      tipoMaterial: string | null;
      tamanho: string | null;
      marca: string | null;
      descricaoMaterial: string | null;
      lote: string | null;
      referencia: string | null;
      updatedAt: Date;
    };
    comodo: {
      idComodo: number;
      idAndar: number;
      nomeComodo: string;
      andar: { nomeAndar: string };
    };
  }>
): MaterialComComodos[] {
  const map = new Map<string, MaterialComComodos>();

  for (const record of records) {
    const { material, comodo } = record;
    const key = material.idMaterial;

    if (!map.has(key)) {
      map.set(key, {
        idMaterial: material.idMaterial,
        nomeMaterial: material.nomeMaterial,
        area: material.area,
        cor: material.cor,
        tipoMaterial: material.tipoMaterial,
        tamanho: material.tamanho,
        marca: material.marca,
        descricaoMaterial: material.descricaoMaterial,
        lote: material.lote,
        referencia: material.referencia,
        updatedAt: material.updatedAt,
        comodos: [],
      });
    }

    map.get(key)!.comodos.push({
      idComodo: comodo.idComodo,
      idAndar: comodo.idAndar,
      nomeComodo: comodo.nomeComodo,
      nomeAndar: comodo.andar.nomeAndar,
    });
  }

  return Array.from(map.values());
}

// ── Service ───────────────────────────────────────────────────────

export class MateriaisService {

  // ================================================================
  // POST /projects/:projectId/materials — Criar Material
  // ================================================================

  /**
   * Cria um novo Material e vincula os cômodos informados ao projeto,
   * tudo dentro de uma única $transaction para garantir atomicidade.
   *
   * @throws {ProjectNotFoundError}   se o projeto não existir
   * @throws {RoomNotFoundError}      se algum cômodo não pertencer ao projeto
   */
  async createMaterial(
    projectId: string,
    input: CreateMaterialInput
  ): Promise<MaterialComComodos> {
    // 1. Verificar se o projeto existe
    const projetoExiste = await prisma.projeto.findUnique({
      where: { idProjeto: projectId },
      select: { idProjeto: true },
    });

    if (!projetoExiste) {
      throw new ProjectNotFoundError();
    }

    // 2. Validar que todos os cômodos existem no projeto
    await assertRoomsExistInProject(projectId, input.comodos);

    // 3. Criar Material + ComodoMaterial em $transaction
    const { comodos, ...camposMaterial } = input;

    const material = await prisma.$transaction(async (tx) => {
      // 3a. Persistir o Material
      const novoMaterial = await tx.material.create({
        data: {
          nomeMaterial: camposMaterial.nomeMaterial,
          area: camposMaterial.area as AreaMaterial,
          cor: camposMaterial.cor,
          tipoMaterial: camposMaterial.tipoMaterial,
          tamanho: camposMaterial.tamanho,
          marca: camposMaterial.marca,
          descricaoMaterial: camposMaterial.descricaoMaterial,
          lote: camposMaterial.lote,
          referencia: camposMaterial.referencia,
        },
      });

      // 3b. Criar os vínculos na tabela pivot ComodoMaterial
      await tx.comodoMaterial.createMany({
        data: comodos.map((c: ComodoPostItem) => ({
          idComodo: c.idComodo,
          idAndar: c.idAndar,
          idProjeto: projectId,
          idMaterial: novoMaterial.idMaterial,
          // quantidadeUsada usa o @default(1.0) definido no schema
        })),
      });

      return novoMaterial;
    });

    // 4. Buscar o resultado consolidado para retornar ao controller
    return this.getMaterialConsolidado(material.idMaterial, projectId);
  }

  // ================================================================
  // PATCH /materials/:materialId — Editar Material
  // ================================================================

  /**
   * Atualiza os dados base do Material e, se enviado o array `comodos`,
   * reescreve completamente os vínculos ComodoMaterial dentro de uma
   * $transaction (delete-all → createMany).
   *
   * @throws {MaterialNotFoundError} se o material não existir
   * @throws {RoomNotFoundError}     se algum cômodo informado não existir
   */
  async updateMaterial(
    materialId: string,
    input: UpdateMaterialInput
  ): Promise<{ idMaterial: string; updatedAt: Date }> {
    // 1. Verificar se o material existe
    const material = await prisma.material.findUnique({
      where: { idMaterial: materialId },
      select: { idMaterial: true },
    });

    if (!material) {
      throw new MaterialNotFoundError();
    }

    // 2. Se comodos foram enviados, validar que existem no banco
    if (input.comodos && input.comodos.length > 0) {
      // Agrupar por projeto para validar cada grupo
      const porProjeto = new Map<string, Array<{ idComodo: number; idAndar: number }>>();
      for (const c of input.comodos as ComodoPatchItem[]) {
        if (!porProjeto.has(c.idProjeto)) {
          porProjeto.set(c.idProjeto, []);
        }
        porProjeto.get(c.idProjeto)!.push({ idComodo: c.idComodo, idAndar: c.idAndar });
      }

      // Validar existência em cada projeto
      for (const [projId, comodoList] of porProjeto.entries()) {
        await assertRoomsExistInProject(projId, comodoList);
      }
    }

    // 3. Separar campos do material dos campos de cômodos
    const { comodos, ...camposMaterial } = input;

    // Montar objeto de atualização apenas com os campos presentes
    const dadosAtualizacao: Prisma.MaterialUpdateInput = {};
    if (camposMaterial.nomeMaterial !== undefined)
      dadosAtualizacao.nomeMaterial = camposMaterial.nomeMaterial;
    if (camposMaterial.area !== undefined)
      dadosAtualizacao.area = camposMaterial.area as AreaMaterial;
    if (camposMaterial.cor !== undefined)
      dadosAtualizacao.cor = camposMaterial.cor;
    if (camposMaterial.tipoMaterial !== undefined)
      dadosAtualizacao.tipoMaterial = camposMaterial.tipoMaterial;
    if (camposMaterial.tamanho !== undefined)
      dadosAtualizacao.tamanho = camposMaterial.tamanho;
    if (camposMaterial.marca !== undefined)
      dadosAtualizacao.marca = camposMaterial.marca;
    if (camposMaterial.descricaoMaterial !== undefined)
      dadosAtualizacao.descricaoMaterial = camposMaterial.descricaoMaterial;
    if (camposMaterial.lote !== undefined)
      dadosAtualizacao.lote = camposMaterial.lote;
    if (camposMaterial.referencia !== undefined)
      dadosAtualizacao.referencia = camposMaterial.referencia;

    // 4. Executar operações no banco
    if (comodos && comodos.length > 0) {
      // Com reescrita de vínculos: $transaction atômica
      await prisma.$transaction(async (tx) => {
        // 4a. Atualizar campos do Material (se houver)
        if (Object.keys(dadosAtualizacao).length > 0) {
          await tx.material.update({
            where: { idMaterial: materialId },
            data: dadosAtualizacao,
          });
        }

        // 4b. Apagar TODOS os vínculos atuais deste material
        await tx.comodoMaterial.deleteMany({
          where: { idMaterial: materialId },
        });

        // 4c. Recriar os novos vínculos
        await tx.comodoMaterial.createMany({
          data: (comodos as ComodoPatchItem[]).map((c) => ({
            idComodo: c.idComodo,
            idAndar: c.idAndar,
            idProjeto: c.idProjeto,
            idMaterial: materialId,
            // quantidadeUsada usa o @default(1.0)
          })),
        });
      });
    } else if (Object.keys(dadosAtualizacao).length > 0) {
      // Apenas atualização dos campos do Material, sem mexer nos vínculos
      await prisma.material.update({
        where: { idMaterial: materialId },
        data: dadosAtualizacao,
      });
    }

    return { idMaterial: materialId, updatedAt: new Date() };
  }

  // ================================================================
  // GET /projects/:projectId/materials — Listar Materiais
  // ================================================================

  /**
   * Lista todos os materiais associados ao projeto via ComodoMaterial,
   * agrupando cômodos repetidos dentro de cada material (view consolidada).
   *
   * @throws {ProjectNotFoundError} se o projeto não existir
   */
  async listMaterials(
    projectId: string,
    filters: ListMateriaisFilters
  ): Promise<MaterialComComodos[]> {
    // 1. Verificar se o projeto existe
    const projetoExiste = await prisma.projeto.findUnique({
      where: { idProjeto: projectId },
      select: { idProjeto: true },
    });

    if (!projetoExiste) {
      throw new ProjectNotFoundError();
    }

    // 2. Montar cláusula WHERE dinâmica
    const where: Prisma.ComodoMaterialWhereInput = {
      idProjeto: projectId,
      // Filtro por area do material (nested relation filter)
      ...(filters.area
        ? { material: { area: filters.area as AreaMaterial } }
        : {}),
      // Filtro por idComodo direto na pivot
      ...(filters.comodoId !== undefined
        ? { idComodo: filters.comodoId }
        : {}),
    };

    // 3. Buscar registros com includes necessários para a formatação
    const records = await prisma.comodoMaterial.findMany({
      where,
      include: {
        material: {
          select: {
            idMaterial: true,
            nomeMaterial: true,
            area: true,
            cor: true,
            tipoMaterial: true,
            tamanho: true,
            marca: true,
            descricaoMaterial: true,
            lote: true,
            referencia: true,
            updatedAt: true,
          },
        },
        comodo: {
          select: {
            idComodo: true,
            idAndar: true,
            nomeComodo: true,
            andar: {
              select: { nomeAndar: true },
            },
          },
        },
      },
      orderBy: {
        // Ordena por nome do material para resultado consistente
        material: { nomeMaterial: "asc" },
      },
    });

    // 4. Agregar cômodos por material (eliminar duplicatas de material)
    return groupByMaterial(records);
  }

  // ── Helpers de instância ──────────────────────────────────────────

  /**
   * Busca um material com seus cômodos agregados para um projeto específico.
   * Usado internamente após criação para retornar a resposta completa.
   */
  private async getMaterialConsolidado(
    materialId: string,
    projectId: string
  ): Promise<MaterialComComodos> {
    const records = await prisma.comodoMaterial.findMany({
      where: { idMaterial: materialId, idProjeto: projectId },
      include: {
        material: {
          select: {
            idMaterial: true,
            nomeMaterial: true,
            area: true,
            cor: true,
            tipoMaterial: true,
            tamanho: true,
            marca: true,
            descricaoMaterial: true,
            lote: true,
            referencia: true,
            updatedAt: true,
          },
        },
        comodo: {
          select: {
            idComodo: true,
            idAndar: true,
            nomeComodo: true,
            andar: { select: { nomeAndar: true } },
          },
        },
      },
    });

    const [grouped] = groupByMaterial(records);
    return grouped;
  }
}
