"use client"

import { useState } from "react"

import type { Office } from "@/shared/services/offices.service"
import {
  createOffice,
  deleteOffice,
  updateOffice,
} from "@/shared/services/offices.service"

export function useOffices(onReload: () => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [newLeafAlertDays, setNewLeafAlertDays] = useState("2")

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editLeafAlertDays, setEditLeafAlertDays] = useState("2")

  function openEdit(o: Office) {
    setEditId(o.id)
    setEditName(o.name)
    setEditLeafAlertDays(String(o.leaf_alert_days))
    setEditOpen(true)
    setError(null)
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) {
      setError("Name is required.")
      return
    }
    const leafAlertDays = Number.parseInt(newLeafAlertDays, 10)
    if (!Number.isInteger(leafAlertDays) || leafAlertDays < 1) {
      setError("Leaf alert days must be a whole number of at least 1.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createOffice({ name, leaf_alert_days: leafAlertDays })
      setNewName("")
      setNewLeafAlertDays("2")
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add office")
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    if (editId === null) return
    const name = editName.trim()
    if (!name) {
      setError("Name is required.")
      return
    }
    const leafAlertDays = Number.parseInt(editLeafAlertDays, 10)
    if (!Number.isInteger(leafAlertDays) || leafAlertDays < 1) {
      setError("Leaf alert days must be a whole number of at least 1.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateOffice(editId, { name, leaf_alert_days: leafAlertDays })
      setEditOpen(false)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update office")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    setBusy(true)
    setError(null)
    try {
      await deleteOffice(id)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete office")
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    error,
    newName,
    setNewName,
    newLeafAlertDays,
    setNewLeafAlertDays,
    editOpen,
    setEditOpen,
    editName,
    setEditName,
    editLeafAlertDays,
    setEditLeafAlertDays,
    openEdit,
    handleAdd,
    handleSaveEdit,
    handleDelete,
  }
}
