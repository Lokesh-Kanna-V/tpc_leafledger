-- Create enum type used by Prisma for Book.book_status
DO $$ BEGIN
  CREATE TYPE "BookStatus" AS ENUM ('current', 'completed', 'store');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Convert existing varchar column to enum
ALTER TABLE "book"
  ALTER COLUMN "book_status" TYPE "BookStatus"
  USING ("book_status"::"BookStatus");

