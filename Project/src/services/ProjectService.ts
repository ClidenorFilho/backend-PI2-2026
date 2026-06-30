// src/services/ProjectService.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Inserir novo Projeto no banco de dados via Prisma
//   2. Vincular automaticamente ao Construtor (idConstrutor)
//   3. Retornar dados do projeto criado com sucesso
// ─────────────────────────────────────────────────────────────────

import path from "path";
import { prisma } from "../lib/prisma";
import { CreateProjectInput } from "../middlewares/validateCreateProject";
import { AddEmployeeInput } from "../middlewares/validateEmployee";
import { UpdateEmployeeInput } from "../middlewares/validateUpdateEmployee";
import { CreateRoomInput } from "../middlewares/validateCreateRoom";
import { CreateAlterationInput } from "../middlewares/validateCreateAlteration";
import { Prisma, Projeto, FuncionarioObra, Planta, Comodo, AreaAlteracao } from "@prisma/client";

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

export type ProjectRooms = Array<{
  idAndar: number;
  nomeAndar: string;
  comodos: Array<{
    idComodo: number;
    nomeComodo: string;
  }>;
}>;

type UpdateProjectData = {
  descricao?: string;
  rua?: string;
  bairro?: string;
  numero?: string;
  complemento?: string;
  dataConclusao?: Date;
};

export type CreateAlterationFiles = {
  fotos?: Express.Multer.File[];
  planta?: Express.Multer.File[];
};

export type CreateAlterationResult = {
  idAlteracao: string;
  idProjeto: string;
  idAndar: number;
  idComodo: number;
  idPlanta: string | null;
  nomeAlteracao: string;
  descricaoAlteracao: string;
  areaAlteracao: AreaAlteracao;
  dataAlteracao: Date;
  funcionariosIds: string[];
  fotos: Array<{
    idFoto: string;
    urlDaFoto: string;
  }>;
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

export class RoomCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomCreationError";
  }
}

export class RoomNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoomNotFoundError";
  }
}

export class EmployeeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeNotFoundError";
  }
}

export class AlterationCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlterationCreationError";
  }
}

