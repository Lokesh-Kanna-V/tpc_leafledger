"use client"

import { useState } from "react"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog"
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"

type AdminConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  busy: boolean
  error: string | null
  onConfirm: (name: string, password: string) => void
}

/**
 * Re-asks for an admin's name + password to confirm a destructive action on
 * something already assigned to an office or an employee (deleting a book
 * or a lot). Independent of the requester's existing session.
 *
 * Render with a `key` tied to the target id (e.g. `key={pendingDeleteId}`)
 * so the name/password fields reset when a new delete attempt starts.
 */
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  busy,
  error,
  onConfirm,
}: AdminConfirmDialogProps) {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="admin-confirm-name">Admin name</FieldLabel>
            <FieldContent>
              <Input
                id="admin-confirm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="admin-confirm-password">Password</FieldLabel>
            <FieldContent>
              <Input
                id="admin-confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
            variant="destructive"
            disabled={!name.trim() || !password}
            loading={busy}
            onClick={() => onConfirm(name.trim(), password)}
          >
            Confirm delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
