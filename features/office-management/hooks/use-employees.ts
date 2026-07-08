"use client"

import { useState } from "react"

import type { Employee } from "@/shared/services/employees.service"
import type { Office } from "@/shared/services/offices.service"
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/shared/services/employees.service"

export function useEmployees(offices: Office[], onReload: () => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")
  const [newOfficeIds, setNewOfficeIds] = useState<number[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editOfficeIds, setEditOfficeIds] = useState<number[]>([])

  function officeNames(officeIds: number[]): string {
    const names = officeIds
      .map((id) => offices.find((o) => o.id === id)?.name)
      .filter((name): name is string => Boolean(name))
    return names.length > 0 ? names.join(", ") : "—"
  }

  function toggleOfficeId(
    id: number,
    checked: boolean,
    setIds: (update: (prev: number[]) => number[]) => void
  ) {
    setIds((prev) =>
      checked ? [...prev, id] : prev.filter((existing) => existing !== id)
    )
  }

  function openEdit(e: Employee) {
    setEditId(e.id)
    setEditName(e.name)
    setEditRole(e.role)
    setEditOfficeIds(e.office_ids)
    setEditOpen(true)
    setError(null)
  }

  async function handleAdd() {
    const name = newName.trim()
    const role = newRole.trim()
    if (!name || !role) {
      setError("Name and role are required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createEmployee({ name, role, office_ids: newOfficeIds })
      setNewName("")
      setNewRole("")
      setNewOfficeIds([])
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee")
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    if (editId === null) return
    const name = editName.trim()
    const role = editRole.trim()
    if (!name || !role) {
      setError("Name and role are required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateEmployee(editId, { name, role, office_ids: editOfficeIds })
      setEditOpen(false)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    setBusy(true)
    setError(null)
    try {
      await deleteEmployee(id)
      await onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete employee")
    } finally {
      setBusy(false)
    }
  }

  return {
    busy,
    error,
    newName,
    setNewName,
    newRole,
    setNewRole,
    newOfficeIds,
    setNewOfficeIds,
    editOpen,
    setEditOpen,
    editName,
    setEditName,
    editRole,
    setEditRole,
    editOfficeIds,
    setEditOfficeIds,
    officeNames,
    toggleOfficeId,
    openEdit,
    handleAdd,
    handleSaveEdit,
    handleDelete,
  }
}
