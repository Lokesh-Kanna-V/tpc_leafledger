"use client"

import { useMemo, useRef, useState } from "react"
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

import { ChevronLeft, EqualIcon, MinusIcon, PlusIcon } from "lucide-react"
import {
  displayLeafSpanForBook,
  minAssignableLeaf,
  parseLeafNo,
  type BookRow,
  type BookStatus,
} from "@/lib/books"
import type { Office } from "@/lib/api/offices"
import type { Book } from "@/lib/api/books"
import {
  bookToUpdateBody,
  createBook,
  deleteBook,
  updateBook,
} from "@/lib/api/books"
import { createEmployee, type Employee } from "@/lib/api/employees"
import type { Consumption } from "@/lib/api/consumption"
import {
  accountConsumptionLeaf,
  createConsumption,
  updateConsumption,
  upsertConsumptionAssignment,
} from "@/lib/api/consumption"
import { cn } from "@/lib/utils"

const BOOKS_PAGE_SIZE = 20

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

function dateIsoLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// assigned_date is stored as DATE; display as DD/MM/YYYY.
function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-")
  return `${day}/${month}/${year}`
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

/** Finds another book whose leaf range overlaps [from, to], if any. */
function findLeafOverlap(
  apiBooks: Book[],
  from: number,
  to: number,
  excludeBookId: number | null
): Book | undefined {
  return apiBooks.find(
    (b) =>
      b.id !== excludeBookId &&
      b.leaf_no_from !== null &&
      b.leaf_no_to !== null &&
      b.leaf_no_from <= to &&
      from <= b.leaf_no_to
  )
}

type BookManagerProps = {
  books: BookRow[]
  apiBooks: Book[]
  employees: Employee[]
  offices: Office[]
  consumptions: Consumption[]
  onReload: () => Promise<void>
}

