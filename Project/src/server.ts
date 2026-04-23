// src/server.ts
// ─────────────────────────────────────────────────────────────────
// Ponto de entrada da aplicação.
// Inicializa o servidor HTTP e gerencia o encerramento gracioso.
// ─────────────────────────────────────────────────────────────────

import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = process.env.PORT ?? 3000;

async function main(): Promise<void> {
  // Testa a conexão com o banco antes de subir o servidor
  await prisma.$connect();
  console.log("✅ Banco de dados conectado.");

  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
    console.log(`👤 Usuários: POST http://localhost:${PORT}/users`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️  ${signal} recebido. Encerrando servidor...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("🔌 Banco de dados desconectado. Até logo!");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch(async (error) => {
  console.error("❌ Falha ao iniciar o servidor:", error);
  await prisma.$disconnect();
  process.exit(1);
});
