-- Rename "leaf no." terminology to "consignment no." across book and consumption tables.
-- Plain column renames: no data loss, existing rows keep their values.
ALTER TABLE "book" RENAME COLUMN "leaf_no_from" TO "consignment_no_from";
ALTER TABLE "book" RENAME COLUMN "leaf_no_to" TO "consignment_no_to";
ALTER TABLE "consumption" RENAME COLUMN "leaf_no" TO "consignment_no";
