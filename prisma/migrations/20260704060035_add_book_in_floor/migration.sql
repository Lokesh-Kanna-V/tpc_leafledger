-- DropForeignKey
ALTER TABLE "book" DROP CONSTRAINT "book_office_id_fkey";

-- AlterTable
ALTER TABLE "book" ADD COLUMN     "in_floor" BOOLEAN NOT NULL DEFAULT false;

-- Existing current-status books are already on the floor.
UPDATE "book" SET "in_floor" = true WHERE "book_status" = 'current';

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
