-- HU20: servicio centralizado de avisos
CREATE TYPE "CategoriaNotificacion" AS ENUM ('PAGOS', 'CALENDARIO', 'RESULTADOS', 'INSCRIPCIONES');
CREATE TYPE "ModuloOrigenNotificacion" AS ENUM ('INSCRIPCIONES', 'CALENDARIO', 'RESULTADOS', 'PAGOS');

ALTER TABLE "notifications"
  ADD COLUMN "category" "CategoriaNotificacion",
  ADD COLUMN "source_module" "ModuloOrigenNotificacion",
  ADD COLUMN "reference" VARCHAR(100),
  ADD COLUMN "event_id" VARCHAR(200),
  ADD COLUMN "is_critical" BOOLEAN NOT NULL DEFAULT false;

-- Idempotencia por evento y destinatario (NULL no colisiona en PostgreSQL).
CREATE UNIQUE INDEX "notifications_event_id_user_id_key" ON "notifications"("event_id", "user_id");
