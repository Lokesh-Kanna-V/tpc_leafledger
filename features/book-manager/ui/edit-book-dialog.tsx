"use client"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { cn } from "@/shared/lib/utils"
import type { Office } from "@/shared/services/offices.service"
import type { Employee } from "@/shared/services/employees.service"

type EditBookErrors = {
  bookNo?: string
  leafFrom?: string
  leafTo?: string
  employee?: string
  newEmployeeName?: string
  newEmployeeRole?: string
  assignBlocked?: string
}

type EditBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  offices: Office[]
  employeesSortedForAssign: Employee[]
  editBookNo: string
  onEditBookNoChange: (value: string) => void
  editOfficeId: string
  onEditOfficeIdChange: (value: string) => void
  editLeafFrom: string
  onEditLeafFromChange: (value: string) => void
  editLeafTo: string
  onEditLeafToChange: (value: string) => void
  editEmployeeId: string
  onEditEmployeeIdChange: (value: string) => void
  editNewEmployeeName: string
  onEditNewEmployeeNameChange: (value: string) => void
  editNewEmployeeRole: string
  onEditNewEmployeeRoleChange: (value: string) => void
  errors: EditBookErrors
  canEditSave: boolean
  busy: boolean
  editActionError: string | null
  onSave: () => void
}

export function EditBookDialog({
  open,
  onOpenChange,
  offices,
  employeesSortedForAssign,
  editBookNo,
  onEditBookNoChange,
  editOfficeId,
  onEditOfficeIdChange,
  editLeafFrom,
  onEditLeafFromChange,
  editLeafTo,
  onEditLeafToChange,
  editEmployeeId,
  onEditEmployeeIdChange,
  editNewEmployeeName,
  onEditNewEmployeeNameChange,
  editNewEmployeeRole,
  onEditNewEmployeeRoleChange,
  errors,
  canEditSave,
  busy,
  editActionError,
  onSave,
}: EditBookDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
          <DialogDescription>
            Update the office and leaf range for this book, and optionally
            assign it to an employee.
          </DialogDescription>
        </DialogHeader>

        {editActionError ? (
          <p className="text-sm text-destructive" role="alert">
            {editActionError}
          </p>
        ) : null}

        <FieldGroup>
          <Field data-invalid={!!errors.bookNo}>
            <FieldLabel htmlFor="edit-book-no">Book No</FieldLabel>
            <FieldContent>
              <Input
                id="edit-book-no"
                value={editBookNo}
                onChange={(e) => onEditBookNoChange(e.target.value)}
                aria-invalid={!!errors.bookNo}
                autoComplete="off"
              />
              <FieldError
                errors={errors.bookNo ? [{ message: errors.bookNo }] : []}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-book-office">Office</FieldLabel>
            <FieldContent>
              <select
                id="edit-book-office"
                className={cn(
                  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                )}
                value={editOfficeId}
                onChange={(e) => onEditOfficeIdChange(e.target.value)}
              >
                <option value="">No office</option>
                {offices.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
            </FieldContent>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.leafFrom}>
              <FieldLabel htmlFor="edit-leaf-from">
                Consignment no. from
              </FieldLabel>
              <FieldContent>
                <Input
                  id="edit-leaf-from"
                  inputMode="numeric"
                  value={editLeafFrom}
                  onChange={(e) => onEditLeafFromChange(e.target.value)}
                  placeholder="1"
                  aria-invalid={!!errors.leafFrom}
                />
                <FieldError
                  errors={errors.leafFrom ? [{ message: errors.leafFrom }] : []}
                />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.leafTo}>
              <FieldLabel htmlFor="edit-leaf-to">Consignment no. to</FieldLabel>
              <FieldContent>
                <Input
                  id="edit-leaf-to"
                  inputMode="numeric"
                  value={editLeafTo}
                  onChange={(e) => onEditLeafToChange(e.target.value)}
                  placeholder="50"
                  aria-invalid={!!errors.leafTo}
                />
                <FieldError
                  errors={errors.leafTo ? [{ message: errors.leafTo }] : []}
                />
              </FieldContent>
            </Field>
          </div>

          <Field data-invalid={!!errors.employee}>
            <FieldLabel htmlFor="edit-employee">
              Assign to{" "}
              <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <select
                id="edit-employee"
                className={cn(
                  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                )}
                value={editEmployeeId}
                onChange={(e) => onEditEmployeeIdChange(e.target.value)}
                aria-invalid={!!errors.employee}
              >
                <option value="">No change</option>
                {employeesSortedForAssign.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name}
                  </option>
                ))}
                {/* <option value="__new__">+ Add new employee…</option> */}
              </select>
              <FieldDescription>
                Assigns this book&rsquo;s remaining unaccounted leaves to the
                selected employee.
              </FieldDescription>
              <FieldError
                errors={errors.employee ? [{ message: errors.employee }] : []}
              />
            </FieldContent>
          </Field>

          {editEmployeeId === "__new__" ? (
            <>
              <Field data-invalid={!!errors.newEmployeeName}>
                <FieldLabel htmlFor="edit-new-emp-name">
                  New employee name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-new-emp-name"
                    value={editNewEmployeeName}
                    onChange={(e) =>
                      onEditNewEmployeeNameChange(e.target.value)
                    }
                    placeholder="Full name"
                    autoComplete="off"
                    aria-invalid={!!errors.newEmployeeName}
                  />
                  <FieldError
                    errors={
                      errors.newEmployeeName
                        ? [{ message: errors.newEmployeeName }]
                        : []
                    }
                  />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.newEmployeeRole}>
                <FieldLabel htmlFor="edit-new-emp-role">Role</FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-new-emp-role"
                    value={editNewEmployeeRole}
                    onChange={(e) =>
                      onEditNewEmployeeRoleChange(e.target.value)
                    }
                    autoComplete="off"
                    aria-invalid={!!errors.newEmployeeRole}
                  />
                  <FieldError
                    errors={
                      errors.newEmployeeRole
                        ? [{ message: errors.newEmployeeRole }]
                        : []
                    }
                  />
                </FieldContent>
              </Field>
            </>
          ) : null}

          {errors.assignBlocked ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.assignBlocked}
            </p>
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
            disabled={!canEditSave}
            loading={busy}
            onClick={onSave}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
