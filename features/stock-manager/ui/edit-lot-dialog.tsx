"use client"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

type EditLotDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy: boolean
  editLotNumber: string
  onLotNumberChange: (value: string) => void
  onSave: () => void
}

export function EditLotDialog({
  open,
  onOpenChange,
  busy,
  editLotNumber,
  onLotNumberChange,
  onSave,
}: EditLotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lot</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="lot-edit-number">Lot number</FieldLabel>
            <FieldContent>
              <Input
                id="lot-edit-number"
                value={editLotNumber}
                onChange={(e) => onLotNumberChange(e.target.value)}
                autoComplete="off"
              />
              <FieldDescription>
                The book range for this lot can&apos;t be changed here since
                its books already exist.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
        <DialogFooter className="gap-2 sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" loading={busy} onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
