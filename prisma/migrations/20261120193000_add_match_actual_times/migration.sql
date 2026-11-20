-- HU7 - Horarios reales para el cronometro del encuentro.

ALTER TABLE "matches"
ADD COLUMN "actual_started_at" TIMESTAMP(3),
ADD COLUMN "actual_finished_at" TIMESTAMP(3);