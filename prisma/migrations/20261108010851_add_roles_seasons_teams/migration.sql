-- CreateEnum
CREATE TYPE "Role" AS ENUM ('JUGADOR', 'CAPITAN', 'ARBITRO', 'ORGANIZADOR');

-- CreateEnum
CREATE TYPE "TeamState" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'JUGADOR';

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_start" TIMESTAMP(3) NOT NULL,
    "registration_end" TIMESTAMP(3) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "captain_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "short_name" VARCHAR(12) NOT NULL,
    "status" "TeamState" NOT NULL DEFAULT 'PENDIENTE',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_captain_id_idx" ON "teams"("captain_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_name_key" ON "teams"("season_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_short_name_key" ON "teams"("season_id", "short_name");

-- CreateIndex
CREATE UNIQUE INDEX "teams_season_id_captain_id_key" ON "teams"("season_id", "captain_id");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
