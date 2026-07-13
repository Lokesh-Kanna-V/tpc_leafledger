"use client"

import type { RefObject } from "react"

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

type AddBookErrors = {
  bookNo?: string
  leafFrom?: string
  leafTo?: string
  office?: string
  assignee?: string
}

type AddBookDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  keepAddDialogOpenRef: RefObject<boolean>
  offices: Office[]
  bookNo: string
  onBookNoChange: (value: string) => void
  officeId: string
  onOfficeIdChange: (value: string) => void
  leafFrom: string
  onLeafFromChange: (value: string) => void
  leafTo: string
  onLeafToChange: (value: string) => void
  assignedTo: string
  onAssignedToChange: (value: string) => void
  assignedToOptions: string[]
  errors: AddBookErrors
  leafCountLabel: string
  canAdd: boolean
  busy: boolean
  addActionError: string | null
  onAddActionErrorClear: () => void
  onAddAndClose: () => void
  onAddMore: () => void
}

export function AddBookDialog({
  open,
  onOpenChange,
  keepAddDialogOpenRef,
  offices,
  bookNo,
  onBookNoChange,
  officeId,
  onOfficeIdChange,
  leafFrom,
  onLeafFromChange,
  leafTo,
  onLeafToChange,
  assignedTo,
  onAssignedToChange,
  assignedToOptions,
  errors,
  leafCountLabel,
  canAdd,
  busy,
  addActionError,
  onAddActionErrorClear,
  onAddAndClose,
  onAddMore,
}: AddBookDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && keepAddDialogOpenRef.current) {
          keepAddDialogOpenRef.current = false
          onOpenChange(true)
          return
        }
        onOpenChange(o)
        if (o) onAddActionErrorClear()
      }}
    >
      {/* <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Add Books"
            >
              <PlusIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add Books</p>
        </TooltipContent>
      </Tooltip> */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new book</DialogTitle>
          <DialogDescription>
            Enter the leaf range. Leaf count cannot exceed <b>50</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <div className="text-sm font-medium">Leaf count</div>
          <div
            className="rounded-md border bg-background px-2 py-0.5 text-sm font-semibold tabular-nums"
            aria-live="polite"
          >
            {leafCountLabel}
          </div>
        </div>

        {addActionError ? (
          <p className="text-sm text-destructive" role="alert">
            {addActionError}
          </p>
        ) : null}

        <FieldGroup>
          <Field data-invalid={!!errors.bookNo}>
            <FieldLabel htmlFor="book-no">Book No</FieldLabel>
            <FieldContent>
              <Input
                id="book-no"
                value={bookNo}
                onChange={(e) => onBookNoChange(e.target.value)}
                aria-invalid={!!errors.bookNo}
                autoComplete="off"
              />
              <FieldError
                errors={errors.bookNo ? [{ message: errors.bookNo }] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.office}>
            <FieldLabel htmlFor="add-book-office">Office</FieldLabel>
            <FieldContent>
              <select
                id="add-book-office"
                className={cn(
                  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                )}
                value={officeId}
                onChange={(e) => onOfficeIdChange(e.target.value)}
                aria-invalid={!!errors.office}
              >
                <option value="">Select an office</option>
                {offices.map((o) => (
                  <option key={o.id} value={String(o.id)}>
                    {o.name}
                  </option>
                ))}
              </select>
              <FieldError
                errors={errors.office ? [{ message: errors.office }] : []}
              />
            </FieldContent>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.leafFrom}>
              <FieldLabel htmlFor="leaf-from">Consignment no. from</FieldLabel>
              <FieldContent>
                <Input
                  id="leaf-from"
                  inputMode="numeric"
                  value={leafFrom}
                  onChange={(e) => onLeafFromChange(e.target.value)}
                  placeholder="1"
                  aria-invalid={!!errors.leafFrom}
                />
                <FieldError
                  errors={
                    errors.leafFrom ? [{ message: errors.leafFrom }] : []
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.leafTo}>
              <FieldLabel htmlFor="leaf-to">Consignment no. to</FieldLabel>
              <FieldContent>
                <Input
                  id="leaf-to"
                  inputMode="numeric"
                  value={leafTo}
                  onChange={(e) => onLeafToChange(e.target.value)}
                  placeholder="50"
                  aria-invalid={!!errors.leafTo}
                />
                <FieldError
                  errors={errors.leafTo ? [{ message: errors.leafTo }] : []}
                />
              </FieldContent>
            </Field>
          </div>

          <Field data-invalid={!!errors.assignee}>
            <FieldLabel htmlFor="assigned-to">
              Assigned to{" "}
              <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="assigned-to"
                value={assignedTo}
                onChange={(e) => onAssignedToChange(e.target.value)}
                placeholder="Employee name"
                list="add-assigned-to-options"
                autoComplete="off"
                aria-invalid={!!errors.assignee}
              />
              <datalist id="add-assigned-to-options">
                {assignedToOptions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
              <FieldDescription>
                Must match a name from Employees. Leave empty to assign
                later.
              </FieldDescription>
              <FieldError
                errors={errors.assignee ? [{ message: errors.assignee }] : []}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-1 items-center justify-between gap-2 sm:justify-start">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Close
              </Button>
            </DialogClose>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!canAdd}
              loading={busy}
              onClick={onAddAndClose}
            >
              Add and close
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canAdd}
              loading={busy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAddMore()
              }}
            >
              Add more
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
