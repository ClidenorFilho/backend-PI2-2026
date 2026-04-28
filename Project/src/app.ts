// src/app.ts
// ─────────────────────────────────────────────────────────────────
// Configuração do Express: middlewares globais, rotas e handler 404.
// Exportado separadamente do server.ts para facilitar testes.
// ─────────────────────────────────────────────────────────────────

import express, { Request, Response, NextFunction } from "express";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import cors from 'cors';

const app = express();

// ── Middlewares globais ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Rotas de domínio ──────────────────────────────────────────────
app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);

// ── 404 – rota não encontrada ─────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Rota não encontrada.",
  });
});

// ── Handler global de erros ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[GlobalErrorHandler]", err);
  res.status(500).json({
    status: "error",
    message: "Erro interno do servidor.",
  });
});

export default app;
