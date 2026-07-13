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
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table"
import type { Office } from "@/shared/services/offices.service"
import { useOffices } from "../hooks/use-offices"

type OfficesViewProps = {
  offices: Office[]
  onReload: () => Promise<void>
}

export function OfficesView({ offices, onReload }: OfficesViewProps) {
  const {
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
  } = useOffices(onReload)

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
          <Button type="button" loading={busy} onClick={() => void handleAdd()}>
            Add
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
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
                      loading={busy}
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
              loading={busy}
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
