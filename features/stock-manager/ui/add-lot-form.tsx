"use client"

import { Button } from "@/shared/ui/button"
import { Field, FieldContent, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

type AddLotFormProps = {
  busy: boolean
  newLotNumber: string
  onLotNumberChange: (value: string) => void
  newFrom: string
  onFromChange: (value: string) => void
  newTo: string
  onToChange: (value: string) => void
  onAdd: () => void
}

export function AddLotForm({
  busy,
  newLotNumber,
  onLotNumberChange,
  newFrom,
  onFromChange,
  newTo,
  onToChange,
  onAdd,
}: AddLotFormProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="mb-1 text-sm font-medium">Add lot</p>
      <p className="mb-3 text-xs text-muted-foreground">
        One stock book is created for every number in the range (e.g. 1–100
        creates 100 books tagged with this lot).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field className="min-w-[140px] flex-1">
          <FieldLabel htmlFor="lot-new-number">Lot number</FieldLabel>
          <FieldContent>
            <Input
              id="lot-new-number"
              value={newLotNumber}
              onChange={(e) => onLotNumberChange(e.target.value)}
              placeholder="e.g. 1"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field className="min-w-[120px] flex-1">
          <FieldLabel htmlFor="lot-new-from">Book Serial from</FieldLabel>
          <FieldContent>
            <Input
              id="lot-new-from"
              type="number"
              inputMode="numeric"
              value={newFrom}
              onChange={(e) => onFromChange(e.target.value)}
              placeholder="e.g. 1"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Field className="min-w-[120px] flex-1">
          <FieldLabel htmlFor="lot-new-to">Book Serial to</FieldLabel>
          <FieldContent>
            <Input
              id="lot-new-to"
              type="number"
              inputMode="numeric"
              value={newTo}
              onChange={(e) => onToChange(e.target.value)}
              placeholder="e.g. 100"
              autoComplete="off"
            />
          </FieldContent>
        </Field>
        <Button type="button" loading={busy} onClick={onAdd}>
          Add
        </Button>
      </div>
    </div>
  )
}
