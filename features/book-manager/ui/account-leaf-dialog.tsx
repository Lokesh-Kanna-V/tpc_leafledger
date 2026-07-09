"use client"

import type { RefObject } from "react"
import { EqualIcon } from "lucide-react"

import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

type AccountLeafDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountLeafNo: string
  onAccountLeafNoChange: (value: string) => void
  accountLeafTo: string
  onAccountLeafToChange: (value: string) => void
  accountLeafInputRef: RefObject<HTMLInputElement | null>
  errors: { leafNo?: string; leafTo?: string }
  canAccount: boolean
  busy: boolean
  accountActionError: string | null
  onClearError: () => void
  onAccountAndClose: () => void
  onAccountAnother: () => void
}

export function AccountLeafDialog({
  open,
  onOpenChange,
  accountLeafNo,
  onAccountLeafNoChange,
  accountLeafTo,
  onAccountLeafToChange,
  accountLeafInputRef,
  errors,
  canAccount,
  busy,
  accountActionError,
  onClearError,
  onAccountAndClose,
  onAccountAnother,
}: AccountLeafDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (o) onClearError()
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Account leaf">
              <EqualIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Account leaf</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account leaf</DialogTitle>
          <DialogDescription>
            Enter a leaf number, or a range, to mark leaves accounted. Each
            leaf must already exist in consumption and be assigned to
            someone.
          </DialogDescription>
        </DialogHeader>

        {accountActionError ? (
          <div
            className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2"
            role="alert"
          >
            <p className="whitespace-pre-line text-sm text-destructive">
              {accountActionError}
            </p>
          </div>
        ) : null}

        <FieldGroup>
          <Field data-invalid={!!errors.leafNo}>
            <FieldLabel htmlFor="account-leaf-no">Leaf no. from</FieldLabel>
            <FieldContent>
              <Input
                id="account-leaf-no"
                placeholder="e.g. 5 or 2026-5"
                value={accountLeafNo}
                onChange={(e) => onAccountLeafNoChange(e.target.value)}
                aria-invalid={!!errors.leafNo}
                autoComplete="off"
                ref={accountLeafInputRef}
              />
              <FieldDescription>
                Book is inferred from the loaded consumption row for this
                leaf number.
              </FieldDescription>
              <FieldError
                errors={errors.leafNo ? [{ message: errors.leafNo }] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.leafTo}>
            <FieldLabel htmlFor="account-leaf-to">
              Leaf no. to (optional)
            </FieldLabel>
            <FieldContent>
              <Input
                id="account-leaf-to"
                placeholder="e.g. 20 — leave blank for a single leaf"
                value={accountLeafTo}
                onChange={(e) => onAccountLeafToChange(e.target.value)}
                aria-invalid={!!errors.leafTo}
                autoComplete="off"
              />
              <FieldDescription>
                Set this to account every leaf from &quot;from&quot; through
                this number in one go.
              </FieldDescription>
              <FieldError
                errors={errors.leafTo ? [{ message: errors.leafTo }] : []}
              />
            </FieldContent>
          </Field>
        </FieldGroup>

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Close
            </Button>
          </DialogClose>

          <div className="flex gap-2">
            <Button
              type="button"
              disabled={!canAccount || busy}
              onClick={onAccountAndClose}
            >
              Account and close
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canAccount || busy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onAccountAnother()
              }}
            >
              Account another
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
