/*
  Warnings:

  - The values [PENDIENTE] on the enum `TeamState` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "Position" AS ENUM ('PORTERO', 'DEFENSA', 'MEDIOCAMPISTA', 'DELANTERO');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMINISTRADOR';

-- AlterEnum
BEGIN;
CREATE TYPE "TeamState_new" AS ENUM ('PENDIENTE_VALIDACION', 'APROBADO', 'RECHAZADO', 'SUSPENDIDO');
ALTER TABLE "public"."teams" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "teams" ALTER COLUMN "status" TYPE "TeamState_new" USING ("status"::text::"TeamState_new");
ALTER TYPE "TeamState" RENAME TO "TeamState_old";
ALTER TYPE "TeamState_new" RENAME TO "TeamState";
DROP TYPE "public"."TeamState_old";
ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_VALIDACION';
COMMIT;

-- AlterTable
ALTER TABLE "seasons" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_VALIDACION';

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "dui" VARCHAR(10) NOT NULL,
    "birth_date" DATE NOT NULL,
    "position" "Position" NOT NULL,
    "jersey_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_dui_key" ON "players"("dui");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_team_id_jersey_number_key" ON "players"("team_id", "jersey_number");

-- CreateIndex
CREATE INDEX "seasons_is_active_idx" ON "seasons"("is_active");

-- CreateIndex
CREATE INDEX "teams_season_id_idx" ON "teams"("season_id");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
