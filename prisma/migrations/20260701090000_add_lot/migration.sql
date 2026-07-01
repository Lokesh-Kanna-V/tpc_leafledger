-- CreateTable
CREATE TABLE "lot" (
    "id" SERIAL NOT NULL,
    "lot_number" TEXT NOT NULL,
    "book_from" TEXT NOT NULL,
    "book_to" TEXT NOT NULL,

    CONSTRAINT "lot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lot_lot_number_key" ON "lot"("lot_number");

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_book_from_fkey" FOREIGN KEY ("book_from") REFERENCES "book"("book_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot" ADD CONSTRAINT "lot_book_to_fkey" FOREIGN KEY ("book_to") REFERENCES "book"("book_number") ON DELETE RESTRICT ON UPDATE CASCADE;
