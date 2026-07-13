"use client"

import * as React from "react"

const TOAST_LIMIT = 3
const TOAST_DURATION_MS = 4000

type ToastVariant = "default" | "success" | "destructive"

type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  open: boolean
}

type ToastInput = Omit<ToastItem, "id" | "open">

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return String(count)
}

let toasts: ToastItem[] = []
const listeners = new Set<(toasts: ToastItem[]) => void>()

function emit() {
  for (const listener of listeners) listener(toasts)
}

function dismiss(id: string) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, open: false } : t))
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 200)
}

/** Fire-and-forget toast, safe to call from hooks/services outside React render. */
function toast(input: ToastInput) {
  const id = genId()
  toasts = [{ id, open: true, ...input }, ...toasts].slice(0, TOAST_LIMIT)
  emit()
  setTimeout(() => dismiss(id), TOAST_DURATION_MS)
  return id
}

function useToast() {
  const [state, setState] = React.useState(toasts)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return { toasts: state, dismiss }
}

export { toast, useToast }
