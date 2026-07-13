"use client"

import { useState } from "react"

import { toast } from "@/shared/hooks/use-toast"
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
  const [newRole, setNewRole] = useState("-")
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
    const role = newRole.trim() || "-"
    if (!name) {
      setError("Name is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createEmployee({ name, role, office_ids: newOfficeIds })
      setNewName("")
      setNewRole("-")
      setNewOfficeIds([])
      await onReload()
      toast({ title: "Employee created", variant: "success" })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add employee"
      setError(message)
      toast({
        title: "Failed to add employee",
        description: message,
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit() {
    if (editId === null) return
    const name = editName.trim()
    const role = editRole.trim() || "-"
    if (!name) {
      setError("Name is required.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await updateEmployee(editId, { name, role, office_ids: editOfficeIds })
      setEditOpen(false)
      await onReload()
      toast({ title: "Employee updated", variant: "success" })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update employee"
      setError(message)
      toast({
        title: "Failed to update employee",
        description: message,
        variant: "destructive",
      })
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
      toast({ title: "Employee deleted", variant: "success" })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete employee"
      setError(message)
      toast({
        title: "Failed to delete employee",
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
    openEdit,
    handleAdd,
    handleSaveEdit,
    handleDelete,
  }
}
