/*
  Warnings:

  - Added the required column `area` to the `material` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AreaMaterial" AS ENUM ('REVESTIMENTOS', 'PINTURAS', 'LOUCAS_E_METAIS', 'LUMINARIAS');

-- AlterTable
ALTER TABLE "comodo_material" ALTER COLUMN "quantidade_usada" SET DEFAULT 1.0;

-- AlterTable
ALTER TABLE "material" ADD COLUMN     "area" "AreaMaterial" NOT NULL,
ALTER COLUMN "tipo_material" DROP NOT NULL;
