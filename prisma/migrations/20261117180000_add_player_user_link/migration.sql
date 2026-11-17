
-- Add the optional account link required to identify an authenticated player.
ALTER TABLE "players"
ADD COLUMN "user_id" UUID;

-- A user can be linked to only one player record.
CREATE UNIQUE INDEX "players_user_id_key"
ON "players"("user_id");

-- Keep the player record if its user account is deleted.
ALTER TABLE "players"
ADD CONSTRAINT "players_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