const toRelativeUploadPath = (absolutePath: string): string =>
  path.relative(process.cwd(), absolutePath).split(path.sep).join("/");

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
   * Registra uma Alteração em um Projeto com planta opcional, fotos e vínculo com funcionários.
   */
  async createAlteration(
    idProjeto: string,
    idConstrutor: string,
    data: CreateAlterationInput,
    files: CreateAlterationFiles
  ): Promise<CreateAlterationResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const projeto = await tx.projeto.findFirst({
          where: {
            idProjeto,
            idConstrutor,
          },
          select: {
            idProjeto: true,
          },
        });

        if (!projeto) {
          throw new ProjectNotFoundError(
            "Projeto não encontrado ou você não tem permissão para acessá-lo."
          );
        }

        const andar = await tx.andar.findFirst({
          where: {
            idProjeto,
            idAndar: data.idAndar,
          },
          select: {
            idAndar: true,
          },
        });

        if (!andar) {
          throw new RoomNotFoundError(
            `O andar informado (${data.idAndar}) não existe neste projeto.`
          );
        }

        const comodo = await tx.comodo.findFirst({
          where: {
            idProjeto,
            idAndar: data.idAndar,
            idComodo: data.idComodo,
          },
          select: {
            idComodo: true,
          },
        });

        if (!comodo) {
          throw new RoomNotFoundError(
            `O cômodo informado (${data.idComodo}) não existe no andar ${data.idAndar} deste projeto.`
          );
        }

        const funcionariosIdsUnicos = Array.from(
          new Set(data.funcionariosIds.map((id) => String(id).trim()).filter(Boolean))
        );

        const funcionariosEncontrados = await tx.funcionarioObra.findMany({
          where: {
            idFunc: {
              in: funcionariosIdsUnicos,
            },
          },
          select: {
            idFunc: true,
          },
        });

        if (funcionariosEncontrados.length !== funcionariosIdsUnicos.length) {
          const encontrados = new Set(funcionariosEncontrados.map((funcionario) => funcionario.idFunc));
          const faltantes = funcionariosIdsUnicos.filter((idFunc) => !encontrados.has(idFunc));

          throw new EmployeeNotFoundError(
            `Os seguintes funcionários não foram encontrados no banco: ${faltantes.join(", ")}.`
          );
        }

        const funcionariosProjeto = await tx.funcionarioProjeto.findMany({
          where: {
            idProjeto,
            idFunc: {
              in: funcionariosIdsUnicos,
            },
          },
          select: {
            idFunc: true,
          },
        });

        if (funcionariosProjeto.length !== funcionariosIdsUnicos.length) {
          const vinculados = new Set(funcionariosProjeto.map((vinculo) => vinculo.idFunc));
          const naoVinculados = funcionariosIdsUnicos.filter((idFunc) => !vinculados.has(idFunc));

          throw new EmployeeNotFoundError(
            `Os seguintes funcionários não estão vinculados ao projeto: ${naoVinculados.join(", ")}.`
          );
        }

        const plantaArquivo = files.planta?.[0];
        const fotosArquivos = files.fotos ?? [];

        const plantaCriada = plantaArquivo
          ? await tx.planta.create({
              data: {
                idProjeto,
                tipoPlanta: data.areaAlteracao,
                arquivoPlanta: toRelativeUploadPath(plantaArquivo.path),
              },
              select: {
                idPlanta: true,
              },
            })
          : null;

        const funcionarioPrincipal = funcionariosIdsUnicos[0];

        const alteracao = await tx.alteracao.create({
          data: {
            idComodo: data.idComodo,
            idAndar: data.idAndar,
            idProjetoComodo: idProjeto,
            idPlanta: plantaCriada?.idPlanta ?? null,
            idFunc: funcionarioPrincipal,
            idConstrutor,
            nomeAlteracao: data.nomeAlteracao,
            descricaoAlteracao: data.descricao,
            area: data.areaAlteracao,
            dataAlteracao: data.dataAlteracao,
          },
          select: {
            idAlteracao: true,
            idProjetoComodo: true,
            idAndar: true,
            idComodo: true,
            idPlanta: true,
            nomeAlteracao: true,
            descricaoAlteracao: true,
            area: true,
            dataAlteracao: true,
          },
        });

        await tx.alteracaoFuncionario.createMany({
          data: funcionariosIdsUnicos.map((idFunc) => ({
            idAlteracao: alteracao.idAlteracao,
            idFunc,
          })),
        });

        const fotosCriadas = await Promise.all(
          fotosArquivos.map((foto) =>
            tx.fotoAlteracao.create({
              data: {
                idAlteracao: alteracao.idAlteracao,
                urlDaFoto: toRelativeUploadPath(foto.path),
              },
              select: {
                idFoto: true,
                urlDaFoto: true,
              },
            })
          )
        );

        return {
          idAlteracao: alteracao.idAlteracao,
          idProjeto: alteracao.idProjetoComodo,
          idAndar: alteracao.idAndar,
          idComodo: alteracao.idComodo,
          idPlanta: alteracao.idPlanta,
          nomeAlteracao: alteracao.nomeAlteracao,
          descricaoAlteracao: alteracao.descricaoAlteracao,
          areaAlteracao: alteracao.area,
          dataAlteracao: alteracao.dataAlteracao,
          funcionariosIds: funcionariosIdsUnicos,
          fotos: fotosCriadas,
        };
      });
    } catch (error) {
      if (
        error instanceof ProjectNotFoundError ||
        error instanceof RoomNotFoundError ||
        error instanceof EmployeeNotFoundError
      ) {
        throw error;
      }

      console.error("[ProjectService] Erro ao registrar alteração:", error);

      if (error instanceof Error) {
        throw new AlterationCreationError(
          `Erro ao registrar a alteração: ${error.message}`
        );
      }

      throw new AlterationCreationError(
        "Erro desconhecido ao registrar a alteração. Tente novamente mais tarde."
      );
    }
  }

  /**
   * Adiciona um andar e um cômodo a um projeto pertencente ao construtor.
   * Se o andar já existir com o mesmo nome, reaproveita o registro existente.
   * @param idProjeto - ID do projeto
   * @param idConstrutor - ID do construtor logado
   * @param data - Dados validados (nomeAndar, nomeComodo)
   * @returns {Promise<Comodo>} - O cômodo criado com sua chave composta
   * @throws {ProjectNotFoundError} se o projeto não existir ou não pertencer ao construtor
   * @throws {RoomCreationError} em caso de erro ao criar o andar/cômodo
   */
  async addRoom(
    idProjeto: string,
    idConstrutor: string,
    data: CreateRoomInput
  ): Promise<Comodo> {
    const projeto = await prisma.projeto.findFirst({
      where: {
        idProjeto,
        idConstrutor,
      },
      select: {
        idProjeto: true,
      },
    });

    if (!projeto) {
      throw new ProjectNotFoundError(
        "Projeto não encontrado ou você não tem permissão para acessá-lo."
      );
    }

    try {
      const comodo = await prisma.$transaction(async (tx) => {
        const nomeAndar = data.nomeAndar.trim();
        const nomeComodo = data.nomeComodo.trim();

        let andar = await tx.andar.findFirst({
          where: {
            idProjeto,
            nomeAndar,
          },
        });

        if (!andar) {
          const ultimoAndar = await tx.andar.findFirst({
            where: { idProjeto },
            orderBy: { idAndar: "desc" },
            select: { idAndar: true },
          });

          const novoIdAndar = (ultimoAndar?.idAndar ?? 0) + 1;

          andar = await tx.andar.create({
            data: {
              idAndar: novoIdAndar,
              idProjeto,
              nomeAndar,
            },
          });
        }

        const ultimoComodo = await tx.comodo.findFirst({
          where: {
            idProjeto,
            idAndar: andar.idAndar,
          },
          orderBy: { idComodo: "desc" },
          select: { idComodo: true },
        });

        const novoIdComodo = (ultimoComodo?.idComodo ?? 0) + 1;

        return tx.comodo.create({
          data: {
            idComodo: novoIdComodo,
            idAndar: andar.idAndar,
            idProjeto,
            nomeComodo,
          },
        });
      });

      return comodo;
    } catch (error) {
      console.error("[ProjectService] Erro ao adicionar cômodo:", error);

      if (error instanceof Error) {
        throw new RoomCreationError(
          `Erro ao adicionar cômodo: ${error.message}`
        );
      }

      throw new RoomCreationError(
        "Erro desconhecido ao adicionar cômodo. Tente novamente mais tarde."
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
   * Lista todos os Projetos do usuário autenticado com filtros opcionais.
   *
   * Regra de perfil:
   *   - CONSTRUTOR  → filtra por idConstrutor
   *   - PROPRIETARIO → filtra por idProprietario
   *
   * @param filters - Objeto com { user, status?, order?, limit?, search? }
   * @returns {Promise<any[]>} - Array de projetos com dados do construtor
   * @throws {ProjectCreationError} em caso de erro ao buscar
   */
  async listProjects(filters: {
    user: { id: string; profile: string };
    status?: string;
    order?: 'asc' | 'desc';
    limit?: number;
    search?: string;
  }): Promise<any[]> {
    try {
      const { user, status, order = 'desc', limit, search } = filters;

      // Construir filtro de ownership com base no perfil do usuário logado
      const ownershipFilter: Prisma.ProjetoWhereInput =
        user.profile === 'PROPRIETARIO'
          ? { idProprietario: user.id }
          : { idConstrutor: user.id };

      const where: Prisma.ProjetoWhereInput = {
        ...ownershipFilter,
        ...(status && { status: status as Prisma.EnumStatusProjetoFilter }),
        ...(search && {
          nomeProjeto: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      };

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
   * Busca um Projeto específico pelo ID, verificando ownership com base no perfil.
   *
   * Regra de perfil:
   *   - CONSTRUTOR   → valida que projeto.idConstrutor === user.id
   *   - PROPRIETARIO → valida que projeto.idProprietario === user.id
   *
   * @param idProjeto  - ID do projeto
   * @param user       - Objeto { id, profile } extraído do token JWT
   * @returns {Promise<ProjectDetails>} - Projeto com seus relacionamentos
   * @throws {ProjectNotFoundError} se o Projeto não existir ou não pertencer ao usuário
   * @throws {ProjectCreationError} em caso de erro ao buscar
   */
  async getProjectById(
    idProjeto: string,
    user: { id: string; profile: string }
  ): Promise<ProjectDetails> {
    try {
      const projeto = await prisma.projeto.findUnique({
        where: { idProjeto },
        include: projectDetailsInclude,
      });

      // Validar existência e ownership com base no perfil do usuário
      const temPermissao =
        user.profile === 'PROPRIETARIO'
          ? projeto?.idProprietario === user.id
          : projeto?.idConstrutor === user.id;

      if (!projeto || !temPermissao) {
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
   * Busca andares e cômodos de um Projeto específico, garantindo que pertence ao Construtor.
   * Retorna apenas os campos necessários para alimentar selects no Front-end.
   * @param idProjeto - ID do projeto
   * @param idConstrutor - ID do Construtor (extraído do token JWT)
   * @returns {Promise<ProjectRooms>} - Lista de andares com seus cômodos
   * @throws {ProjectNotFoundError} se o projeto não existir ou não pertencer ao construtor
   * @throws {ProjectCreationError} em caso de erro ao buscar
   */
  async getProjectRooms(
  idProjeto: string,
  user: { id: string; profile: string }
  ): Promise<ProjectRooms> {
    try {
      const projeto = await prisma.projeto.findUnique({
        where: { idProjeto },
        select: {
          idProjeto: true,
          idConstrutor: true,
          idProprietario: true,
        },
      });

      if (!projeto) {
        throw new ProjectNotFoundError(
          "Projeto não encontrado."
        );
      }

      // Construtor sempre acessa; Proprietário acessa se projeto foi entregue
      const temPermissao =
        user.profile === 'CONSTRUTOR'
          ? projeto.idConstrutor === user.id
          : user.profile === 'PROPRIETARIO'
          ? projeto.idProprietario === user.id
          : false;

      if (!temPermissao) {
        throw new ProjectNotFoundError(
          "Projeto não encontrado ou você não tem permissão para acessá-lo."
        );
      }

      const andares = await prisma.andar.findMany({
        where: { idProjeto },
        select: {
          idAndar: true,
          nomeAndar: true,
          comodos: {
            select: {
              idComodo: true,
              nomeComodo: true,
            },
            orderBy: {
              idComodo: "asc",
            },
          },
        },
        orderBy: {
          idAndar: "asc",
        },
      });

      return andares;
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        throw error;
      }

      console.error("[ProjectService] Erro ao buscar andares e cômodos:", error);

      if (error instanceof Error) {
        throw new ProjectCreationError(
          `Erro ao buscar andares e cômodos: ${error.message}`
        );
      }

      throw new ProjectCreationError(
        "Erro desconhecido ao buscar andares e cômodos. Tente novamente mais tarde."
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
