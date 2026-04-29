// src/services/ProjectService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Inserir novo Projeto no banco de dados via Prisma
//   2. Vincular automaticamente ao Construtor (idConstrutor)
//   3. Retornar dados do projeto criado com sucesso
// ─────────────────────────────────────────────────────────────────

import { prisma } from "../lib/prisma";
import { CreateProjectInput } from "../middlewares/validateCreateProject";
import { AddEmployeeInput } from "../middlewares/validateEmployee";
import { Projeto, FuncionarioObra, Planta } from "@prisma/client";

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

export class ProjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class EmployeeCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeCreationError";
  }
}

export class DocumentUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentUploadError";
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

  /**
   * Adiciona um Funcionário a um Projeto.
   * Cria o funcionário na tabela FuncionarioObra e vincula ao Projeto através de FuncionarioProjeto.
   * @param idProjeto - ID do projeto
   * @param data - Dados validados (nomeFunc, cargo)
   * @returns {Promise<{ funcionario: FuncionarioObra, idProjeto: string }>}
   * @throws {ProjectNotFoundError} se o Projeto não existir
   * @throws {EmployeeCreationError} em caso de erro ao inserir
   */
  async addEmployee(
    idProjeto: string,
    data: AddEmployeeInput
  ): Promise<{ funcionario: FuncionarioObra; idProjeto: string }> {
    // 1. Validar se o Projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto },
    });

    if (!projeto) {
      throw new ProjectNotFoundError(
        "Projeto não encontrado. Verifique o ID do projeto."
      );
    }

    // 2. Criar o Funcionário e vincular ao Projeto em uma transação
    try {
      const funcionario = await prisma.funcionarioObra.create({
        data: {
          nomeFunc: data.nomeFunc,
          cargo: data.cargo,
          projetos: {
            create: {
              idProjeto,
              dataAlocacao: new Date(),
            },
          },
        },
      });

      return { funcionario, idProjeto };
    } catch (error) {
      console.error("[ProjectService] Erro ao adicionar funcionário:", error);

      if (error instanceof Error) {
        throw new EmployeeCreationError(
          `Erro ao adicionar funcionário: ${error.message}`
        );
      }

      throw new EmployeeCreationError(
        "Erro desconhecido ao adicionar funcionário. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Adiciona um Documento (Planta) a um Projeto.
   * Cria um registro na tabela Planta com referência ao arquivo.
   * @param idProjeto - ID do projeto
   * @param tipoPlanta - Tipo/descrição da planta (ex: "Arquitetônica", "Estrutural")
   * @param arquivoPlanta - Caminho do arquivo salvo
   * @returns {Promise<Planta>} - A planta criada com seu ID
   * @throws {ProjectNotFoundError} se o Projeto não existir
   * @throws {DocumentUploadError} em caso de erro ao inserir
   */
  async addDocument(
    idProjeto: string,
    tipoPlanta: string,
    arquivoPlanta: string
  ): Promise<Planta> {
    // 1. Validar se o Projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto },
    });

    if (!projeto) {
      throw new ProjectNotFoundError(
        "Projeto não encontrado. Verifique o ID do projeto."
      );
    }

    // 2. Criar a Planta/Documento no banco
    try {
      const planta = await prisma.planta.create({
        data: {
          idProjeto,
          tipoPlanta,
          arquivoPlanta,
        },
      });

      return planta;
    } catch (error) {
      console.error("[ProjectService] Erro ao adicionar documento:", error);

      if (error instanceof Error) {
        throw new DocumentUploadError(
          `Erro ao adicionar documento: ${error.message}`
        );
      }

      throw new DocumentUploadError(
        "Erro desconhecido ao adicionar documento. Tente novamente mais tarde."
      );
    }
  }
}
