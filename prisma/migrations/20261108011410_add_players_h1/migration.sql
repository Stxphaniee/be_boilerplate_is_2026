/*
  Warnings:

  - The values [PENDIENTE] on the enum `TeamState` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `short_name` on the `teams` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `teams` table. The data in that column could be lost. The data in that column will be cast from `VarChar(80)` to `VarChar(50)`.

*/
-- CreateEnum
CREATE TYPE "Position" AS ENUM ('PORTERO', 'DEFENSA', 'MEDIOCAMPISTA', 'DELANTERO');

-- AlterEnum
BEGIN;
CREATE TYPE "TeamState_new" AS ENUM ('PENDIENTE_VALIDACION', 'APROBADO', 'RECHAZADO');
ALTER TABLE "public"."teams" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "teams" ALTER COLUMN "status" TYPE "TeamState_new" USING ("status"::text::"TeamState_new");
ALTER TYPE "TeamState" RENAME TO "TeamState_old";
ALTER TYPE "TeamState_new" RENAME TO "TeamState";
DROP TYPE "public"."TeamState_old";
ALTER TABLE "teams" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_VALIDACION';
COMMIT;

-- DropIndex
DROP INDEX "teams_season_id_short_name_key";

-- AlterTable
ALTER TABLE "teams" DROP COLUMN "short_name",
ALTER COLUMN "name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "status" SET DEFAULT 'PENDIENTE_VALIDACION';

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID,
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
CREATE UNIQUE INDEX "players_user_id_key" ON "players"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_dui_key" ON "players"("dui");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "players_team_id_jersey_number_key" ON "players"("team_id", "jersey_number");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