export default function BookManager({
  books,
  apiBooks,
  employees,
  offices,
  consumptions,
  onReload,
}: BookManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const keepAddDialogOpenRef = useRef(false)
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
  const [accountLeafNo, setAccountLeafNo] = useState("")
  const accountLeafInputRef = useRef<HTMLInputElement | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editBookId, setEditBookId] = useState<number | null>(null)
  const [editBookNo, setEditBookNo] = useState("")
  const [editOfficeId, setEditOfficeId] = useState("")
  const [editLeafFrom, setEditLeafFrom] = useState("")
  const [editLeafTo, setEditLeafTo] = useState("")
  const [editEmployeeId, setEditEmployeeId] = useState("")
  const [editNewEmployeeName, setEditNewEmployeeName] = useState("")
  const [editNewEmployeeRole, setEditNewEmployeeRole] = useState("")

  const [statusFilter, setStatusFilter] = useState<"all" | BookStatus>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [monthFilter, setMonthFilter] = useState("all")
  const [page, setPage] = useState(1)

  const [busy, setBusy] = useState(false)
  const [addActionError, setAddActionError] = useState<string | null>(null)
  const [assignActionError, setAssignActionError] = useState<string | null>(
    null
  )
  const [accountActionError, setAccountActionError] = useState<string | null>(
    null
  )
  const [editActionError, setEditActionError] = useState<string | null>(null)

  /** When set, show per-leaf detail table for this book row id. */
  const [detailBookId, setDetailBookId] = useState<string | null>(null)

  const detailBook = detailBookId
    ? books.find((b) => b.id === detailBookId)
    : undefined

  const leafDetailRows = useMemo(() => {
    if (!detailBookId) return []
    const b = books.find((x) => x.id === detailBookId)
    if (!b) return []
    const empMap = new Map(employees.map((e) => [e.id, e.name]))
    const rows: {
      leafNo: number
      assignedTo: string
      assignedDate: string | null
      accounted: boolean
      accountedDate: string | null
    }[] = []
    for (let L = b.leafFrom; L <= b.leafTo; L++) {
      const cons = consumptions.find(
        (c) => c.book_id === b.dbId && parseLeafNo(c.leaf_no) === L
      )
      rows.push({
        leafNo: L,
        assignedTo:
          cons?.user_id != null
            ? (empMap.get(cons.user_id) ?? `User #${cons.user_id}`)
            : "—",
        assignedDate: cons?.assigned_date ?? null,
        accounted: cons?.accounted ?? false,
        accountedDate:
          cons?.accounted_date != null && String(cons.accounted_date).trim()
            ? String(cons.accounted_date)
            : null,
      })
    }
    return rows
  }, [detailBookId, books, consumptions, employees])

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

      if (!e.leafTo) {
        const conflict = findLeafOverlap(apiBooks, from, to, null)
        if (conflict) {
          e.leafTo = `Leaves ${from}-${to} overlap with book ${conflict.book_number} (leaves ${conflict.leaf_no_from}-${conflict.leaf_no_to}). Choose a range starting after ${conflict.leaf_no_to}.`
        }
      }
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
    apiBooks,
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

  const bookYearOptions = useMemo(() => {
    const years = new Set<string>()
    for (const b of books) {
      if (b.assignedDate) years.add(b.assignedDate.slice(0, 4))
    }
    return [...years].sort((a, b) => b.localeCompare(a))
  }, [books])

  const visibleBooks = useMemo(() => {
    let rows = books
    if (statusFilter !== "all") {
      rows = rows.filter((b) => b.bookStatus === statusFilter)
    }
    if (yearFilter !== "all") {
      rows = rows.filter((b) => b.assignedDate?.slice(0, 4) === yearFilter)
    }
    if (monthFilter !== "all") {
      rows = rows.filter((b) => b.assignedDate?.slice(5, 7) === monthFilter)
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
  }, [books, statusFilter, yearFilter, monthFilter, searchQuery])

  const totalBookPages = Math.max(
    1,
    Math.ceil(visibleBooks.length / BOOKS_PAGE_SIZE)
  )
  const currentBookPage = Math.min(page, totalBookPages)
  const pagedBooks = useMemo(
    () =>
      visibleBooks.slice(
        (currentBookPage - 1) * BOOKS_PAGE_SIZE,
        currentBookPage * BOOKS_PAGE_SIZE
      ),
    [visibleBooks, currentBookPage]
  )

  const assignErrors = useMemo(() => {
    const e: {
      bookNo?: string
      employee?: string
      newEmployeeName?: string
      newEmployeeRole?: string
      leafFrom?: string
      assignBlocked?: string
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

    const apiBook = apiBooks.find((b) => b.book_number === assignBookNo.trim())
    const span = apiBook ? displayLeafSpanForBook(apiBook) : null
    const minLeaf =
      apiBook && span ? minAssignableLeaf(apiBook, consumptions) : null

    if (apiBook && span && minLeaf !== null && minLeaf > span.to) {
      e.assignBlocked =
        "Every leaf in this book is already accounted through the end of the range. Nothing left to assign."
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
      if (
        span &&
        assignLeafFrom.trim() &&
        Number.isFinite(from) &&
        (from < span.from || from > span.to)
      ) {
        e.leafFrom = `Must be between ${span.from} and ${span.to}.`
      }
      if (
        span &&
        minLeaf !== null &&
        assignLeafFrom.trim() &&
        Number.isFinite(from) &&
        from < minLeaf &&
        !e.leafFrom
      ) {
        e.leafFrom = `Must be at least ${minLeaf}. Leaves ${span.from}–${minLeaf - 1} include accounted leaves and cannot be reassigned.`
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
    consumptions,
    employees,
  ])

  const canAssign =
    !assignErrors.bookNo &&
    !assignErrors.employee &&
    !assignErrors.newEmployeeName &&
    !assignErrors.newEmployeeRole &&
    !assignErrors.leafFrom &&
    !assignErrors.assignBlocked

  const accountErrors = useMemo(() => {
    const e: { leafNo?: string } = {}
    const raw = accountLeafNo.trim()
    if (!raw) {
      e.leafNo = "Leaf no. is required."
      return e
    }
    if (!/^\d+$/.test(raw)) {
      e.leafNo = "Enter a positive whole leaf number."
      return e
    }
    const n = Number.parseInt(raw, 10)
    if (n < 1) {
      e.leafNo = "Leaf no. must be at least 1."
    }
    return e
  }, [accountLeafNo])

  const canAccount = !accountErrors.leafNo

  const editErrors = useMemo(() => {
    const e: {
      bookNo?: string
      leafFrom?: string
      leafTo?: string
      employee?: string
      newEmployeeName?: string
      newEmployeeRole?: string
      assignBlocked?: string
    } = {}

    if (!editBookNo.trim()) e.bookNo = "Book No is required."

    const fromTrim = editLeafFrom.trim()
    const toTrim = editLeafTo.trim()
    if (fromTrim || toTrim) {
      const from = Number.parseInt(fromTrim, 10)
      const to = Number.parseInt(toTrim, 10)

      if (!fromTrim) e.leafFrom = "Leaf from is required when leaf to is set."
      else if (!Number.isInteger(from))
        e.leafFrom = "Leaf from must be a number."

      if (!toTrim) e.leafTo = "Leaf to is required when leaf from is set."
      else if (!Number.isInteger(to)) e.leafTo = "Leaf to must be a number."

      if (!e.leafFrom && !e.leafTo && to < from) {
        e.leafTo = "Leaf to must be greater than or equal to leaf from."
      }

      if (!e.leafFrom && !e.leafTo) {
        const conflict = findLeafOverlap(apiBooks, from, to, editBookId)
        if (conflict) {
          e.leafTo = `Leaves ${from}-${to} overlap with book ${conflict.book_number} (leaves ${conflict.leaf_no_from}-${conflict.leaf_no_to}). Choose a range starting after ${conflict.leaf_no_to}.`
        }
      }
    }

    if (editEmployeeId === "__new__") {
      if (!editNewEmployeeName.trim()) e.newEmployeeName = "Name is required."
      if (!editNewEmployeeRole.trim()) e.newEmployeeRole = "Role is required."
    } else if (editEmployeeId) {
      const id = Number.parseInt(editEmployeeId, 10)
      if (!Number.isInteger(id) || !employees.some((emp) => emp.id === id)) {
        e.employee = "Invalid employee selection."
      }
    }

    if (editEmployeeId && !e.leafFrom && !e.leafTo) {
      const apiBook = apiBooks.find((b) => b.id === editBookId)
      if (apiBook) {
        const from = fromTrim
          ? Number.parseInt(fromTrim, 10)
          : apiBook.leaf_no_from
        const to = toTrim ? Number.parseInt(toTrim, 10) : apiBook.leaf_no_to
        const updatedBook: Book = {
          ...apiBook,
          leaf_no_from: from,
          leaf_no_to: to,
        }
        const span = displayLeafSpanForBook(updatedBook)
        const minLeaf = minAssignableLeaf(updatedBook, consumptions)
        if (minLeaf > span.to) {
          e.assignBlocked =
            "Every leaf in this book is already accounted through the end of the range. Nothing left to assign."
        }
      }
    }

    return e
  }, [
    editBookNo,
    editLeafFrom,
    editLeafTo,
    apiBooks,
    editBookId,
    editEmployeeId,
    editNewEmployeeName,
    editNewEmployeeRole,
    employees,
    consumptions,
  ])

  const canEditSave =
    !editErrors.bookNo &&
    !editErrors.leafFrom &&
    !editErrors.leafTo &&
    !editErrors.employee &&
    !editErrors.newEmployeeName &&
    !editErrors.newEmployeeRole &&
    !editErrors.assignBlocked

  function bookTotalLeaves(b: BookRow) {
    return b.leafCount
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

  function resetAssignFormKeepEmployee() {
    setAssignBookNo("")
    setAssignLeafFrom("")
    setAssignNewBook(false)
  }

  function resetAccountForm() {
    setAccountLeafNo("")
  }

  async function accountSingleLeaf(): Promise<boolean> {
    if (!canAccount) return false
    const leafNum = Number.parseInt(accountLeafNo.trim(), 10)
    const key = String(leafNum)
    setBusy(true)
    setAccountActionError(null)
    try {
      await accountConsumptionLeaf(key)
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

      const span = displayLeafSpanForBook(apiBook)
      const minLeaf = minAssignableLeaf(apiBook, consumptions)
      const fromL = assignNewBook ? minLeaf : Math.max(leafFromNum!, minLeaf)
      const endL = span.to

      if (fromL > endL) {
        setAssignActionError(
          "No leaves left to assign in this book (all accounted through the end of the range)."
        )
        return false
      }

      // Only update consumption rows — do not change book.leaf_no_from, or later
      // assignments would shrink the visible range and hide leaves assigned earlier.

      for (let L = fromL; L <= endL; L++) {
        await upsertConsumptionAssignment(apiBook.id, String(L), {
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

  function resetFormKeepOffice() {
    setBookNo("")
    setLeafFrom("")
    setLeafTo("")
    setAssignedTo("")
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
        in_floor: true,
      })

      const emp = empName ? matchEmployee(employees, empName) : undefined
      const userIdForLeaves = emp?.id ?? null

      try {
        for (let L = from; L <= to; L++) {
          await createConsumption({
            book_id: created.id,
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

  async function toggleInFloor(row: BookRow) {
    const apiBook = apiBooks.find((b) => b.id === row.dbId)
    if (!apiBook) return
    setBusy(true)
    try {
      await updateBook(
        apiBook.id,
        bookToUpdateBody({ ...apiBook, in_floor: !apiBook.in_floor })
      )
      await onReload()
    } finally {
      setBusy(false)
    }
  }

  function openEditDialog(b: BookRow) {
    const apiBook = apiBooks.find((x) => x.id === b.dbId)
    if (!apiBook) return
    setEditBookId(apiBook.id)
    setEditBookNo(apiBook.book_number)
    setEditOfficeId(apiBook.office_id !== null ? String(apiBook.office_id) : "")
    setEditLeafFrom(
      apiBook.leaf_no_from !== null ? String(apiBook.leaf_no_from) : ""
    )
    setEditLeafTo(apiBook.leaf_no_to !== null ? String(apiBook.leaf_no_to) : "")
    setEditEmployeeId("")
    setEditNewEmployeeName("")
    setEditNewEmployeeRole("")
    setEditActionError(null)
    setEditDialogOpen(true)
  }

  async function saveEdit(): Promise<boolean> {
    if (!canEditSave || editBookId === null) return false
    const apiBook = apiBooks.find((b) => b.id === editBookId)
    if (!apiBook) return false

    const officeIdNum = editOfficeId ? Number.parseInt(editOfficeId, 10) : null
    const fromTrim = editLeafFrom.trim()
    const toTrim = editLeafTo.trim()
    const leafFromNum = fromTrim ? Number.parseInt(fromTrim, 10) : null
    const leafToNum = toTrim ? Number.parseInt(toTrim, 10) : null

    setBusy(true)
    setEditActionError(null)
    try {
      await updateBook(editBookId, {
        office_id: officeIdNum,
        book_number: editBookNo.trim(),
        initial_assigned_date: apiBook.initial_assigned_date,
        leaf_no_from: leafFromNum,
        leaf_no_to: leafToNum,
        book_status: apiBook.book_status,
        in_floor: apiBook.in_floor,
      })

      if (editEmployeeId) {
        let empId: number
        if (editEmployeeId === "__new__") {
          const created = await createEmployee({
            name: editNewEmployeeName.trim(),
            role: editNewEmployeeRole.trim(),
          })
          empId = created.id
        } else {
          empId = Number.parseInt(editEmployeeId, 10)
        }

        const updatedBook: Book = {
          ...apiBook,
          leaf_no_from: leafFromNum,
          leaf_no_to: leafToNum,
        }
        const span = displayLeafSpanForBook(updatedBook)
        const minLeaf = minAssignableLeaf(updatedBook, consumptions)
        const today = dateIsoLocal()

        for (let L = minLeaf; L <= span.to; L++) {
          await upsertConsumptionAssignment(editBookId, String(L), {
            user_id: empId,
            assigned_date: today,
            accounted: false,
            accounted_date: null,
          })
        }
      }

      await onReload()
      return true
    } catch (err) {
      setEditActionError(
        err instanceof Error ? err.message : "Failed to update book"
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-10">
      {detailBookId ? (
        detailBook ? (
          <div className="flex max-h-[calc(100vh-8rem)] min-h-0 flex-col">
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setDetailBookId(null)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back to books
              </Button>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Book {detailBook.bookNo}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {detailBook.officeName ?? `Office #${detailBook.officeId}`} ·
                  Leaves{" "}
                  {detailBook.hasLeafRange
                    ? `${detailBook.leafFrom}–${detailBook.leafTo} (${detailBook.leafCount})`
                    : `Not assigned (${detailBook.leafCount})`}{" "}
                  · Status: {detailBook.bookStatus}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[100px]">Leaf no.</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Assigned date</TableHead>
                    <TableHead className="w-[100px] text-center">
                      Accounted
                    </TableHead>
                    <TableHead>Accounted date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leafDetailRows.map((row) => (
                    <TableRow key={row.leafNo}>
                      <TableCell className="font-medium tabular-nums">
                        {row.leafNo}
                      </TableCell>
                      <TableCell>{row.assignedTo}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {row.assignedDate ? formatDate(row.assignedDate) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={row.accounted}
                            disabled
                            className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-green-600"
                            aria-label={
                              row.accounted
                                ? `Leaf ${row.leafNo} accounted`
                                : `Leaf ${row.leafNo} not accounted`
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {row.accountedDate
                          ? formatDate(row.accountedDate)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setDetailBookId(null)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back to books
            </Button>
            <p className="text-sm text-muted-foreground">Book not found.</p>
          </div>
        )
      ) : (
        <>
          <div className="mb-10 flex justify-between rounded-xl border border-gray-200 bg-gray-50 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                  if (!open && keepAddDialogOpenRef.current) {
                    keepAddDialogOpenRef.current = false
                    setDialogOpen(true)
                    return
                  }
                  setDialogOpen(open)
                  if (open) setAddActionError(null)
                }}
              >
                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Go Back"
                      >
                        <PlusIcon />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add Books</p>
                  </TooltipContent>
                </Tooltip> */}
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
                          // placeholder="e.g. BK-001"
                          aria-invalid={!!errors.bookNo}
                          autoComplete="off"
                        />
                        <FieldError
                          errors={
                            errors.bookNo ? [{ message: errors.bookNo }] : []
                          }
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
                          errors={
                            errors.office ? [{ message: errors.office }] : []
                          }
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
                              errors.leafFrom
                                ? [{ message: errors.leafFrom }]
                                : []
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
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
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
                          Must match a name from Employees. Leave empty to
                          assign later.
                        </FieldDescription>
                        <FieldError
                          errors={
                            errors.assignee
                              ? [{ message: errors.assignee }]
                              : []
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
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()

                          keepAddDialogOpenRef.current = true
                          const ok = await addBook()
                          if (!ok) return
                          resetFormKeepOffice()
                          setDialogOpen(true)
                          setTimeout(() => {
                            keepAddDialogOpenRef.current = false
                          }, 0)
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
                {/* <Tooltip>
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
                </Tooltip> */}

                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Assign book</DialogTitle>
                    <DialogDescription>
                      Pick a book and an employee from the list, or add someone
                      new. Optionally change the starting leaf.
                    </DialogDescription>
                  </DialogHeader>

                  {assignActionError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {assignActionError}
                    </p>
                  ) : null}

                  <FieldGroup>
                    <Field data-invalid={!!assignErrors.bookNo}>
                      <FieldLabel htmlFor="assign-book-no">
                        Book number
                      </FieldLabel>
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
                      <FieldLabel htmlFor="assign-employee">
                        Assigned to
                      </FieldLabel>
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
                              // placeholder="e.g. Clerk"
                              autoComplete="off"
                              aria-invalid={!!assignErrors.newEmployeeRole}
                            />
                            <FieldDescription>
                              They will be saved to Employees and assigned to
                              this book.
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

                    <Field className="flex-row items-center">
                      <FieldContent>
                        <div className="flex items-center gap-2 rounded-sm border-1 border-gray-500">
                          <Checkbox
                            id="assign-new-book"
                            checked={assignNewBook}
                            onCheckedChange={(v) =>
                              setAssignNewBook(v === true)
                            }
                          />
                        </div>
                      </FieldContent>
                      <FieldLabel htmlFor="assign-new-book">
                        New book
                      </FieldLabel>
                    </Field>

                    <Field
                      data-invalid={!!assignErrors.leafFrom}
                      data-disabled={assignNewBook}
                    >
                      <FieldLabel htmlFor="assign-leaf-from">
                        Leaf from
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="assign-leaf-from"
                          inputMode="numeric"
                          value={assignLeafFrom}
                          onChange={(e) => setAssignLeafFrom(e.target.value)}
                          // placeholder="e.g. 1"
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

                    {assignErrors.assignBlocked ? (
                      <p className="text-sm text-destructive" role="alert">
                        {assignErrors.assignBlocked}
                      </p>
                    ) : null}
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
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canAssign || busy}
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()

                          const ok = await assignBook()
                          if (!ok) return
                          resetAssignFormKeepEmployee()
                          setAssignDialogOpen(true)
                        }}
                      >
                        Assign more
                      </Button>
                    </div>
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
                {/* <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Account leaf"
                      >
                        <EqualIcon />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Account leaf</p>
                  </TooltipContent>
                </Tooltip> */}

                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Account leaf</DialogTitle>
                    <DialogDescription>
                      Enter one leaf number to mark that leaf accounted. It must
                      already exist in consumption and be assigned to someone.
                    </DialogDescription>
                  </DialogHeader>

                  {accountActionError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {accountActionError}
                    </p>
                  ) : null}

                  <FieldGroup>
                    <Field data-invalid={!!accountErrors.leafNo}>
                      <FieldLabel htmlFor="account-leaf-no">
                        Leaf no.
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="account-leaf-no"
                          inputMode="numeric"
                          value={accountLeafNo}
                          onChange={(e) => setAccountLeafNo(e.target.value)}
                          aria-invalid={!!accountErrors.leafNo}
                          autoComplete="off"
                          ref={accountLeafInputRef}
                        />
                        <FieldDescription>
                          Book is inferred from the loaded consumption row for
                          this leaf number.
                        </FieldDescription>
                        <FieldError
                          errors={
                            accountErrors.leafNo
                              ? [{ message: accountErrors.leafNo }]
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
                          const ok = await accountSingleLeaf()
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
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const ok = await accountSingleLeaf()
                          if (!ok) return
                          resetAccountForm()
                          setAccountDialogOpen(true)
                          requestAnimationFrame(() => {
                            accountLeafInputRef.current?.focus()
                          })
                        }}
                      >
                        Account another
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
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setPage(1)
                    }}
                  />
                </Field>
              </ButtonGroup>

              <select
                aria-label="Filter by year"
                className={cn(
                  "h-8 w-auto min-w-27.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
                )}
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All years</option>
                {bookYearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by month"
                className={cn(
                  "h-8 w-auto min-w-32.5 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30"
                )}
                value={monthFilter}
                onChange={(e) => {
                  setMonthFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All months</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" type="button" disabled={busy}>
              Total Books: <span className="font-bold">{books.length}</span>
            </Button>

            <ButtonGroup>
              <Button
                variant={statusFilter === "current" ? "default" : "outline"}
                type="button"
                onClick={() => {
                  setStatusFilter((f) => (f === "current" ? "all" : "current"))
                  setPage(1)
                }}
              >
                Current Books
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                type="button"
                onClick={() => {
                  setStatusFilter((f) =>
                    f === "completed" ? "all" : "completed"
                  )
                  setPage(1)
                }}
              >
                Completed Books
              </Button>
              <Button
                variant={statusFilter === "store" ? "default" : "outline"}
                type="button"
                onClick={() => {
                  setStatusFilter((f) => (f === "store" ? "all" : "store"))
                  setPage(1)
                }}
              >
                Stored Books
              </Button>
            </ButtonGroup>
          </div>

          <Dialog
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open)
              if (open) setEditActionError(null)
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit book</DialogTitle>
                <DialogDescription>
                  Update the office and leaf range for this book, and optionally
                  assign it to an employee.
                </DialogDescription>
              </DialogHeader>

              {editActionError ? (
                <p className="text-sm text-destructive" role="alert">
                  {editActionError}
                </p>
              ) : null}

              <FieldGroup>
                <Field data-invalid={!!editErrors.bookNo}>
                  <FieldLabel htmlFor="edit-book-no">Book No</FieldLabel>
                  <FieldContent>
                    <Input
                      id="edit-book-no"
                      value={editBookNo}
                      onChange={(e) => setEditBookNo(e.target.value)}
                      aria-invalid={!!editErrors.bookNo}
                      autoComplete="off"
                    />
                    <FieldError
                      errors={
                        editErrors.bookNo
                          ? [{ message: editErrors.bookNo }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="edit-book-office">Office</FieldLabel>
                  <FieldContent>
                    <select
                      id="edit-book-office"
                      className={cn(
                        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                      )}
                      value={editOfficeId}
                      onChange={(e) => setEditOfficeId(e.target.value)}
                    >
                      <option value="">No office</option>
                      {offices.map((o) => (
                        <option key={o.id} value={String(o.id)}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </FieldContent>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field data-invalid={!!editErrors.leafFrom}>
                    <FieldLabel htmlFor="edit-leaf-from">Leaf from</FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-leaf-from"
                        inputMode="numeric"
                        value={editLeafFrom}
                        onChange={(e) => setEditLeafFrom(e.target.value)}
                        placeholder="1"
                        aria-invalid={!!editErrors.leafFrom}
                      />
                      <FieldError
                        errors={
                          editErrors.leafFrom
                            ? [{ message: editErrors.leafFrom }]
                            : []
                        }
                      />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={!!editErrors.leafTo}>
                    <FieldLabel htmlFor="edit-leaf-to">Leaf to</FieldLabel>
                    <FieldContent>
                      <Input
                        id="edit-leaf-to"
                        inputMode="numeric"
                        value={editLeafTo}
                        onChange={(e) => setEditLeafTo(e.target.value)}
                        placeholder="50"
                        aria-invalid={!!editErrors.leafTo}
                      />
                      <FieldError
                        errors={
                          editErrors.leafTo
                            ? [{ message: editErrors.leafTo }]
                            : []
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>

                <Field data-invalid={!!editErrors.employee}>
                  <FieldLabel htmlFor="edit-employee">
                    Assign to{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <FieldContent>
                    <select
                      id="edit-employee"
                      className={cn(
                        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
                      )}
                      value={editEmployeeId}
                      onChange={(e) => setEditEmployeeId(e.target.value)}
                      aria-invalid={!!editErrors.employee}
                    >
                      <option value="">No change</option>
                      {employeesSortedForAssign.map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                      <option value="__new__">+ Add new employee…</option>
                    </select>
                    <FieldDescription>
                      Assigns this book&rsquo;s remaining unaccounted leaves to
                      the selected employee.
                    </FieldDescription>
                    <FieldError
                      errors={
                        editErrors.employee
                          ? [{ message: editErrors.employee }]
                          : []
                      }
                    />
                  </FieldContent>
                </Field>

                {editEmployeeId === "__new__" ? (
                  <>
                    <Field data-invalid={!!editErrors.newEmployeeName}>
                      <FieldLabel htmlFor="edit-new-emp-name">
                        New employee name
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          id="edit-new-emp-name"
                          value={editNewEmployeeName}
                          onChange={(e) =>
                            setEditNewEmployeeName(e.target.value)
                          }
                          placeholder="Full name"
                          autoComplete="off"
                          aria-invalid={!!editErrors.newEmployeeName}
                        />
                        <FieldError
                          errors={
                            editErrors.newEmployeeName
                              ? [{ message: editErrors.newEmployeeName }]
                              : []
                          }
                        />
                      </FieldContent>
                    </Field>
                    <Field data-invalid={!!editErrors.newEmployeeRole}>
                      <FieldLabel htmlFor="edit-new-emp-role">Role</FieldLabel>
                      <FieldContent>
                        <Input
                          id="edit-new-emp-role"
                          value={editNewEmployeeRole}
                          onChange={(e) =>
                            setEditNewEmployeeRole(e.target.value)
                          }
                          autoComplete="off"
                          aria-invalid={!!editErrors.newEmployeeRole}
                        />
                        <FieldError
                          errors={
                            editErrors.newEmployeeRole
                              ? [{ message: editErrors.newEmployeeRole }]
                              : []
                          }
                        />
                      </FieldContent>
                    </Field>
                  </>
                ) : null}

                {editErrors.assignBlocked ? (
                  <p className="text-sm text-destructive" role="alert">
                    {editErrors.assignBlocked}
                  </p>
                ) : null}
              </FieldGroup>

              <DialogFooter className="sm:justify-between">
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Close
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={!canEditSave || busy}
                  onClick={async () => {
                    const ok = await saveEdit()
                    if (!ok) return
                    setEditDialogOpen(false)
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book Serial No.</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Leaf No.</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead className="w-[100px] text-center">
                  In Floor
                </TableHead>
                <TableHead className="w-[110px] text-center">
                  Accounted
                </TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    No books match this view.
                  </TableCell>
                </TableRow>
              ) : (
                pagedBooks.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-muted/60"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open leaf details for book ${b.bookNo}`}
                    onClick={() => setDetailBookId(b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setDetailBookId(b.id)
                      }
                    }}
                  >
                    <TableCell className="font-medium">{b.bookNo}</TableCell>
                    <TableCell>
                      {b.officeName ?? `Office #${b.officeId}`}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {b.hasLeafRange ? (
                        <>
                          {b.leafFrom} - {b.leafTo}{" "}
                          <span className="text-muted-foreground">
                            ({b.leafCount})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned ({b.leafCount})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{b.assignedTo ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {b.assignedDate ? formatDate(b.assignedDate) : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div
                        className="flex justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          disabled={busy}
                          checked={b.inFloor}
                          onCheckedChange={() => toggleInFloor(b)}
                          aria-label={`Toggle in floor for book ${b.bookNo}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          disabled
                          checked={isBookFullyAccounted(b)}
                          className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(b)
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {currentBookPage} of {totalBookPages} · {visibleBooks.length}{" "}
              book
              {visibleBooks.length === 1 ? "" : "s"}
            </p>
            <ButtonGroup>
              <Button
                variant="outline"
                type="button"
                disabled={currentBookPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={currentBookPage >= totalBookPages}
                onClick={() => setPage((p) => Math.min(totalBookPages, p + 1))}
              >
                Next
              </Button>
            </ButtonGroup>
          </div>
        </>
      )}
    </div>
  )
}
