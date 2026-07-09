-- Deleting a lot now deletes the books it generated (previously it only
-- cleared their lot_number, orphaning them). Books already cascade-delete
-- their consumption rows and alerts, so this also removes their leaves.
ALTER TABLE "book" DROP CONSTRAINT "book_lot_number_fkey";
ALTER TABLE "book" ADD CONSTRAINT "book_lot_number_fkey" FOREIGN KEY ("lot_number") REFERENCES "lot"("lot_number") ON DELETE CASCADE ON UPDATE CASCADE;
