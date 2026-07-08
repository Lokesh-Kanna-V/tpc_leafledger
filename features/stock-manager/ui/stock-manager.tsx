"use client"

import { cn } from "@/shared/lib/utils"
import { MONTH_OPTIONS } from "@/shared/config/constants"
import type { Lot } from "../services/lots.service"
import { useStockManager } from "../hooks/use-stock-manager"
import { AddLotForm } from "./add-lot-form"
import { LotsTable } from "./lots-table"
import { EditLotDialog } from "./edit-lot-dialog"

type StockManagerProps = {
  lots: Lot[]
  onReload: () => Promise<void>
}

export default function StockManager({ lots, onReload }: StockManagerProps) {
  const {
    busy,
    error,
    newLotNumber,
    setNewLotNumber,
    newFrom,
    setNewFrom,
    newTo,
    setNewTo,
    editOpen,
    setEditOpen,
    editLotNumber,
    setEditLotNumber,
    yearFilter,
    setYearFilter,
    monthFilter,
    setMonthFilter,
    lotYearOptions,
    visibleLots,
    handleAdd,
    openEdit,
    handleSaveEdit,
    handleDelete,
  } = useStockManager(lots, onReload)

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <AddLotForm
        busy={busy}
        newLotNumber={newLotNumber}
        onLotNumberChange={setNewLotNumber}
        newFrom={newFrom}
        onFromChange={setNewFrom}
        newTo={newTo}
        onToChange={setNewTo}
        onAdd={() => void handleAdd()}
      />

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

      <LotsTable
        lots={lots}
        visibleLots={visibleLots}
        busy={busy}
        onEdit={openEdit}
        onDelete={(id) => void handleDelete(id)}
      />

      <EditLotDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        busy={busy}
        editLotNumber={editLotNumber}
        onLotNumberChange={setEditLotNumber}
        onSave={() => void handleSaveEdit()}
      />
    </div>
  )
}
