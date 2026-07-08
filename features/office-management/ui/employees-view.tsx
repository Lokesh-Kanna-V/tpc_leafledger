"use client"

import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
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
import type { Employee } from "@/shared/services/employees.service"
import type { Office } from "@/shared/services/offices.service"
import { useEmployees } from "../hooks/use-employees"

type EmployeesViewProps = {
  employees: Employee[]
  offices: Office[]
  onReload: () => Promise<void>
}

export function EmployeesView({
  employees,
  offices,
  onReload,
}: EmployeesViewProps) {
  const {
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
  } = useEmployees(offices, onReload)

  return (
    <div className="space-y-6">
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
          <Button type="button" disabled={busy} onClick={() => void handleAdd()}>
            Add
          </Button>
        </div>

        <Field className="mt-3">
          <FieldLabel>
            Offices <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <FieldContent>
            <div className="flex flex-wrap gap-4 rounded-md border border-input p-2">
              {offices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No offices yet. Add one in the Offices tab.
                </p>
              ) : (
                offices.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`emp-new-office-${o.id}`}
                      checked={newOfficeIds.includes(o.id)}
                      onCheckedChange={(v) =>
                        toggleOfficeId(o.id, v === true, setNewOfficeIds)
                      }
                    />
                    <FieldLabel
                      htmlFor={`emp-new-office-${o.id}`}
                      className="font-normal"
                    >
                      {o.name}
                    </FieldLabel>
                  </div>
                ))
              )}
            </div>
          </FieldContent>
        </Field>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Offices</TableHead>
            <TableHead className="w-[200px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                No employees yet. Add one above.
              </TableCell>
            </TableRow>
          ) : (
            employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.name}</TableCell>
                <TableCell>{e.role}</TableCell>
                <TableCell>{officeNames(e.office_ids)}</TableCell>
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
            <Field>
              <FieldLabel>
                Offices{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FieldLabel>
              <FieldContent>
                <div className="flex flex-wrap gap-4 rounded-md border border-input p-2">
                  {offices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No offices yet. Add one in the Offices tab.
                    </p>
                  ) : (
                    offices.map((o) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`emp-edit-office-${o.id}`}
                          checked={editOfficeIds.includes(o.id)}
                          onCheckedChange={(v) =>
                            toggleOfficeId(o.id, v === true, setEditOfficeIds)
                          }
                        />
                        <FieldLabel
                          htmlFor={`emp-edit-office-${o.id}`}
                          className="font-normal"
                        >
                          {o.name}
                        </FieldLabel>
                      </div>
                    ))
                  )}
                </div>
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
