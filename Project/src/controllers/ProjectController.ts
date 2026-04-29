// src/controllers/ProjectController.ts
// ─────────────────────────────────────────────────────────────────
// Responsabilidades:
//   1. Extrair id do usuário logado (req.user via middleware auth)
//   2. Extrair dados já validados do req.body
//   3. Invocar o ProjectService
//   4. Mapear erros de negócio → respostas HTTP semânticas
//   5. Retornar 201 Created com o ID do projeto
// ─────────────────────────────────────────────────────────────────

import { Request, Response } from "express";
import {
  ProjectService,
  ProjectCreationError,
  ConstruktorNotFoundError,
  ProjectNotFoundError,
  EmployeeCreationError,
  DocumentUploadError,
  EmployeeNotFoundError,
} from "../services/ProjectService";
import { CreateProjectInput } from "../middlewares/validateCreateProject";
import { AddEmployeeInput } from "../middlewares/validateEmployee";
import { UpdateEmployeeInput } from "../middlewares/validateUpdateEmployee";

export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * POST /projects
   * Cria um novo Projeto vinculado ao Construtor logado.
   */
  create = async (req: Request, res: Response): Promise<void> => {
    // 1. Extrair o ID do Construtor (usuario logado)
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Usuário não autenticado. Realize o login primeiro.",
      });
      return;
    }

    const idConstrutor = req.user.id;

    // 2. Extrair dados validados do body
    const data = req.body as CreateProjectInput;

    try {
      // 3. Chamar o service
      const projeto = await this.projectService.createProject(
        data,
        idConstrutor
      );

      // 4. Retornar 201 Created com dados mínimos
      res.status(201).json({
        status: "success",
        message: "Projeto criado com sucesso.",
        data: {
          id: projeto.idProjeto,
          nomeProjeto: projeto.nomeProjeto,
          dataInicio: projeto.dataInicio,
        },
      });
    } catch (error) {
      // ── Construtor não encontrado ────────────────────────────────
      if (error instanceof ConstruktorNotFoundError) {
        res.status(403).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao criar projeto (validação de negócio, etc) ────────
      if (error instanceof ProjectCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 sem vazar detalhes internos ──────
      console.error("[ProjectController] Erro inesperado:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao criar o projeto. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * POST /projects/:id/employees
   * Adiciona um Funcionário a um Projeto.
   */
  addEmployee = async (req: Request, res: Response): Promise<void> => {
    const { id: idProjeto } = req.params;
    const data = req.body as AddEmployeeInput;

    try {
      const result = await this.projectService.addEmployee(idProjeto, data);

      res.status(201).json({
        status: "success",
        message: "Funcionário adicionado ao projeto com sucesso.",
        data: {
          idFunc: result.funcionario.idFunc,
          nomeFunc: result.funcionario.nomeFunc,
          cargo: result.funcionario.cargo,
          idProjeto: result.idProjeto,
        },
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao adicionar funcionário ────────────────────────────
      if (error instanceof EmployeeCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao adicionar funcionário:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao adicionar o funcionário. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * POST /projects/:id/documents
   * Adiciona um Documento (Planta) a um Projeto.
   * O arquivo é enviado via multipart/form-data
   */
  addDocument = async (req: Request, res: Response): Promise<void> => {
    const { id: idProjeto } = req.params;
    const { tipoPlanta } = req.body;
    const file = req.file;

    // 1. Validar se arquivo foi enviado
    if (!file) {
      res.status(400).json({
        status: "error",
        message: "Nenhum arquivo foi enviado.",
      });
      return;
    }

    // 2. Validar se tipoPlanta foi informado
    if (!tipoPlanta || typeof tipoPlanta !== "string" || tipoPlanta.trim() === "") {
      res.status(400).json({
        status: "error",
        message: "O campo 'tipoPlanta' é obrigatório.",
      });
      return;
    }

    try {
      // 3. Chamar o service com o caminho do arquivo
      const planta = await this.projectService.addDocument(
        idProjeto,
        tipoPlanta.trim(),
        file.path
      );

      res.status(201).json({
        status: "success",
        message: "Documento anexado ao projeto com sucesso.",
        data: {
          idPlanta: planta.idPlanta,
          tipoPlanta: planta.tipoPlanta,
          arquivoPlanta: planta.arquivoPlanta,
          idProjeto: planta.idProjeto,
        },
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao adicionar documento ────────────────────────────────
      if (error instanceof DocumentUploadError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao adicionar documento:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao anexar o documento. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * PUT /projects/:id/employees/:idFunc
   * Atualiza o nome e/ou cargo de um Funcionário em um Projeto.
   */
  updateEmployee = async (req: Request, res: Response): Promise<void> => {
    const { id: idProjeto, idFunc } = req.params;
    const data = req.body as UpdateEmployeeInput;

    try {
      const funcionario = await this.projectService.updateEmployee(
        idProjeto,
        idFunc,
        data
      );

      res.status(200).json({
        status: "success",
        message: "Funcionário atualizado com sucesso.",
        data: {
          idFunc: funcionario.idFunc,
          nomeFunc: funcionario.nomeFunc,
          cargo: funcionario.cargo,
        },
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Funcionário não encontrado ou não pertence ao projeto ─────
      if (error instanceof EmployeeNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao atualizar funcionário ────────────────────────────
      if (error instanceof EmployeeCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao atualizar funcionário:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao atualizar o funcionário. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * DELETE /projects/:id/employees/:idFunc
   * Remove um Funcionário de um Projeto (e o deleta se não estiver vinculado a outros projetos).
   */
  removeEmployee = async (req: Request, res: Response): Promise<void> => {
    const { id: idProjeto, idFunc } = req.params;

    try {
      await this.projectService.removeEmployee(idProjeto, idFunc);

      res.status(200).json({
        status: "success",
        message: "Funcionário removido do projeto com sucesso.",
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Funcionário não encontrado ou não pertence ao projeto ─────
      if (error instanceof EmployeeNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao remover funcionário ──────────────────────────────
      if (error instanceof EmployeeCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao remover funcionário:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao remover o funcionário. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * GET /projects
   * Lista todos os Projetos do Construtor logado.
   */
  list = async (req: Request, res: Response): Promise<void> => {
    // 1. Extrair o ID do Construtor (usuário logado)
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Usuário não autenticado. Realize o login primeiro.",
      });
      return;
    }

    const idConstrutor = req.user.id;

    try {
      // 2. Chamar o service
      const projetos = await this.projectService.listProjects(idConstrutor);

      // 3. Retornar 200 OK com lista de projetos
      res.status(200).json({
        status: "success",
        message: "Projetos listados com sucesso.",
        data: projetos.map((projeto) => ({
          id: projeto.idProjeto,
          nomeProjeto: projeto.nomeProjeto,
          responsavel: projeto.construtor.user.nome,
          status: projeto.status,
          ultimaAtualizacao: projeto.updatedAt,
        })),
      });
    } catch (error) {
      // ── Erro ao listar projetos ──────────────────────────────────
      if (error instanceof ProjectCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao listar projetos:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao listar os projetos. Tente novamente mais tarde.",
      });
    }
  };

  /**
   * GET /projects/:id
   * Busca os detalhes completos de um Projeto específico.
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    // 1. Extrair ID do Construtor (usuário logado)
    if (!req.user || !req.user.id) {
      res.status(401).json({
        status: "error",
        message: "Usuário não autenticado. Realize o login primeiro.",
      });
      return;
    }

    const idConstrutor = req.user.id;
    const { id: idProjeto } = req.params;

    try {
      // 2. Chamar o service
      const projeto = await this.projectService.getProjectById(
        idProjeto,
        idConstrutor
      );

      // 3. Formatar resposta amigável para o Front-end
      res.status(200).json({
        status: "success",
        message: "Projeto encontrado com sucesso.",
        data: {
          id: projeto.idProjeto,
          nomeProjeto: projeto.nomeProjeto,
          descricao: projeto.descricao,
          status: projeto.status,
          tipoConstrucao: projeto.tipoConstrucao,
          art: projeto.art,
          endereco: {
            rua: projeto.rua,
            bairro: projeto.bairro,
            numero: projeto.numero,
            complemento: projeto.complemento,
          },
          datas: {
            dataInicio: projeto.dataInicio,
            dataConclusao: projeto.dataConclusao,
            criadoEm: projeto.createdAt,
            ultimaAtualizacao: projeto.updatedAt,
          },
          plantas: projeto.plantas.map((planta:any) => ({
            id: planta.idPlanta,
            tipo: planta.tipoPlanta,
            arquivo: planta.arquivoPlanta,
          })),
          funcionarios: projeto.funcionariosProjeto.map((vínculo:any) => ({
            id: vínculo.funcionario.idFunc,
            nome: vínculo.funcionario.nomeFunc,
            cargo: vínculo.funcionario.cargo,
            dataAlocacao: vínculo.dataAlocacao,
          })),
        },
      });
    } catch (error) {
      // ── Projeto não encontrado ────────────────────────────────────
      if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erro ao buscar projeto ────────────────────────────────────
      if (error instanceof ProjectCreationError) {
        res.status(400).json({
          status: "error",
          message: error.message,
        });
        return;
      }

      // ── Erros inesperados → 500 ──────────────────────────────────
      console.error("[ProjectController] Erro ao buscar projeto:", error);
      res.status(500).json({
        status: "error",
        message: "Ocorreu um erro ao buscar o projeto. Tente novamente mais tarde.",
      });
    }
  };
}
