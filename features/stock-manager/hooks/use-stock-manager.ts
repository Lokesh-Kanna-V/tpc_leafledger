"use client"

import { useMemo, useState } from "react"

import {
  ADMIN_CONFIRM_REQUIRED_STATUS,
  ApiError,
} from "@/shared/services/api-client"
import { toast } from "@/shared/hooks/use-toast"
import type { Lot } from "../services/lots.service"
import { createLot, deleteLot, updateLot } from "../services/lots.service"

export function useStockManager(lots: Lot[], onReload: () => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteLot, setPendingDeleteLot] = useState<
    { id: number; lotNumber: string } | null
  >(null)
  const [deleteAdminOpen, setDeleteAdminOpen] = useState(false)
  const [deleteAdminError, setDeleteAdminError] = useState<string | null>(
    null
  )
  const [pendingDeleteLotId, setPendingDeleteLotId] = useState<number | null>(
    null
  )

  const [newLotNumber, setNewLotNumber] = useState("")
  const [newFrom, setNewFrom] = useState("")
  const [newTo, setNewTo] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editLotNumber, setEditLotNumber] = useState("")

  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
  const [monthFilter, setMonthFilter] = useState("all")

  const lotYearOptions = useMemo(() => {
    const years = new Set<string>()
    years.add(String(new Date().getFullYear()))
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
      toast({ title: "Lot created", variant: "success" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add lot"
      setError(message)
      toast({
        title: "Failed to add lot",
        description: message,
        variant: "destructive",
      })
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
      toast({ title: "Lot updated", variant: "success" })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update lot"
      setError(message)
      toast({
        title: "Failed to update lot",
        description: message,
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  /** Opens the confirm-delete dialog for a lot. If its books are assigned to
   *  an office or an employee, the server requires admin credentials — it
   *  rejects with ADMIN_CONFIRM_REQUIRED_STATUS, which opens the admin-confirm
   *  dialog instead. */
  function handleDelete(id: number, lotNumber: string) {
    if (busy) return
    setPendingDeleteLot({ id, lotNumber })
    setError(null)
    setDeleteConfirmOpen(true)
  }

  /** Deletes the lot pending confirmation, which cascades to delete the books
   *  it generated (and their leaves). */
  async function confirmDeleteLot() {
    if (!pendingDeleteLot) return
    const { id, lotNumber } = pendingDeleteLot

    setBusy(true)
    setError(null)
    try {
      await deleteLot(id)
      await onReload()
      toast({ title: `Lot ${lotNumber} deleted`, variant: "success" })
      setDeleteConfirmOpen(false)
      setPendingDeleteLot(null)
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === ADMIN_CONFIRM_REQUIRED_STATUS
      ) {
        setDeleteConfirmOpen(false)
        setPendingDeleteLot(null)
        setPendingDeleteLotId(id)
        setDeleteAdminError(null)
        setDeleteAdminOpen(true)
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to delete lot"
        setError(message)
        toast({
          title: "Failed to delete lot",
          description: message,
          variant: "destructive",
        })
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteLotWithAdmin(name: string, password: string) {
    if (pendingDeleteLotId === null) return
    setBusy(true)
    setDeleteAdminError(null)
    try {
      await deleteLot(pendingDeleteLotId, { name, password })
      setDeleteAdminOpen(false)
      setPendingDeleteLotId(null)
      await onReload()
      toast({ title: "Lot deleted", variant: "success" })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete lot"
      setDeleteAdminError(message)
      toast({
        title: "Failed to delete lot",
        description: message,
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return {
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
    confirmDeleteLot,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    pendingDeleteLot,

    deleteAdminOpen,
    setDeleteAdminOpen,
    deleteAdminError,
    pendingDeleteLotId,
    confirmDeleteLotWithAdmin,
  }
}
