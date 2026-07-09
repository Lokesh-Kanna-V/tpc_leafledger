"use client"

import { UsersIcon } from "lucide-react"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import type { Office } from "@/shared/services/offices.service"
import type { Employee } from "@/shared/services/employees.service"
import type { Book } from "../services/books.service"

type BulkFormErrors = {
  bookFrom?: string
  bookTo?: string
  office?: string
  employee?: string
  newEmployeeName?: string
  newEmployeeRole?: string
}

type BulkLeafErrors = { leafFrom?: string; leafTo?: string }

type BulkAssignDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  offices: Office[]
  employeesSortedForAssign: Employee[]
  bulkStep: "form" | "leaf"
  bulkBookFrom: string
  onBulkBookFromChange: (value: string) => void
  bulkBookTo: string
  onBulkBookToChange: (value: string) => void
  bulkOfficeId: string
  onBulkOfficeIdChange: (value: string) => void
  bulkEmployeeId: string
  onBulkEmployeeIdChange: (value: string) => void
  bulkNewEmployeeName: string
  onBulkNewEmployeeNameChange: (value: string) => void
  bulkNewEmployeeRole: string
  onBulkNewEmployeeRoleChange: (value: string) => void
  bulkActionError: string | null
  bulkResultMessage: string | null
  bulkFormErrors: BulkFormErrors
  canStartBulk: boolean
  bulkCurrentLeafBook: Book | undefined
  bulkLeafTotal: number
  bulkPendingLeafBookIdsCount: number
  bulkLeafFrom: string
  onBulkLeafFromChange: (value: string) => void
  bulkLeafTo: string
  onBulkLeafToChange: (value: string) => void
  bulkLeafErrors: BulkLeafErrors
  canSaveBulkLeafRange: boolean
  busy: boolean
  onNext: () => void
  onSaveLeafRange: () => void
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  offices,
  employeesSortedForAssign,
  bulkStep,
  bulkBookFrom,
  onBulkBookFromChange,
  bulkBookTo,
  onBulkBookToChange,
  bulkOfficeId,
  onBulkOfficeIdChange,
  bulkEmployeeId,
  onBulkEmployeeIdChange,
  bulkNewEmployeeName,
  onBulkNewEmployeeNameChange,
  bulkNewEmployeeRole,
  onBulkNewEmployeeRoleChange,
  bulkActionError,
  bulkResultMessage,
  bulkFormErrors,
  canStartBulk,
  bulkCurrentLeafBook,
  bulkLeafTotal,
  bulkPendingLeafBookIdsCount,
  bulkLeafFrom,
  onBulkLeafFromChange,
  bulkLeafTo,
  onBulkLeafToChange,
  bulkLeafErrors,
  canSaveBulkLeafRange,
  busy,
  onNext,
  onSaveLeafRange,
}: BulkAssignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Bulk Assign Books"
            >
              <UsersIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Bulk Assign Books</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        {bulkStep === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Bulk assign books</DialogTitle>
              <DialogDescription>
                Assign an office (and optionally an employee) to every book
                numbered in this range for {new Date().getFullYear()}. Books
                without a leaf range yet will ask for one first.
              </DialogDescription>
            </DialogHeader>

            {bulkActionError ? (
              <p
                className="rounded-xl bg-red-900 text-sm text-destructive text-gray-100"
                role="alert"
              >
                {bulkActionError}
              </p>
            ) : null}
            {bulkResultMessage ? (
              <p
                className="rounded-xl bg-green-800 p-2 text-sm text-gray-100"
                role="status"
              >
                {bulkResultMessage}
              </p>
            ) : null}

            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!bulkFormErrors.bookFrom}>
                  <FieldLabel htmlFor="bulk-book-from">
                    Book Serial from
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="bulk-book-from"
                      inputMode="numeric"
                      value={bulkBookFrom}
                      onChange={(e) => onBulkBookFromChange(e.target.value)}
                      placeholder="1"
                      aria-invalid={!!bulkFormErrors.bookFrom}
                    />
                    <FieldError
                      errors={
                        bulkFormErrors.bookFrom
                          ? [{ message: bulkFormErrors.bookFrom }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!bulkFormErrors.bookTo}>
                  <FieldLabel htmlFor="bulk-book-to">Book Serial to</FieldLabel>
                  <FieldContent>
                    <Input
                      id="bulk-book-to"
                      inputMode="numeric"
                      value={bulkBookTo}
                      onChange={(e) => onBulkBookToChange(e.target.value)}
                      placeholder="50"
                      aria-invalid={!!bulkFormErrors.bookTo}
                    />
                    <FieldError
                      errors={
                        bulkFormErrors.bookTo
                          ? [{ message: bulkFormErrors.bookTo }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>
              </div>

              <Field data-invalid={!!bulkFormErrors.office}>
                <FieldLabel htmlFor="bulk-office">Office</FieldLabel>
                <FieldContent>
                  <select
                    id="bulk-office"
                    className={cn(
                      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                    )}
                    value={bulkOfficeId}
                    onChange={(e) => onBulkOfficeIdChange(e.target.value)}
                    aria-invalid={!!bulkFormErrors.office}
                  >
                    <option value="">Select an office</option>
                    {offices.map((o) => (
                      <option key={o.id} value={String(o.id)}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    errors={
                      bulkFormErrors.office
                        ? [{ message: bulkFormErrors.office }]
                        : []
                    }
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={!!bulkFormErrors.employee}>
                <FieldLabel htmlFor="bulk-employee">
                  Assign to{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <FieldContent>
                  <select
                    id="bulk-employee"
                    className={cn(
                      "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                    )}
                    value={bulkEmployeeId}
                    onChange={(e) => onBulkEmployeeIdChange(e.target.value)}
                    aria-invalid={!!bulkFormErrors.employee}
                  >
                    <option value="">No change</option>
                    {employeesSortedForAssign.map((emp) => (
                      <option key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                    <option value="__new__">+ Add new employee…</option>
                  </select>
                  <FieldError
                    errors={
                      bulkFormErrors.employee
                        ? [{ message: bulkFormErrors.employee }]
                        : []
                    }
                  />
                </FieldContent>
              </Field>

              {bulkEmployeeId === "__new__" ? (
                <>
                  <Field data-invalid={!!bulkFormErrors.newEmployeeName}>
                    <FieldLabel htmlFor="bulk-new-emp-name">
                      New employee name
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="bulk-new-emp-name"
                        value={bulkNewEmployeeName}
                        onChange={(e) =>
                          onBulkNewEmployeeNameChange(e.target.value)
                        }
                        placeholder="Full name"
                        autoComplete="off"
                        aria-invalid={!!bulkFormErrors.newEmployeeName}
                      />
                      <FieldError
                        errors={
                          bulkFormErrors.newEmployeeName
                            ? [{ message: bulkFormErrors.newEmployeeName }]
                            : []
                        }
                      />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!bulkFormErrors.newEmployeeRole}>
                    <FieldLabel htmlFor="bulk-new-emp-role">Role</FieldLabel>
                    <FieldContent>
                      <Input
                        id="bulk-new-emp-role"
                        value={bulkNewEmployeeRole}
                        onChange={(e) =>
                          onBulkNewEmployeeRoleChange(e.target.value)
                        }
                        autoComplete="off"
                        aria-invalid={!!bulkFormErrors.newEmployeeRole}
                      />
                      <FieldDescription>
                        They will be saved to Employees and assigned to these
                        books.
                      </FieldDescription>
                      <FieldError
                        errors={
                          bulkFormErrors.newEmployeeRole
                            ? [{ message: bulkFormErrors.newEmployeeRole }]
                            : []
                        }
                      />
                    </FieldContent>
                  </Field>
                </>
              ) : null}
            </FieldGroup>

            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={!canStartBulk || busy}
                onClick={onNext}
              >
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Set leaf range for{" "}
                <strong> Book {bulkCurrentLeafBook?.book_number ?? ""}</strong>
              </DialogTitle>
              <DialogDescription>
                Book {bulkCurrentLeafBook?.book_number ?? ""} doesn&rsquo;t have
                a leaf range yet. Enter one to continue (
                {bulkLeafTotal - bulkPendingLeafBookIdsCount + 1} of{" "}
                {bulkLeafTotal}).
              </DialogDescription>
            </DialogHeader>

            {bulkActionError ? (
              <p className="text-sm text-destructive" role="alert">
                {bulkActionError}
              </p>
            ) : null}

            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field data-invalid={!!bulkLeafErrors.leafFrom}>
                  <FieldLabel htmlFor="bulk-leaf-from">
                    Consignment no. from
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="bulk-leaf-from"
                      inputMode="numeric"
                      value={bulkLeafFrom}
                      onChange={(e) => onBulkLeafFromChange(e.target.value)}
                      placeholder="1"
                      aria-invalid={!!bulkLeafErrors.leafFrom}
                    />
                    <FieldError
                      errors={
                        bulkLeafErrors.leafFrom
                          ? [{ message: bulkLeafErrors.leafFrom }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!bulkLeafErrors.leafTo}>
                  <FieldLabel htmlFor="bulk-leaf-to">
                    Consignment no. to
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="bulk-leaf-to"
                      inputMode="numeric"
                      value={bulkLeafTo}
                      onChange={(e) => onBulkLeafToChange(e.target.value)}
                      placeholder="50"
                      aria-invalid={!!bulkLeafErrors.leafTo}
                    />
                    <FieldError
                      errors={
                        bulkLeafErrors.leafTo
                          ? [{ message: bulkLeafErrors.leafTo }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <DialogFooter className="sm:justify-between">
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="button"
                disabled={!canSaveBulkLeafRange || busy}
                onClick={onSaveLeafRange}
              >
                Next
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
