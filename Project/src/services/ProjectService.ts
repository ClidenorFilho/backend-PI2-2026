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
import { UpdateEmployeeInput } from "../middlewares/validateUpdateEmployee";
import { Prisma, Projeto, FuncionarioObra, Planta } from "@prisma/client";

const projectDetailsInclude = {
  plantas: true,
  funcionariosProjeto: {
    include: {
      funcionario: true,
    },
  },
  andares: {
    include: {
      comodos: true,
    },
  },
} as const;

export type ProjectDetails = Prisma.ProjetoGetPayload<{
  include: typeof projectDetailsInclude;
}>;

type UpdateProjectData = {
  descricao?: string;
  rua?: string;
  bairro?: string;
  numero?: string;
  complemento?: string;
  dataConclusao?: Date;
};

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

export class EmployeeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeNotFoundError";
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

    // 2. Verificar se a ART informada já pertence a outro projeto
    if (data.art && data.art.trim() !== "") {
      const existingProjectWithArt = await prisma.projeto.findFirst({
        where: { art: data.art.trim() },
        select: { idProjeto: true },
      });

      if (existingProjectWithArt) {
        throw new ProjectCreationError(
          "Já existe um projeto cadastrado com este número de ART."
        );
      }
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

  /**
   * Atualiza o nome e/ou cargo de um Funcionário em um Projeto.
   * @param idProjeto - ID do projeto
   * @param idFunc - ID do funcionário
   * @param data - Dados de atualização (nomeFunc?, cargo?)
   * @returns {Promise<FuncionarioObra>} - O funcionário atualizado
   * @throws {ProjectNotFoundError} se o Projeto não existir
   * @throws {EmployeeNotFoundError} se o Funcionário não existir ou não pertencer ao projeto
   * @throws {EmployeeCreationError} em caso de erro ao atualizar
   */
  async updateEmployee(
    idProjeto: string,
    idFunc: string,
    data: UpdateEmployeeInput
  ): Promise<FuncionarioObra> {
    // 1. Validar se o Projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto },
    });

    if (!projeto) {
      throw new ProjectNotFoundError(
        "Projeto não encontrado. Verifique o ID do projeto."
      );
    }

    // 2. Validar se o Funcionário existe E pertence ao projeto
    const funcionarioProjeto = await prisma.funcionarioProjeto.findUnique({
      where: {
        idFunc_idProjeto: {
          idFunc,
          idProjeto,
        },
      },
    });

    if (!funcionarioProjeto) {
      throw new EmployeeNotFoundError(
        "Funcionário não encontrado neste projeto. Verifique os IDs fornecidos."
      );
    }

    // 3. Atualizar o Funcionário com os dados fornecidos
    try {
      const funcionario = await prisma.funcionarioObra.update({
        where: { idFunc },
        data: {
          ...(data.nomeFunc && { nomeFunc: data.nomeFunc }),
          ...(data.cargo && { cargo: data.cargo }),
        },
      });

      return funcionario;
    } catch (error) {
      console.error("[ProjectService] Erro ao atualizar funcionário:", error);

      if (error instanceof Error) {
        throw new EmployeeCreationError(
          `Erro ao atualizar funcionário: ${error.message}`
        );
      }

      throw new EmployeeCreationError(
        "Erro desconhecido ao atualizar funcionário. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Remove um Funcionário de um Projeto.
   * Deleta a relação em FuncionarioProjeto.
   * Se o funcionário não estiver vinculado a mais nenhum projeto, deleta-o também de FuncionarioObra.
   * @param idProjeto - ID do projeto
   * @param idFunc - ID do funcionário
   * @throws {ProjectNotFoundError} se o Projeto não existir
   * @throws {EmployeeNotFoundError} se o Funcionário não existir no projeto
   * @throws {EmployeeCreationError} em caso de erro ao remover
   */
  async removeEmployee(
    idProjeto: string,
    idFunc: string
  ): Promise<void> {
    // 1. Validar se o Projeto existe
    const projeto = await prisma.projeto.findUnique({
      where: { idProjeto },
    });

    if (!projeto) {
      throw new ProjectNotFoundError(
        "Projeto não encontrado. Verifique o ID do projeto."
      );
    }

    // 2. Validar se o Funcionário está vinculado ao projeto
    const funcionarioProjeto = await prisma.funcionarioProjeto.findUnique({
      where: {
        idFunc_idProjeto: {
          idFunc,
          idProjeto,
        },
      },
    });

    if (!funcionarioProjeto) {
      throw new EmployeeNotFoundError(
        "Funcionário não encontrado neste projeto. Verifique os IDs fornecidos."
      );
    }

    // 3. Remover em transação: deletar relação e depois o funcionário se órfão
    try {
      // 3a. Deletar a relação em FuncionarioProjeto
      await prisma.funcionarioProjeto.delete({
        where: {
          idFunc_idProjeto: {
            idFunc,
            idProjeto,
          },
        },
      });

      // 3b. Verificar se o funcionário ainda está vinculado a algum projeto
      const vinculosRestantes = await prisma.funcionarioProjeto.findMany({
        where: { idFunc },
      });

      // 3c. Se não há mais projetos, deletar o funcionário
      if (vinculosRestantes.length === 0) {
        await prisma.funcionarioObra.delete({
          where: { idFunc },
        });
      }
    } catch (error) {
      console.error("[ProjectService] Erro ao remover funcionário:", error);

      if (error instanceof Error) {
        throw new EmployeeCreationError(
          `Erro ao remover funcionário: ${error.message}`
        );
      }

      throw new EmployeeCreationError(
        "Erro desconhecido ao remover funcionário. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Lista todos os Projetos de um Construtor com filtros opcionais.
   * Filtra por status, ordena por updatedAt, aplica limite e busca por nome.
   * @param filters - Objeto com { idConstrutor: string, status?: string, order?: 'asc' | 'desc', limit?: number, search?: string }
   * @returns {Promise<Projeto[]>} - Array de projetos com dados do construtor
   * @throws {ProjectCreationError} em caso de erro ao buscar
   */
  async listProjects(filters: {
    idConstrutor: string;
    status?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    search?: string;
  }): Promise<any[]> {
    try {
      const { idConstrutor, status, order = 'desc', limit, search } = filters;

      // Construir o objeto where dinamicamente
      const where: any = {
        idConstrutor,
      };

      if (status) {
        where.status = status;
      }

      if (search) {
        where.nomeProjeto = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const projetos = await prisma.projeto.findMany({
        where,
        include: {
          construtor: {
            include: {
              user: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: order,
        },
        ...(limit && { take: limit }),
      });

      return projetos;
    } catch (error) {
      console.error("[ProjectService] Erro ao listar projetos:", error);

      if (error instanceof Error) {
        throw new ProjectCreationError(
          `Erro ao listar projetos: ${error.message}`
        );
      }

      throw new ProjectCreationError(
        "Erro desconhecido ao listar projetos. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Busca um Projeto específico pelo ID, garantindo que pertence ao Construtor.
   * Inclui plantas e funcionários vinculados ao projeto.
   * @param idProjeto - ID do projeto
   * @param idConstrutor - ID do Construtor (extraído do token JWT)
   * @returns {Promise<any>} - Projeto com seus relacionamentos
   * @throws {ProjectNotFoundError} se o Projeto não existir ou não pertencer ao construtor
   * @throws {ProjectCreationError} em caso de erro ao buscar
   */
  async getProjectById(
    idProjeto: string,
    idConstrutor: string
  ): Promise<ProjectDetails> {
    try {
      const projeto = await prisma.projeto.findUnique({
        where: { idProjeto },
        include: projectDetailsInclude,
      });

      // Validar se o projeto existe E pertence ao construtor logado
      if (!projeto || projeto.idConstrutor !== idConstrutor) {
        throw new ProjectNotFoundError(
          "Projeto não encontrado ou você não tem permissão para acessá-lo."
        );
      }

      return projeto;
    } catch (error) {
      // Re-lançar erro customizado se for ProjectNotFoundError
      if (error instanceof ProjectNotFoundError) {
        throw error;
      }

      console.error("[ProjectService] Erro ao buscar projeto:", error);

      if (error instanceof Error) {
        throw new ProjectCreationError(
          `Erro ao buscar projeto: ${error.message}`
        );
      }

      throw new ProjectCreationError(
        "Erro desconhecido ao buscar projeto. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Atualiza dados cadastrais de um Projeto.
   * Permite alterar endereço, descrição e datas.
   */
  async updateProject(
    idProjeto: string,
    idConstrutor: string,
    data: UpdateProjectData
  ): Promise<ProjectDetails> {
    try {
      const projetoExistente = await prisma.projeto.findUnique({
        where: { idProjeto },
        select: {
          idProjeto: true,
          idConstrutor: true,
        },
      });

      if (!projetoExistente || projetoExistente.idConstrutor !== idConstrutor) {
        throw new ProjectNotFoundError(
          "Projeto não encontrado ou você não tem permissão para atualizá-lo."
        );
      }

      const projetoAtualizado = await prisma.projeto.update({
        where: { idProjeto },
        data: {
          ...(data.descricao !== undefined && { descricao: data.descricao }),
          ...(data.rua !== undefined && { rua: data.rua }),
          ...(data.bairro !== undefined && { bairro: data.bairro }),
          ...(data.numero !== undefined && { numero: data.numero }),
          ...(data.complemento !== undefined && { complemento: data.complemento }),
          ...(data.dataConclusao !== undefined && {
            dataConclusao: data.dataConclusao,
          }),
        },
        include: projectDetailsInclude,
      });

      return projetoAtualizado;
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw error;
      }

      console.error("[ProjectService] Erro ao atualizar projeto:", error);

      if (error instanceof Error) {
        throw new ProjectCreationError(
          `Erro ao atualizar projeto: ${error.message}`
        );
      }

      throw new ProjectCreationError(
        "Erro desconhecido ao atualizar projeto. Tente novamente mais tarde."
      );
    }
  }
}
