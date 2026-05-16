// src/app.ts
// ─────────────────────────────────────────────────────────────────
// Configuração do Express: middlewares globais, rotas e handler 404.
// Exportado separadamente do server.ts para facilitar testes.
// ─────────────────────────────────────────────────────────────────

import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import swaggerUi from 'swagger-ui-express';
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import { swaggerSpec } from "./config/swaggerConfig";
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

// ── Swagger/API Docs ───────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

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
app.use((err: Error & { code?: string }, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[GlobalErrorHandler]", err);

  // Erros do Multer (ex.: arquivo maior que o limite)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ status: "error", message: "Arquivo excede o tamanho máximo permitido (5MB)." });
    }
    return res.status(400).json({ status: "error", message: err.message || "Erro no upload de arquivo." });
  }

  // Erro de tipo de arquivo definido no fileFilter
  if (err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ status: "error", message: err.message || "Arquivo inválido. Somente PDFs permitidos." });
  }

  res.status(500).json({
    status: "error",
    message: "Erro interno do servidor.",
  });
});

export default app;
