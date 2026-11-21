
-- ==========================================
-- HU2 - VALIDACIÓN DE INSCRIPCIONES
-- ==========================================

BEGIN;

-- ==========================================
-- ENUMS
-- ==========================================

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'VENCIDO'
);

-- CreateEnum
CREATE TYPE "NotificationState" AS ENUM (
    'NO_LEIDA',
    'LEIDA'
);

-- ==========================================
-- SEASONS
-- ==========================================

-- Agregar los períodos de corrección.
-- Inicialmente permitimos NULL porque ya
-- existen temporadas registradas.

ALTER TABLE "seasons"
ADD COLUMN "roster_end" TIMESTAMP(3),
ADD COLUMN "roster_start" TIMESTAMP(3);

-- Asignar fechas a las temporadas existentes.

UPDATE "seasons"
SET
    "roster_start" = TIMESTAMP '2026-11-01 00:00:00',
    "roster_end" = TIMESTAMP '2026-11-30 23:59:59.999'
WHERE "roster_start" IS NULL
   OR "roster_end" IS NULL;

-- Convertir los campos en obligatorios.

ALTER TABLE "seasons"
ALTER COLUMN "roster_start" SET NOT NULL,
ALTER COLUMN "roster_end" SET NOT NULL;

-- ==========================================
-- PAYMENTS
-- ==========================================

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentState" NOT NULL DEFAULT 'PENDIENTE',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- NOTIFICATIONS
-- ==========================================

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "status" "NotificationState" NOT NULL DEFAULT 'NO_LEIDA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- INDEXES - PAYMENTS
-- ==========================================

-- CreateIndex
CREATE UNIQUE INDEX "payments_team_id_key"
ON "payments"("team_id");

-- CreateIndex
CREATE INDEX "payments_status_idx"
ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_due_date_idx"
ON "payments"("due_date");

-- ==========================================
-- INDEXES - NOTIFICATIONS
-- ==========================================

-- CreateIndex
CREATE INDEX "notifications_user_id_idx"
ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx"
ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx"
ON "notifications"("created_at");

-- ==========================================
-- FOREIGN KEYS
-- ==========================================

-- AddForeignKey
ALTER TABLE "payments"
ADD CONSTRAINT "payments_team_id_fkey"
FOREIGN KEY ("team_id")
REFERENCES "teams"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMIT;
