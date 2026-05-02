"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { PlusIcon, MinusIcon, EqualIcon } from "lucide-react"
import type { BookRow, BookStatus } from "@/lib/books"
import type { Office } from "@/lib/api/offices"
import type { Book } from "@/lib/api/books"
import {
  bookToUpdateBody,
  createBook,
  deleteBook,
  updateBook,
} from "@/lib/api/books"
import { createEmployee, type Employee } from "@/lib/api/employees"
import {
  createConsumption,
  getConsumption,
  updateConsumption,
  upsertConsumptionAssignment,
} from "@/lib/api/consumption"
import { ApiError } from "@/lib/api/request"
import { cn } from "@/lib/utils"

function dateIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase()
}

function matchEmployee(
  employees: Employee[],
  name: string
): Employee | undefined {
  const n = normalizeName(name)
  return employees.find((e) => normalizeName(e.name) === n)
}

type BookManagerProps = {
  books: BookRow[]
  apiBooks: Book[]
  employees: Employee[]
  offices: Office[]
  onReload: () => Promise<void>
}

export default function BookManager({
  books,
  apiBooks,
  employees,
  offices,
  onReload,
}: BookManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bookNo, setBookNo] = useState("")
  const [leafFrom, setLeafFrom] = useState("")
  const [leafTo, setLeafTo] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [officeId, setOfficeId] = useState("")
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignBookNo, setAssignBookNo] = useState("")
  const [assignEmployeeId, setAssignEmployeeId] = useState("")
  const [assignNewEmployeeName, setAssignNewEmployeeName] = useState("")
  const [assignNewEmployeeRole, setAssignNewEmployeeRole] = useState("")
  const [assignLeafFrom, setAssignLeafFrom] = useState("")
  const [assignNewBook, setAssignNewBook] = useState(false)
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [accountBookNo, setAccountBookNo] = useState("")
  const [accountThrough, setAccountThrough] = useState("")

  const [statusFilter, setStatusFilter] = useState<"all" | BookStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [busy, setBusy] = useState(false)
  const [addActionError, setAddActionError] = useState<string | null>(null)
  const [assignActionError, setAssignActionError] = useState<string | null>(
    null
  )
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null
  )

  const leafMetrics = useMemo(() => {
    const from = Number.parseInt(leafFrom, 10)
    const to = Number.parseInt(leafTo, 10)

    const fromValid = Number.isFinite(from) && !Number.isNaN(from)
    const toValid = Number.isFinite(to) && !Number.isNaN(to)

    if (!fromValid || !toValid) {
      return {
        from: fromValid ? from : null,
        to: toValid ? to : null,
        count: 0,
      }
    }

    const count = to - from + 1
    return { from, to, count }
  }, [leafFrom, leafTo])

  const errors = useMemo(() => {
    const e: {
      bookNo?: string
      leafFrom?: string
      leafTo?: string
      office?: string
      assignee?: string
    } = {}

    if (!bookNo.trim()) e.bookNo = "Leaf No. is required."

    if (offices.length === 0) {
      e.office = "No offices available."
    } else if (!officeId) {
      e.office = "Office is required."
    }

    if (assignedTo.trim() && !matchEmployee(employees, assignedTo)) {
      e.assignee = "Pick an employee name from your team (Employees tab)."
    }

    if (!leafFrom.trim()) e.leafFrom = "Leaf from is required."
    if (!leafTo.trim()) e.leafTo = "Leaf to is required."

    const from = leafMetrics.from
    const to = leafMetrics.to

    if (leafFrom.trim() && from === null)
      e.leafFrom = "Leaf from must be a number."
    if (leafTo.trim() && to === null) e.leafTo = "Leaf to must be a number."

    if (from !== null && to !== null) {
      if (to < from)
        e.leafTo = "Leaf to must be greater than or equal to leaf from."
      if (leafMetrics.count <= 0) e.leafTo = "Leaf range must be at least 1."
      if (leafMetrics.count > 50) e.leafTo = "Leaf count cannot exceed 50."
    }

    return e
  }, [
    bookNo,
    leafFrom,
    leafTo,
    leafMetrics,
    officeId,
    offices,
    assignedTo,
    employees,
  ])

  const leafCountLabel =
    leafMetrics.from !== null &&
    leafMetrics.to !== null &&
    leafMetrics.count > 0
      ? `${leafMetrics.count} leaf${leafMetrics.count === 1 ? "" : "s"}`
      : "—"

  const canAdd =
    !errors.bookNo &&
    !errors.leafFrom &&
    !errors.leafTo &&
    !errors.office &&
    !errors.assignee &&
    leafMetrics.count > 0 &&
    leafMetrics.count <= 50

  const bookNoOptions = useMemo(
    () =>
      [...new Set(books.map((b) => b.bookNo))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [books]
  )

  const assignedToOptions = useMemo(
    () =>
      [...employees.map((e) => e.name)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [employees]
  )

  const employeesSortedForAssign = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  )

  const visibleBooks = useMemo(() => {
    let rows = books
    if (statusFilter !== "all") {
      rows = rows.filter((b) => b.bookStatus === statusFilter)
    }
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter((b) => {
        const hay =
          `${b.bookNo} ${b.assignedTo ?? ""} ${b.officeName ?? ""}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return rows
  }, [books, statusFilter, searchQuery])

  const assignErrors = useMemo(() => {
    const e: {
      bookNo?: string
      employee?: string
      newEmployeeName?: string
      newEmployeeRole?: string
      leafFrom?: string
    } = {}

    if (!assignBookNo.trim()) e.bookNo = "Book number is required."

    if (!assignEmployeeId) {
      e.employee = "Select an employee."
    } else if (assignEmployeeId === "__new__") {
      if (!assignNewEmployeeName.trim()) e.newEmployeeName = "Name is required."
      if (!assignNewEmployeeRole.trim()) e.newEmployeeRole = "Role is required."
    } else {
      const id = Number.parseInt(assignEmployeeId, 10)
      if (!Number.isInteger(id) || !employees.some((emp) => emp.id === id)) {
        e.employee = "Invalid employee selection."
      }
    }

    if (!assignNewBook) {
      if (!assignLeafFrom.trim()) e.leafFrom = "Leaf from is required."
      const from = Number.parseInt(assignLeafFrom, 10)
      if (
        assignLeafFrom.trim() &&
        (Number.isNaN(from) || !Number.isFinite(from))
      ) {
        e.leafFrom = "Leaf from must be a number."
      }
      const apiBook = apiBooks.find(
        (b) => b.book_number === assignBookNo.trim()
      )
      if (
        apiBook &&
        assignLeafFrom.trim() &&
        Number.isFinite(from) &&
        (from < apiBook.leaf_no_from || from > apiBook.leaf_no_to)
      ) {
        e.leafFrom = `Must be between ${apiBook.leaf_no_from} and ${apiBook.leaf_no_to}.`
      }
    }

    return e
  }, [
    assignEmployeeId,
    assignNewEmployeeName,
    assignNewEmployeeRole,
    assignBookNo,
    assignLeafFrom,
    assignNewBook,
    apiBooks,
    employees,
  ])

  const canAssign =
    !assignErrors.bookNo &&
    !assignErrors.employee &&
    !assignErrors.newEmployeeName &&
    !assignErrors.newEmployeeRole &&
    !assignErrors.leafFrom

  const accountErrors = useMemo(() => {
    const e: { bookNo?: string; through?: string } = {}
    const value = accountBookNo.trim()
    if (!value) {
      e.bookNo = "Leaf No is required."
      return e
    }

    if (!bookNoOptions.includes(value)) {
      e.bookNo = "Select a valid Leaf No"
    }

    const selected = books.find((b) => b.bookNo === value)
    if (!selected) {
      e.bookNo = "Select a valid Book No"
      return e
    }

    if (!accountThrough.trim()) {
      e.through = "Leaf No is required."
      return e
    }

    const through = Number.parseInt(accountThrough, 10)
    if (Number.isNaN(through) || !Number.isFinite(through)) {
      e.through = "Leaf No must be a number."
      return e
    }

    if (through < selected.leafFrom) {
      e.through = `Must be ≥ ${selected.leafFrom}.`
    } else if (through > selected.leafTo) {
      e.through = `Must be ≤ ${selected.leafTo}.`
    }

    return e
  }, [accountBookNo, accountThrough, bookNoOptions, books])

  const canAccount = !accountErrors.bookNo && !accountErrors.through

  function bookTotalLeaves(b: BookRow) {
    return b.leafTo - b.leafFrom + 1
  }

  function bookAccountedLeaves(b: BookRow) {
    const accountedThrough = b.accountedThrough ?? b.leafFrom - 1
    if (accountedThrough < b.leafFrom) return 0
    const capped = Math.min(accountedThrough, b.leafTo)
    return capped - b.leafFrom + 1
  }

  function isBookFullyAccounted(b: BookRow) {
    return bookAccountedLeaves(b) >= bookTotalLeaves(b)
  }

  function resetAssignForm() {
    setAssignBookNo("")
    setAssignEmployeeId("")
    setAssignNewEmployeeName("")
    setAssignNewEmployeeRole("")
    setAssignLeafFrom("")
    setAssignNewBook(false)
  }

  function resetAccountForm() {
    setAccountBookNo("")
    setAccountThrough("")
  }

  async function accountBook(): Promise<boolean> {
    if (!canAccount) return false
    const bookNoTrimmed = accountBookNo.trim()
    const through = Number.parseInt(accountThrough, 10)
    const row = books.find((b) => b.bookNo === bookNoTrimmed)
    const apiBook = apiBooks.find((b) => b.book_number === bookNoTrimmed)
    if (!row || !apiBook) return false

    const today = dateIsoLocal()
    setBusy(true)
    setAccountActionError(null)
    try {
      for (let L = row.leafFrom; L <= through; L++) {
        const key = String(L)
        try {
          const cons = await getConsumption(key)
          if (cons.user_id === null || cons.user_id === undefined) {
            setAccountActionError(
              `Leaf ${L} is not assigned to anyone yet — assign before accounting.`
            )
            return false
          }
          await updateConsumption(key, {
            user_id: cons.user_id,
            assigned_date: cons.assigned_date,
            accounted: true,
            accounted_date: today,
          })
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setAccountActionError(
              `Leaf ${L} has no consumption row — add the book again or contact support.`
            )
            return false
          }
          throw err
        }
      }

      if (through >= row.leafTo) {
        await updateBook(
          apiBook.id,
          bookToUpdateBody({ ...apiBook, book_status: "completed" })
        )
      }

      await onReload()
      return true
    } catch (err) {
      setAccountActionError(
        err instanceof Error ? err.message : "Accounting failed"
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function assignBook(): Promise<boolean> {
    if (!canAssign) return false

    const bookNoTrimmed = assignBookNo.trim()
    const apiBook = apiBooks.find((b) => b.book_number === bookNoTrimmed)
    if (!apiBook) return false

    const leafFromNum = assignNewBook
      ? null
      : Number.parseInt(assignLeafFrom, 10)
    if (!assignNewBook && (leafFromNum === null || Number.isNaN(leafFromNum))) {
      return false
    }

    const today = dateIsoLocal()
    setBusy(true)
    setAssignActionError(null)

    try {
      let empId: number
      if (assignEmployeeId === "__new__") {
        const created = await createEmployee({
          name: assignNewEmployeeName.trim(),
          role: assignNewEmployeeRole.trim(),
        })
        empId = created.id
      } else {
        empId = Number.parseInt(assignEmployeeId, 10)
      }

      let fromL = apiBook.leaf_no_from
      let bookPayload = apiBook

      if (!assignNewBook && leafFromNum !== null) {
        fromL = leafFromNum
        bookPayload = await updateBook(
          apiBook.id,
          bookToUpdateBody({
            ...apiBook,
            leaf_no_from: leafFromNum,
            initial_assigned_date: apiBook.initial_assigned_date ?? today,
          })
        )
      }

      const endL = bookPayload.leaf_no_to
      for (let L = fromL; L <= endL; L++) {
        await upsertConsumptionAssignment(String(L), {
          user_id: empId,
          assigned_date: today,
          accounted: false,
          accounted_date: null,
        })
      }

      await onReload()
      return true
    } catch (err) {
      setAssignActionError(
        err instanceof Error ? err.message : "Assignment failed"
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  function resetForm() {
    setBookNo("")
    setLeafFrom("")
    setLeafTo("")
    setAssignedTo("")
    setOfficeId("")
  }

  async function addBook(): Promise<boolean> {
    if (!canAdd) return false

    const from = leafMetrics.from
    const to = leafMetrics.to
    if (from === null || to === null) return false

    const officeIdNum = Number.parseInt(officeId, 10)
    if (!Number.isFinite(officeIdNum)) return false

    const today = dateIsoLocal()
    const empName = assignedTo.trim()
    let initialDate: string | null = null
    if (empName) {
      if (!matchEmployee(employees, empName)) return false
      initialDate = today
    }

    setBusy(true)
    setAddActionError(null)

    try {
      const created = await createBook({
        office_id: officeIdNum,
        book_number: bookNo.trim(),
        initial_assigned_date: initialDate,
        leaf_no_from: from,
        leaf_no_to: to,
        book_status: "current",
      })

      const emp = empName ? matchEmployee(employees, empName) : undefined
      const userIdForLeaves = emp?.id ?? null

      try {
        for (let L = from; L <= to; L++) {
          await createConsumption({
            leaf_no: String(L),
            user_id: userIdForLeaves,
            assigned_date: today,
            accounted: false,
            accounted_date: null,
          })
        }
      } catch (consumptionErr) {
        try {
          await deleteBook(created.id)
        } catch {
          /* book may be partially visible until manual cleanup */
        }
        throw consumptionErr
      }

      await onReload()
      return true
    } catch (err) {
      setAddActionError(
        err instanceof Error ? err.message : "Failed to add book"
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function moveBookToStore(bookNoStr: string) {
    const apiBook = apiBooks.find((b) => b.book_number === bookNoStr)
    if (!apiBook) return
    setBusy(true)
    try {
      await updateBook(
        apiBook.id,
        bookToUpdateBody({ ...apiBook, book_status: "store" })
      )
      await onReload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-10">
      <div className="mb-10 flex justify-between rounded-xl border border-gray-200 bg-gray-50 p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (open) setAddActionError(null)
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Go Back">
                    <PlusIcon />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add Books</p>
              </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add new book</DialogTitle>
                <DialogDescription>
                  Enter the leaf range. Leaf count cannot exceed <b>50</b>.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
                <div className="text-sm font-medium">Leaf count</div>
                <div
                  className="rounded-md border bg-background px-2 py-0.5 text-sm font-semibold tabular-nums"
                  aria-live="polite"
                >
                  {leafCountLabel}
                </div>
              </div>

              {addActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {addActionError}
                </p>
              ) : null}

              <FieldGroup>
                <Field data-invalid={!!errors.bookNo}>
                  <FieldLabel htmlFor="book-no">Book No</FieldLabel>
                  <FieldContent>
                    <Input
                      id="book-no"
                      value={bookNo}
                      onChange={(e) => setBookNo(e.target.value)}
                      placeholder="e.g. BK-001"
                      aria-invalid={!!errors.bookNo}
                      autoComplete="off"
                    />
                    <FieldError
                      errors={errors.bookNo ? [{ message: errors.bookNo }] : []}
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={!!errors.office}>
                  <FieldLabel htmlFor="add-book-office">Office</FieldLabel>
                  <FieldContent>
                    <select
                      id="add-book-office"
                      className={cn(
                        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                      )}
                      value={officeId}
                      onChange={(e) => setOfficeId(e.target.value)}
                      aria-invalid={!!errors.office}
                    >
                      <option value="">Select an office</option>
                      {offices.map((o) => (
                        <option key={o.id} value={String(o.id)}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <FieldError
                      errors={errors.office ? [{ message: errors.office }] : []}
                    />
                  </FieldContent>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field data-invalid={!!errors.leafFrom}>
                    <FieldLabel htmlFor="leaf-from">Leaf from</FieldLabel>
                    <FieldContent>
                      <Input
                        id="leaf-from"
                        inputMode="numeric"
                        value={leafFrom}
                        onChange={(e) => setLeafFrom(e.target.value)}
                        placeholder="1"
                        aria-invalid={!!errors.leafFrom}
                      />
                      <FieldError
                        errors={
                          errors.leafFrom ? [{ message: errors.leafFrom }] : []
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!errors.leafTo}>
                    <FieldLabel htmlFor="leaf-to">Leaf to</FieldLabel>
                    <FieldContent>
                      <Input
                        id="leaf-to"
                        inputMode="numeric"
                        value={leafTo}
                        onChange={(e) => setLeafTo(e.target.value)}
                        placeholder="50"
                        aria-invalid={!!errors.leafTo}
                      />
                      <FieldError
                        errors={
                          errors.leafTo ? [{ message: errors.leafTo }] : []
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>

                <Field data-invalid={!!errors.assignee}>
                  <FieldLabel htmlFor="assigned-to">
                    Assigned to{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="assigned-to"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="Employee name"
                      list="add-assigned-to-options"
                      autoComplete="off"
                      aria-invalid={!!errors.assignee}
                    />
                    <datalist id="add-assigned-to-options">
                      {assignedToOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <FieldDescription>
                      Must match a name from Employees. Leave empty to assign
                      later.
                    </FieldDescription>
                    <FieldError
                      errors={
                        errors.assignee ? [{ message: errors.assignee }] : []
                      }
                    />
                  </FieldContent>
                </Field>
              </FieldGroup>

              <DialogFooter className="sm:justify-between">
                <div className="flex flex-1 items-center justify-between gap-2 sm:justify-start">
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Close
                    </Button>
                  </DialogClose>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    disabled={!canAdd || busy}
                    onClick={async () => {
                      const ok = await addBook()
                      if (!ok) return
                      resetForm()
                      setDialogOpen(false)
                    }}
                  >
                    Add and close
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canAdd || busy}
                    onClick={async () => {
                      const ok = await addBook()
                      if (!ok) return
                      resetForm()
                    }}
                  >
                    Add more
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={assignDialogOpen}
            onOpenChange={(open) => {
              setAssignDialogOpen(open)
              if (open) setAssignActionError(null)
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Assign Books"
                  >
                    <MinusIcon />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Assign Books</p>
              </TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign book</DialogTitle>
                <DialogDescription>
                  Pick a book and an employee from the list, or add someone new.
                  Optionally change the starting leaf.
                </DialogDescription>
              </DialogHeader>

              {assignActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {assignActionError}
                </p>
              ) : null}

              <FieldGroup>
                <Field data-invalid={!!assignErrors.bookNo}>
                  <FieldLabel htmlFor="assign-book-no">Book number</FieldLabel>
                  <FieldContent>
                    <Input
                      id="assign-book-no"
                      value={assignBookNo}
                      onChange={(e) => setAssignBookNo(e.target.value)}
                      placeholder="Type to search…"
                      list="book-no-options"
                      aria-invalid={!!assignErrors.bookNo}
                      autoComplete="off"
                    />
                    <datalist id="book-no-options">
                      {bookNoOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <FieldError
                      errors={
                        assignErrors.bookNo
                          ? [{ message: assignErrors.bookNo }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={!!assignErrors.employee}>
                  <FieldLabel htmlFor="assign-employee">Assigned to</FieldLabel>
                  <FieldContent>
                    <select
                      id="assign-employee"
                      className={cn(
                        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                      )}
                      value={assignEmployeeId}
                      onChange={(e) => setAssignEmployeeId(e.target.value)}
                      aria-invalid={!!assignErrors.employee}
                    >
                      <option value="">Select an employee</option>
                      {employeesSortedForAssign.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                      <option value="__new__">+ Add new employee…</option>
                    </select>
                    <FieldError
                      errors={
                        assignErrors.employee
                          ? [{ message: assignErrors.employee }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>

                {assignEmployeeId === "__new__" ? (
                  <>
                    <Field data-invalid={!!assignErrors.newEmployeeName}>
                      <FieldLabel htmlFor="assign-new-emp-name">
                        New employee name
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="assign-new-emp-name"
                          value={assignNewEmployeeName}
                          onChange={(e) =>
                            setAssignNewEmployeeName(e.target.value)
                          }
                          placeholder="Full name"
                          autoComplete="off"
                          aria-invalid={!!assignErrors.newEmployeeName}
                        />
                        <FieldError
                          errors={
                            assignErrors.newEmployeeName
                              ? [{ message: assignErrors.newEmployeeName }]
                              : []
                          }
                        />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!assignErrors.newEmployeeRole}>
                      <FieldLabel htmlFor="assign-new-emp-role">
                        Role
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="assign-new-emp-role"
                          value={assignNewEmployeeRole}
                          onChange={(e) =>
                            setAssignNewEmployeeRole(e.target.value)
                          }
                          placeholder="e.g. Clerk"
                          autoComplete="off"
                          aria-invalid={!!assignErrors.newEmployeeRole}
                        />
                        <FieldDescription>
                          They will be saved to Employees and assigned to this
                          book.
                        </FieldDescription>
                        <FieldError
                          errors={
                            assignErrors.newEmployeeRole
                              ? [{ message: assignErrors.newEmployeeRole }]
                              : []
                          }
                        />
                      </FieldContent>
                    </Field>
                  </>
                ) : null}

                <Field orientation="horizontal">
                  <FieldLabel htmlFor="assign-new-book">New book</FieldLabel>
                  <FieldContent>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="assign-new-book"
                        checked={assignNewBook}
                        onCheckedChange={(v) => setAssignNewBook(v === true)}
                      />
                      <FieldDescription>
                        If enabled, book range is unchanged; all leaves get the
                        assignee.
                      </FieldDescription>
                    </div>
                  </FieldContent>
                </Field>

                <Field
                  data-invalid={!!assignErrors.leafFrom}
                  data-disabled={assignNewBook}
                >
                  <FieldLabel htmlFor="assign-leaf-from">Leaf from</FieldLabel>
                  <FieldContent>
                    <Input
                      id="assign-leaf-from"
                      inputMode="numeric"
                      value={assignLeafFrom}
                      onChange={(e) => setAssignLeafFrom(e.target.value)}
                      placeholder="e.g. 1"
                      aria-invalid={!!assignErrors.leafFrom}
                      disabled={assignNewBook}
                    />
                    <FieldError
                      errors={
                        assignErrors.leafFrom
                          ? [{ message: assignErrors.leafFrom }]
                          : []
                      }
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

                <Button
                  type="button"
                  disabled={!canAssign || busy}
                  onClick={async () => {
                    const ok = await assignBook()
                    if (!ok) return
                    resetAssignForm()
                    setAssignDialogOpen(false)
                  }}
                >
                  Assign and close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={accountDialogOpen}
            onOpenChange={(open) => {
              setAccountDialogOpen(open)
              if (open) setAccountActionError(null)
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Account Leaves"
                  >
                    <EqualIcon />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Account Leaves</p>
              </TooltipContent>
            </Tooltip>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Account leaves</DialogTitle>
                <DialogDescription>
                  Marks leaves from the start of the book through the number you
                  enter as accounted. Assign leaves first. Fully accounting a
                  book marks it completed.
                </DialogDescription>
              </DialogHeader>

              {accountActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {accountActionError}
                </p>
              ) : null}

              <FieldGroup>
                <Field data-invalid={!!accountErrors.bookNo}>
                  <FieldLabel htmlFor="account-book-no">Book No.</FieldLabel>
                  <FieldContent>
                    <Input
                      id="account-book-no"
                      value={accountBookNo}
                      onChange={(e) => {
                        const next = e.target.value
                        setAccountBookNo(next)

                        const selected = books.find(
                          (b) => b.bookNo === next.trim()
                        )
                        if (selected && !accountThrough.trim()) {
                          setAccountThrough(String(selected.leafTo))
                        }
                      }}
                      placeholder="Type to search…"
                      list="account-book-no-options"
                      aria-invalid={!!accountErrors.bookNo}
                      autoComplete="off"
                    />
                    <datalist id="account-book-no-options">
                      {bookNoOptions.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <FieldError
                      errors={
                        accountErrors.bookNo
                          ? [{ message: accountErrors.bookNo }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>

                <Field data-invalid={!!accountErrors.through}>
                  <FieldLabel htmlFor="account-through">
                    Account through leaf
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="account-through"
                      inputMode="numeric"
                      value={accountThrough}
                      onChange={(e) => setAccountThrough(e.target.value)}
                      placeholder="e.g. 50"
                      aria-invalid={!!accountErrors.through}
                    />
                    <FieldDescription>
                      Inclusive — every leaf from the book start through this
                      number is marked accounted.
                    </FieldDescription>
                    <FieldError
                      errors={
                        accountErrors.through
                          ? [{ message: accountErrors.through }]
                          : []
                      }
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
                    onClick={async () => {
                      const ok = await accountBook()
                      if (!ok) return
                      resetAccountForm()
                      setAccountDialogOpen(false)
                    }}
                  >
                    Account and close
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canAccount || busy}
                    onClick={async () => {
                      const ok = await accountBook()
                      if (!ok) return
                      resetAccountForm()
                    }}
                  >
                    Account more
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ButtonGroup>
            <Field orientation="horizontal">
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Field>
          </ButtonGroup>
        </div>

        <Button variant="outline" type="button" disabled={busy}>
          Total Books: <span className="font-bold">{books.length}</span>
        </Button>

        <ButtonGroup>
          <Button
            variant={statusFilter === "current" ? "default" : "outline"}
            type="button"
            onClick={() =>
              setStatusFilter((f) => (f === "current" ? "all" : "current"))
            }
          >
            Current Books
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            type="button"
            onClick={() =>
              setStatusFilter((f) => (f === "completed" ? "all" : "completed"))
            }
          >
            Completed Books
          </Button>
          <Button
            variant={statusFilter === "store" ? "default" : "outline"}
            type="button"
            onClick={() =>
              setStatusFilter((f) => (f === "store" ? "all" : "store"))
            }
          >
            Stored Books
          </Button>
        </ButtonGroup>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Running Book No.</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Leaf No.</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="w-[110px] text-center">Accounted</TableHead>
            {/* <TableHead className="w-[100px] text-right">Actions</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleBooks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                No books match this view.
              </TableCell>
            </TableRow>
          ) : (
            visibleBooks.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.bookNo}</TableCell>
                <TableCell>{b.officeName ?? `Office #${b.officeId}`}</TableCell>
                <TableCell className="tabular-nums">
                  {b.leafFrom} - {b.leafTo}{" "}
                  <span className="text-muted-foreground">
                    ({b.leafTo - b.leafFrom + 1})
                  </span>
                </TableCell>
                <TableCell>{b.assignedTo ?? "—"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox disabled checked={isBookFullyAccounted(b)} />
                  </div>
                </TableCell>
                {/* <TableCell className="text-right">
                  {b.bookStatus === "completed" ||
                  b.bookStatus === "store" ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void moveBookToStore(b.bookNo)}
                    >
                      Store
                    </Button>
                  )}
                </TableCell> */}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
