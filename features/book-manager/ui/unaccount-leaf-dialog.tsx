"use client"

import type { RefObject } from "react"
import { EqualNotIcon } from "lucide-react"

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

type UnaccountLeafDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unaccountConsignmentNo: string
  onUnaccountConsignmentNoChange: (value: string) => void
  unaccountLeafTo: string
  onUnaccountLeafToChange: (value: string) => void
  unaccountLeafInputRef: RefObject<HTMLInputElement | null>
  errors: { consignmentNo?: string; leafTo?: string }
  canUnaccount: boolean
  busy: boolean
  unaccountActionError: string | null
  onClearError: () => void
  onUnaccountAndClose: () => void
  onUnaccountAnother: () => void
}

export function UnaccountLeafDialog({
  open,
  onOpenChange,
  unaccountConsignmentNo,
  onUnaccountConsignmentNoChange,
  unaccountLeafTo,
  onUnaccountLeafToChange,
  unaccountLeafInputRef,
  errors,
  canUnaccount,
  busy,
  unaccountActionError,
  onClearError,
  onUnaccountAndClose,
  onUnaccountAnother,
}: UnaccountLeafDialogProps) {
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
            <Button variant="outline" size="icon" aria-label="Unaccount leaf">
              <EqualNotIcon />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Unaccount leaf</p>
        </TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unaccount leaf</DialogTitle>
          <DialogDescription>
            Enter a consignment number, or a range, to mark leaves as not
            accounted. Each leaf must already exist in consumption and
            currently be accounted.
          </DialogDescription>
        </DialogHeader>

        {unaccountActionError ? (
          <div
            className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2"
            role="alert"
          >
            <p className="whitespace-pre-line text-sm text-destructive">
              {unaccountActionError}
            </p>
          </div>
        ) : null}

        <FieldGroup>
          <Field data-invalid={!!errors.consignmentNo}>
            <FieldLabel htmlFor="unaccount-consignment-no">
              Consignment no. from
            </FieldLabel>
            <FieldContent>
              <Input
                id="unaccount-consignment-no"
                placeholder="e.g. 5 or 2026-5"
                value={unaccountConsignmentNo}
                onChange={(e) => onUnaccountConsignmentNoChange(e.target.value)}
                aria-invalid={!!errors.consignmentNo}
                autoComplete="off"
                ref={unaccountLeafInputRef}
              />
              <FieldDescription>
                Book is inferred from the loaded consumption row for this
                consignment number.
              </FieldDescription>
              <FieldError
                errors={errors.consignmentNo ? [{ message: errors.consignmentNo }] : []}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.leafTo}>
            <FieldLabel htmlFor="unaccount-consignment-to">
              Consignment no. to (optional)
            </FieldLabel>
            <FieldContent>
              <Input
                id="unaccount-consignment-to"
                placeholder="e.g. 20 — leave blank for a single leaf"
                value={unaccountLeafTo}
                onChange={(e) => onUnaccountLeafToChange(e.target.value)}
                aria-invalid={!!errors.leafTo}
                autoComplete="off"
              />
              <FieldDescription>
                Set this to unaccount every leaf from &quot;from&quot; through
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
              disabled={!canUnaccount || busy}
              onClick={onUnaccountAndClose}
            >
              Unaccount and close
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canUnaccount || busy}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onUnaccountAnother()
              }}
            >
              Unaccount another
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
