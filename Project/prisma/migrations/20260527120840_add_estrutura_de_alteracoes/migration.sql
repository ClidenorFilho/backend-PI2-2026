-- CreateEnum
CREATE TYPE "ProfileType" AS ENUM ('CONSTRUTOR', 'PROPRIETARIO');

-- CreateEnum
CREATE TYPE "StatusManutencao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusProjeto" AS ENUM ('EM_CONSTRUCAO', 'ENTREGUE', 'DESATIVADO');

-- CreateEnum
CREATE TYPE "AreaAlteracao" AS ENUM ('ARQUITETONICA', 'ESTRUTURAL', 'HIDROSSANITARIA', 'ELETRICA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashSenha" TEXT NOT NULL,
    "profile" "ProfileType" NOT NULL,
    "resetPasswordToken" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "construtor" (
    "id_user" TEXT NOT NULL,
    "crea" TEXT NOT NULL,

    CONSTRAINT "construtor_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "proprietario" (
    "id_user" TEXT NOT NULL,

    CONSTRAINT "proprietario_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "projeto" (
    "id_projeto" TEXT NOT NULL,
    "id_construtor" TEXT NOT NULL,
    "id_proprietario" TEXT,
    "art" TEXT,
    "nome_projeto" TEXT NOT NULL,
    "descricao" TEXT,
    "rua" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_conclusao" TIMESTAMP(3),
    "tipo_construcao" TEXT NOT NULL,
    "status" "StatusProjeto" NOT NULL DEFAULT 'EM_CONSTRUCAO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projeto_pkey" PRIMARY KEY ("id_projeto")
);

-- CreateTable
CREATE TABLE "andar" (
    "id_andar" INTEGER NOT NULL,
    "id_projeto" TEXT NOT NULL,
    "nome_andar" TEXT NOT NULL,

    CONSTRAINT "andar_pkey" PRIMARY KEY ("id_andar","id_projeto")
);

-- CreateTable
CREATE TABLE "comodo" (
    "id_comodo" INTEGER NOT NULL,
    "id_andar" INTEGER NOT NULL,
    "id_projeto" TEXT NOT NULL,
    "nome_comodo" TEXT NOT NULL,

    CONSTRAINT "comodo_pkey" PRIMARY KEY ("id_comodo","id_andar","id_projeto")
);

-- CreateTable
CREATE TABLE "planta" (
    "id_planta" TEXT NOT NULL,
    "id_projeto" TEXT NOT NULL,
    "tipo_planta" TEXT NOT NULL,
    "arquivo_planta" TEXT NOT NULL,

    CONSTRAINT "planta_pkey" PRIMARY KEY ("id_planta")
);

-- CreateTable
CREATE TABLE "funcionario_obra" (
    "id_func" TEXT NOT NULL,
    "nome_func" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,

    CONSTRAINT "funcionario_obra_pkey" PRIMARY KEY ("id_func")
);

-- CreateTable
CREATE TABLE "funcionario_projeto" (
    "id_func" TEXT NOT NULL,
    "id_projeto" TEXT NOT NULL,
    "data_alocacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funcionario_projeto_pkey" PRIMARY KEY ("id_func","id_projeto")
);

-- CreateTable
CREATE TABLE "alteracao" (
    "id_alteracao" TEXT NOT NULL,
    "id_comodo" INTEGER NOT NULL,
    "id_andar" INTEGER NOT NULL,
    "id_projeto_comodo" TEXT NOT NULL,
    "id_planta" TEXT,
    "id_func" TEXT NOT NULL,
    "id_construtor" TEXT NOT NULL,
    "nome_alteracao" TEXT NOT NULL,
    "descricao_alteracao" TEXT NOT NULL,
    "area" "AreaAlteracao" NOT NULL,
    "data_alteracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alteracao_pkey" PRIMARY KEY ("id_alteracao")
);

-- CreateTable
CREATE TABLE "material" (
    "id_material" TEXT NOT NULL,
    "nome_material" TEXT NOT NULL,
    "cor" TEXT,
    "tipo_material" TEXT NOT NULL,
    "tamanho" TEXT,
    "marca" TEXT,
    "descricao_material" TEXT,
    "lote" TEXT,
    "referencia" TEXT,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id_material")
);

-- CreateTable
CREATE TABLE "comodo_material" (
    "id_comodo" INTEGER NOT NULL,
    "id_andar" INTEGER NOT NULL,
    "id_projeto" TEXT NOT NULL,
    "id_material" TEXT NOT NULL,
    "quantidade_usada" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "comodo_material_pkey" PRIMARY KEY ("id_comodo","id_andar","id_projeto","id_material")
);

-- CreateTable
CREATE TABLE "manutencao" (
    "id_manutencao" TEXT NOT NULL,
    "id_material" TEXT NOT NULL,
    "status" "StatusManutencao" NOT NULL DEFAULT 'PENDENTE',
    "descricao_manutencao" TEXT NOT NULL,
    "periodicidade" TEXT,

    CONSTRAINT "manutencao_pkey" PRIMARY KEY ("id_manutencao")
);

-- CreateTable
CREATE TABLE "foto_alteracao" (
    "id_foto" TEXT NOT NULL,
    "id_alteracao" TEXT NOT NULL,
    "url_da_foto" TEXT NOT NULL,

    CONSTRAINT "foto_alteracao_pkey" PRIMARY KEY ("id_foto")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "construtor" ADD CONSTRAINT "construtor_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proprietario" ADD CONSTRAINT "proprietario_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_id_construtor_fkey" FOREIGN KEY ("id_construtor") REFERENCES "construtor"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_id_proprietario_fkey" FOREIGN KEY ("id_proprietario") REFERENCES "proprietario"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "andar" ADD CONSTRAINT "andar_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projeto"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comodo" ADD CONSTRAINT "comodo_id_andar_id_projeto_fkey" FOREIGN KEY ("id_andar", "id_projeto") REFERENCES "andar"("id_andar", "id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planta" ADD CONSTRAINT "planta_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projeto"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionario_projeto" ADD CONSTRAINT "funcionario_projeto_id_func_fkey" FOREIGN KEY ("id_func") REFERENCES "funcionario_obra"("id_func") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionario_projeto" ADD CONSTRAINT "funcionario_projeto_id_projeto_fkey" FOREIGN KEY ("id_projeto") REFERENCES "projeto"("id_projeto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_id_comodo_id_andar_id_projeto_comodo_fkey" FOREIGN KEY ("id_comodo", "id_andar", "id_projeto_comodo") REFERENCES "comodo"("id_comodo", "id_andar", "id_projeto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_id_planta_fkey" FOREIGN KEY ("id_planta") REFERENCES "planta"("id_planta") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_id_func_fkey" FOREIGN KEY ("id_func") REFERENCES "funcionario_obra"("id_func") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_id_construtor_fkey" FOREIGN KEY ("id_construtor") REFERENCES "construtor"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comodo_material" ADD CONSTRAINT "comodo_material_id_comodo_id_andar_id_projeto_fkey" FOREIGN KEY ("id_comodo", "id_andar", "id_projeto") REFERENCES "comodo"("id_comodo", "id_andar", "id_projeto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comodo_material" ADD CONSTRAINT "comodo_material_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "material"("id_material") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencao" ADD CONSTRAINT "manutencao_id_material_fkey" FOREIGN KEY ("id_material") REFERENCES "material"("id_material") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_alteracao" ADD CONSTRAINT "foto_alteracao_id_alteracao_fkey" FOREIGN KEY ("id_alteracao") REFERENCES "alteracao"("id_alteracao") ON DELETE CASCADE ON UPDATE CASCADE;
