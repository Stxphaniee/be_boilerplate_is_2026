
-- HU7: eventos oficiales y participaciones de jugadores en cada partido.

CREATE TYPE "MatchEventType" AS ENUM (
  'GOL',
  'ASISTENCIA',
  'AMARILLA',
  'ROJA'
);

CREATE TABLE "match_events" (
  "id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "type" "MatchEventType" NOT NULL,
  "minute" INTEGER NOT NULL,
  "related_goal_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "match_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_events_minute_non_negative_check"
    CHECK ("minute" >= 0),
  CONSTRAINT "match_events_assist_goal_check" CHECK (
    ("type" = 'ASISTENCIA' AND "related_goal_id" IS NOT NULL)
    OR
    ("type" <> 'ASISTENCIA' AND "related_goal_id" IS NULL)
  )
);

CREATE TABLE "match_participations" (
  "id" UUID NOT NULL,
  "match_id" UUID NOT NULL,
  "player_id" UUID NOT NULL,
  "participated" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "match_participations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "match_events_match_id_type_idx"
ON "match_events"("match_id", "type");

CREATE INDEX "match_events_player_id_idx"
ON "match_events"("player_id");

CREATE INDEX "match_events_related_goal_id_idx"
ON "match_events"("related_goal_id");

CREATE UNIQUE INDEX "match_participations_match_id_player_id_key"
ON "match_participations"("match_id", "player_id");

CREATE INDEX "match_participations_player_id_idx"
ON "match_participations"("player_id");

ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_match_id_fkey"
FOREIGN KEY ("match_id") REFERENCES "matches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_events"
ADD CONSTRAINT "match_events_related_goal_id_fkey"
FOREIGN KEY ("related_goal_id") REFERENCES "match_events"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_participations"
ADD CONSTRAINT "match_participations_match_id_fkey"
FOREIGN KEY ("match_id") REFERENCES "matches"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_participations"
ADD CONSTRAINT "match_participations_player_id_fkey"
FOREIGN KEY ("player_id") REFERENCES "players"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
