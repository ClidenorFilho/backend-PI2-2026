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
} from "../services/ProjectService";
import { CreateProjectInput } from "../middlewares/validateCreateProject";
import { AddEmployeeInput } from "../middlewares/validateEmployee";

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
}
