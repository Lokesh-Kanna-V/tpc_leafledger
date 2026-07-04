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
import type { Office } from "@/lib/api/offices"
import { createOffice, deleteOffice, updateOffice } from "@/lib/api/offices"

type OfficesProps = {
  offices: Office[]
  onReload: () => Promise<void>
}

export default function Offices({ offices, onReload }: OfficesProps) {
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

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-medium">Add office</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="min-w-[160px] flex-1">
            <FieldLabel htmlFor="office-new-name">Name</FieldLabel>
            <FieldContent>
              <Input
                id="office-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Head Office"
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field className="w-32">
            <FieldLabel htmlFor="office-new-leaf-alert-days">
              Leaf alert days
            </FieldLabel>
            <FieldContent>
              <Input
                id="office-new-leaf-alert-days"
                type="number"
                min={1}
                value={newLeafAlertDays}
                onChange={(e) => setNewLeafAlertDays(e.target.value)}
              />
            </FieldContent>
          </Field>
          <Button type="button" disabled={busy} onClick={() => void handleAdd()}>
            Add
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-35 text-center">Leaf alert days</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                No offices yet. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            offices.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium tabular-nums">{o.id}</TableCell>
                <TableCell>{o.name}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {o.leaf_alert_days}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => openEdit(o)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(o.id)}
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
            <DialogTitle>Edit office</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="office-edit-name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="office-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoComplete="off"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="office-edit-leaf-alert-days">
                Leaf alert days
              </FieldLabel>
              <FieldContent>
                <Input
                  id="office-edit-leaf-alert-days"
                  type="number"
                  min={1}
                  value={editLeafAlertDays}
                  onChange={(e) => setEditLeafAlertDays(e.target.value)}
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
