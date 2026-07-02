"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Lot } from "@/lib/api/lots"
import { createLot, deleteLot, updateLot } from "@/lib/api/lots"
import { cn } from "@/lib/utils"

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

type StockManagerProps = {
  lots: Lot[]
  onReload: () => Promise<void>
}

// created_at is a timestamp; display as DD/MM/YYYY.
function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  return `${day}/${month}/${year}`
}

export default function StockManager({
  lots,
  onReload,
}: StockManagerProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newLotNumber, setNewLotNumber] = useState("")
  const [newFrom, setNewFrom] = useState("")
  const [newTo, setNewTo] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editLotNumber, setEditLotNumber] = useState("")

  const [yearFilter, setYearFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")

  const lotYearOptions = useMemo(() => {
    const years = new Set<string>()
    for (const lot of lots) years.add(lot.created_at.slice(0, 4))
    return [...years].sort((a, b) => b.localeCompare(a))
  }, [lots])

  const visibleLots = useMemo(() => {
    let rows = lots
    if (yearFilter !== "all") {
      rows = rows.filter((lot) => lot.created_at.slice(0, 4) === yearFilter)
    }
    if (monthFilter !== "all") {
      rows = rows.filter((lot) => lot.created_at.slice(5, 7) === monthFilter)
    }
    return rows
  }, [lots, yearFilter, monthFilter])

  async function handleAdd() {
    const lot_number = newLotNumber.trim()
    const book_from = Number.parseInt(newFrom.trim(), 10)
    const book_to = Number.parseInt(newTo.trim(), 10)
    if (!lot_number) {
      setError("Lot number is required.")
      return
    }
    if (!Number.isInteger(book_from) || !Number.isInteger(book_to)) {
      setError("Book from and book to must be whole numbers.")
      return
    }
    if (book_to < book_from) {
      setError("Book to must be greater than or equal to book from.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createLot({ lot_number, book_from, book_to })
      setNewLotNumber("")
      setNewFrom("")
      setNewTo("")
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lot")
    } finally {
      setBusy(false)
    }
  }

  function openEdit(lot: Lot) {
    setEditId(lot.id)
    setEditLotNumber(lot.lot_number)
    setEditOpen(true)
    setError(null)
  }

  async function handleSaveEdit() {
    if (editId === null) return
    const lot_number = editLotNumber.trim()
    if (!lot_number) {
      setError("Lot number is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateLot(editId, { lot_number })
      setEditOpen(false)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lot")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    setBusy(true)
    setError(null)
    try {
      await deleteLot(id)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lot")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

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
                onChange={(e) => setNewLotNumber(e.target.value)}
                placeholder="e.g. 1"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field className="min-w-[120px] flex-1">
            <FieldLabel htmlFor="lot-new-from">Book from</FieldLabel>
            <FieldContent>
              <Input
                id="lot-new-from"
                type="number"
                inputMode="numeric"
                value={newFrom}
                onChange={(e) => setNewFrom(e.target.value)}
                placeholder="e.g. 1"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field className="min-w-[120px] flex-1">
            <FieldLabel htmlFor="lot-new-to">Book to</FieldLabel>
            <FieldContent>
              <Input
                id="lot-new-to"
                type="number"
                inputMode="numeric"
                value={newTo}
                onChange={(e) => setNewTo(e.target.value)}
                placeholder="e.g. 100"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Button type="button" disabled={busy} onClick={() => void handleAdd()}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filter by year"
          className={cn(
            "h-8 w-auto min-w-27.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
          )}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="all">All years</option>
          {lotYearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by month"
          className={cn(
            "h-8 w-auto min-w-32.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
          )}
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        >
          <option value="all">All months</option>
          {MONTH_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Lot number</TableHead>
            <TableHead>Book from</TableHead>
            <TableHead>Book to</TableHead>
            <TableHead className="text-right">Books</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleLots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                {lots.length === 0
                  ? "No lots yet. Add one above."
                  : "No lots match this view."}
              </TableCell>
            </TableRow>
          ) : (
            visibleLots.map((lot) => (
              <TableRow key={lot.id}>
                <TableCell className="font-medium tabular-nums">
                  {lot.id}
                </TableCell>
                <TableCell>{lot.lot_number}</TableCell>
                <TableCell className="tabular-nums">{lot.book_from}</TableCell>
                <TableCell className="tabular-nums">{lot.book_to}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {lot.book_to - lot.book_from + 1}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(lot.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(lot)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(lot.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
                  onChange={(e) => setEditLotNumber(e.target.value)}
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
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleSaveEdit()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
