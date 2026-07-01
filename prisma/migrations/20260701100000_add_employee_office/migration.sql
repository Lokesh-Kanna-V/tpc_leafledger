-- CreateTable
CREATE TABLE "employee_office" (
    "employee_id" INTEGER NOT NULL,
    "office_id" INTEGER NOT NULL,

    CONSTRAINT "employee_office_pkey" PRIMARY KEY ("employee_id","office_id")
);

-- AddForeignKey
ALTER TABLE "employee_office" ADD CONSTRAINT "employee_office_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_office" ADD CONSTRAINT "employee_office_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
