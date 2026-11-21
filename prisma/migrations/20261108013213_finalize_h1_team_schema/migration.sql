/*
  Warnings:

  - The values [PENDIENTE_VALIDACION] on the enum `TeamState` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `players` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[season_id,short_name]` on the table `teams` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `short_name` to the `teams` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TeamState_new" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
ALTER TABLE "public"."teams" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "teams" ALTER COLUMN "status" TYPE "TeamState_new" USING ("status"::text::"TeamState_new");
ALTER TYPE "TeamState" RENAME TO "TeamState_old";
ALTER TYPE "TeamState_new" RENAME TO "TeamState";
DROP TYPE "public"."TeamState_old";
ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_team_id_fkey";

-- DropForeignKey
ALTER TABLE "players" DROP CONSTRAINT "players_user_id_fkey";

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "short_name" VARCHAR(12) NOT NULL,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "status" SET DEFAULT 'PENDIENTE';

-- DropTable
DROP TABLE "players";

-- DropEnum
DROP TYPE "Position";

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_short_name_key" ON "teams"("season_id", "short_name");
