-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ACCOUNTING_OVERDUE');

-- CreateTable
CREATE TABLE "alert" (
    "id" SERIAL NOT NULL,
    "type" "AlertType" NOT NULL,
    "book_id" INTEGER,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_type_book_id_key" ON "alert"("type", "book_id");

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

