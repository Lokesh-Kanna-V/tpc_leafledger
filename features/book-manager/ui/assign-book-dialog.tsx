"use client"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
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
import type { Employee } from "@/shared/services/employees.service"

type AssignBookErrors = {
  bookNo?: string
  employee?: string
  newEmployeeName?: string
  newEmployeeRole?: string
  leafFrom?: string
  assignBlocked?: string
}

type AssignBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookNoOptions: string[]
  employeesSortedForAssign: Employee[]
  assignBookNo: string
  onAssignBookNoChange: (value: string) => void
  assignEmployeeId: string
  onAssignEmployeeIdChange: (value: string) => void
  assignNewEmployeeName: string
  onAssignNewEmployeeNameChange: (value: string) => void
  assignNewEmployeeRole: string
  onAssignNewEmployeeRoleChange: (value: string) => void
  assignNewBook: boolean
  onAssignNewBookChange: (value: boolean) => void
  assignLeafFrom: string
  onAssignLeafFromChange: (value: string) => void
  errors: AssignBookErrors
  canAssign: boolean
  busy: boolean
  assignActionError: string | null
  onClearError: () => void
  onAssignAndClose: () => void
  onAssignMore: () => void
}

export function AssignBookDialog({
  open,
  onOpenChange,
  bookNoOptions,
  employeesSortedForAssign,
  assignBookNo,
  onAssignBookNoChange,
  assignEmployeeId,
  onAssignEmployeeIdChange,
  assignNewEmployeeName,
  onAssignNewEmployeeNameChange,
  assignNewEmployeeRole,
  onAssignNewEmployeeRoleChange,
  assignNewBook,
  onAssignNewBookChange,
  assignLeafFrom,
  onAssignLeafFromChange,
  errors,
  canAssign,
  busy,
  assignActionError,
  onClearError,
  onAssignAndClose,
  onAssignMore,
}: AssignBookDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) onClearError()
      }}
    >
      {/* <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Assign Books"
            >
              <MinusIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Assign Books</p>
        </TooltipContent>
      </Tooltip> */}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign book</DialogTitle>
          <DialogDescription>
            Pick a book and an employee from the list, or add someone new.
            Optionally change the starting leaf.
          </DialogDescription>
        </DialogHeader>

        {assignActionError ? (
          <p className="text-sm text-destructive" role="alert">
            {assignActionError}
          </p>
        ) : null}

        <FieldGroup>
          <Field data-invalid={!!errors.bookNo}>
            <FieldLabel htmlFor="assign-book-no">Book number</FieldLabel>
            <FieldContent>
              <Input
                id="assign-book-no"
                value={assignBookNo}
                onChange={(e) => onAssignBookNoChange(e.target.value)}
                placeholder="Type to search…"
                list="book-no-options"
                aria-invalid={!!errors.bookNo}
                autoComplete="off"
              />
              <datalist id="book-no-options">
                {bookNoOptions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <FieldError
                errors={errors.bookNo ? [{ message: errors.bookNo }] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.employee}>
            <FieldLabel htmlFor="assign-employee">Assigned to</FieldLabel>
            <FieldContent>
              <select
                id="assign-employee"
                className={cn(
                  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                )}
                value={assignEmployeeId}
                onChange={(e) => onAssignEmployeeIdChange(e.target.value)}
                aria-invalid={!!errors.employee}
              >
                <option value="">Select an employee</option>
                {employeesSortedForAssign.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
                <option value="__new__">+ Add new employee…</option>
              </select>
              <FieldError
                errors={errors.employee ? [{ message: errors.employee }] : []}
              />
            </FieldContent>
          </Field>

          {assignEmployeeId === "__new__" ? (
            <>
              <Field data-invalid={!!errors.newEmployeeName}>
                <FieldLabel htmlFor="assign-new-emp-name">
                  New employee name
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="assign-new-emp-name"
                    value={assignNewEmployeeName}
                    onChange={(e) =>
                      onAssignNewEmployeeNameChange(e.target.value)
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
                <FieldLabel htmlFor="assign-new-emp-role">Role</FieldLabel>
                <FieldContent>
                  <Input
                    id="assign-new-emp-role"
                    value={assignNewEmployeeRole}
                    onChange={(e) =>
                      onAssignNewEmployeeRoleChange(e.target.value)
                    }
                    autoComplete="off"
                    aria-invalid={!!errors.newEmployeeRole}
                  />
                  <FieldDescription>
                    They will be saved to Employees and assigned to this
                    book.
                  </FieldDescription>
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

          <Field className="flex-row items-center">
            <FieldContent>
              <div className="flex items-center gap-2 rounded-sm border-1 border-gray-500">
                <Checkbox
                  id="assign-new-book"
                  checked={assignNewBook}
                  onCheckedChange={(v) => onAssignNewBookChange(v === true)}
                />
              </div>
            </FieldContent>
            <FieldLabel htmlFor="assign-new-book">New book</FieldLabel>
          </Field>

          <Field
            data-invalid={!!errors.leafFrom}
            data-disabled={assignNewBook}
          >
            <FieldLabel htmlFor="assign-leaf-from">Consignment no. from</FieldLabel>
            <FieldContent>
              <Input
                id="assign-leaf-from"
                inputMode="numeric"
                value={assignLeafFrom}
                onChange={(e) => onAssignLeafFromChange(e.target.value)}
                aria-invalid={!!errors.leafFrom}
                disabled={assignNewBook}
              />
              <FieldError
                errors={errors.leafFrom ? [{ message: errors.leafFrom }] : []}
              />
            </FieldContent>
          </Field>

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

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!canAssign}
              loading={busy}
              onClick={onAssignAndClose}
            >
              Assign and close
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canAssign}
              loading={busy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAssignMore()
              }}
            >
              Assign more
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
