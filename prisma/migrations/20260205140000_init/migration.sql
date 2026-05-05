-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('current', 'completed', 'store');

-- CreateTable
CREATE TABLE "offices" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "password" TEXT,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book" (
    "id" SERIAL NOT NULL,
    "office_id" INTEGER NOT NULL,
    "book_number" TEXT NOT NULL,
    "initial_assigned_date" DATE,
    "leaf_no_from" INTEGER NOT NULL,
    "leaf_no_to" INTEGER NOT NULL,
    "book_status" "BookStatus" NOT NULL,

    CONSTRAINT "book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumption" (
    "book_id" INTEGER NOT NULL,
    "leaf_no" TEXT NOT NULL,
    "user_id" INTEGER,
    "assigned_date" DATE NOT NULL,
    "accounted" BOOLEAN NOT NULL DEFAULT false,
    "accounted_date" DATE,

    CONSTRAINT "consumption_pkey" PRIMARY KEY ("book_id","leaf_no")
);

-- CreateIndex
CREATE UNIQUE INDEX "offices_name_key" ON "offices"("name");

-- CreateIndex
CREATE UNIQUE INDEX "book_book_number_key" ON "book"("book_number");

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption" ADD CONSTRAINT "consumption_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumption" ADD CONSTRAINT "consumption_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
