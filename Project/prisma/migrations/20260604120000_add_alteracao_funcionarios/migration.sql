-- CreateTable
CREATE TABLE "alteracao_funcionario" (
    "id_alteracao" TEXT NOT NULL,
    "id_func" TEXT NOT NULL,

    CONSTRAINT "alteracao_funcionario_pkey" PRIMARY KEY ("id_alteracao","id_func")
);

-- AddForeignKey
ALTER TABLE "alteracao_funcionario" ADD CONSTRAINT "alteracao_funcionario_id_alteracao_fkey" FOREIGN KEY ("id_alteracao") REFERENCES "alteracao"("id_alteracao") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracao_funcionario" ADD CONSTRAINT "alteracao_funcionario_id_func_fkey" FOREIGN KEY ("id_func") REFERENCES "funcionario_obra"("id_func") ON DELETE CASCADE ON UPDATE CASCADE;