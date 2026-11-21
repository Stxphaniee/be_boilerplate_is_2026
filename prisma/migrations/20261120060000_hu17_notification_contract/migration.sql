-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('PAGOS', 'CALENDARIO', 'RESULTADOS', 'INSCRIPCIONES');

-- CreateEnum
CREATE TYPE "NotificationSourceModule" AS ENUM ('INSCRIPCIONES', 'CALENDARIO', 'RESULTADOS', 'PAGOS');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "category" "NotificationCategory" NOT NULL DEFAULT 'INSCRIPCIONES',
ADD COLUMN "event_id" VARCHAR(150),
ADD COLUMN "is_critical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reference" VARCHAR(100),
ADD COLUMN "source_module" "NotificationSourceModule" NOT NULL DEFAULT 'INSCRIPCIONES';

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_id_user_id_key" ON "notifications"("event_id", "user_id");

-- Backfill de avisos legados (H7) a su categoria correcta.
UPDATE notifications SET category = 'RESULTADOS', source_module = 'RESULTADOS' WHERE title LIKE 'Resultado%';
