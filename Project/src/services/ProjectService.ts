// src/services/ProjectService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Inserir novo Projeto no banco de dados via Prisma
//   2. Vincular automaticamente ao Construtor (idConstrutor)
//   3. Retornar dados do projeto criado com sucesso
// ─────────────────────────────────────────────────────────────────

import { prisma } from "../lib/prisma";
import { CreateProjectInput } from "../middlewares/validateCreateProject";
import { Projeto } from "@prisma/client";

// ── Erros customizados ────────────────────────────────────────────

export class ProjectCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectCreationError";
  }
}

export class ConstruktorNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConstruktorNotFoundError";
  }
}

// ── Service ───────────────────────────────────────────────────────

export class ProjectService {
  /**
   * Cria um novo Projeto vinculado a um Construtor.
   * @param data - Dados validados do formulário de criação
   * @param idConstrutor - ID do Construtor (extraído do token JWT)
   * @returns {Promise<Projeto>} - O projeto criado com seu ID
   * @throws {ConstruktorNotFoundError} se o Construtor não existir
   * @throws {ProjectCreationError} em caso de erro ao inserir no banco
   */
  async createProject(
    data: CreateProjectInput,
    idConstrutor: string
  ): Promise<Projeto> {
    // 1. Validar se o Construtor existe antes de criar o projeto
    const construtor = await prisma.construtor.findUnique({
      where: { idUser: idConstrutor },
    });

    if (!construtor) {
      throw new ConstruktorNotFoundError(
        "Construtor não encontrado. Verifique se você tem as permissões necessárias."
      );
    }

    // 2. Inserir o Projeto no banco
    try {
      const projeto = await prisma.projeto.create({
        data: {
          idConstrutor,
          nomeProjeto: data.nomeProjeto,
          descricao: data.descricao,
          rua: data.rua,
          bairro: data.bairro,
          numero: data.numero,
          complemento: data.complemento,
          tipoConstrucao: data.tipoConstrucao,
          dataInicio: data.dataInicio,
          dataConclusao: data.dataConclusao,
          art: data.art,
        },
      });

      return projeto;
    } catch (error) {
      console.error("[ProjectService] Erro ao criar projeto:", error);

      if (error instanceof Error) {
        throw new ProjectCreationError(
          `Erro ao criar o projeto: ${error.message}`
        );
      }

      throw new ProjectCreationError(
        "Erro desconhecido ao criar o projeto. Tente novamente mais tarde."
      );
    }
  }
}
