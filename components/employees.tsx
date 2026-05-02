"use client"

import { useState } from "react"

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
import type { Employee } from "@/lib/api/employees"
import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/lib/api/employees"

type EmployeesProps = {
  employees: Employee[]
  onReload: () => Promise<void>
}

export default function Employees({ employees, onReload }: EmployeesProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("")

  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editRole, setEditRole] = useState("")

  function openEdit(e: Employee) {
    setEditId(e.id)
    setEditName(e.name)
    setEditRole(e.role)
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
      await createEmployee({ name, role })
      setNewName("")
      setNewRole("")
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
      await updateEmployee(editId, { name, role })
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

  return (
    <div className="mt-6 space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-medium">Add employee</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="min-w-[160px] flex-1">
            <FieldLabel htmlFor="emp-new-name">Name</FieldLabel>
            <FieldContent>
              <Input
                id="emp-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field className="min-w-[140px] flex-1">
            <FieldLabel htmlFor="emp-new-role">Role</FieldLabel>
            <FieldContent>
              <Input
                id="emp-new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Clerk"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleAdd()}
          >
            Add
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No employees yet. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium tabular-nums">{e.id}</TableCell>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.role}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(e)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(e.id)}
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
            <DialogTitle>Edit employee</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="emp-edit-name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="emp-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="emp-edit-role">Role</FieldLabel>
              <FieldContent>
                <Input
                  id="emp-edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  autoComplete="off"
                />
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
