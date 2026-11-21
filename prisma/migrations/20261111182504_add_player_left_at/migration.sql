-- AlterTable
ALTER TABLE "players" ADD COLUMN     "left_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "seasons" ALTER COLUMN "roster_end" DROP NOT NULL,
ALTER COLUMN "roster_start" DROP NOT NULL;
