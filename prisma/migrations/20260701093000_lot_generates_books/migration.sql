-- Lot no longer references existing books; it declares a numeric book range that generates books.
-- DropForeignKey
ALTER TABLE "lot" DROP CONSTRAINT "lot_book_from_fkey";

-- DropForeignKey
ALTER TABLE "lot" DROP CONSTRAINT "lot_book_to_fkey";

-- AlterTable
ALTER TABLE "lot" ALTER COLUMN "book_from" TYPE INTEGER USING "book_from"::integer;
ALTER TABLE "lot" ALTER COLUMN "book_to" TYPE INTEGER USING "book_to"::integer;

-- Stock books are created without an office or leaf range until they are assigned.
-- AlterTable
ALTER TABLE "book" ALTER COLUMN "office_id" DROP NOT NULL;
ALTER TABLE "book" ALTER COLUMN "leaf_no_from" DROP NOT NULL;
ALTER TABLE "book" ALTER COLUMN "leaf_no_to" DROP NOT NULL;
ALTER TABLE "book" ADD COLUMN "lot_number" TEXT;

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_lot_number_fkey" FOREIGN KEY ("lot_number") REFERENCES "lot"("lot_number") ON DELETE SET NULL ON UPDATE CASCADE;
