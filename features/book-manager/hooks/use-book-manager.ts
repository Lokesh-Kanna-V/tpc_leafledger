"use client"

import { useMemo, useRef, useState } from "react"

import type { Office } from "@/shared/services/offices.service"
import type { Employee } from "@/shared/services/employees.service"
import { createEmployee } from "@/shared/services/employees.service"
import { dateIsoLocal } from "@/shared/lib/date"
import {
  ADMIN_CONFIRM_REQUIRED_STATUS,
  ApiError,
} from "@/shared/services/api-client"
import { toast } from "@/shared/hooks/use-toast"

import type { Book } from "../services/books.service"
import {
  bookToUpdateBody,
  createBook,
  deleteBook,
  updateBook,
} from "../services/books.service"
import type { Consumption } from "../services/consumption.service"
import {
  accountConsumptionLeaf,
  createConsumption,
  unaccountConsumptionLeaf,
  upsertConsumptionAssignment,
} from "../services/consumption.service"
import type { BookRow, BookStatus } from "../types"
import {
  displayLeafSpanForBook,
  minAssignableLeaf,
  parseConsignmentNo,
} from "../helpers/book-rows"
import {
  effectiveLeafYear,
  findLeafOverlap,
  matchEmployee,
} from "../helpers/validation"
import { BOOKS_PAGE_SIZE } from "../config/constants"

type UseBookManagerParams = {
  books: BookRow[]
  apiBooks: Book[]
  employees: Employee[]
  offices: Office[]
  consumptions: Consumption[]
  onReload: () => Promise<void>
}

export function useBookManager({
  books,
  apiBooks,
  employees,
  offices,
  consumptions,
  onReload,
}: UseBookManagerParams) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const keepAddDialogOpenRef = useRef(false)
  function setKeepAddDialogOpen(value: boolean) {
    keepAddDialogOpenRef.current = value
  }
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
  const [accountConsignmentNo, setAccountConsignmentNo] = useState("")
  const [accountLeafTo, setAccountLeafTo] = useState("")
  const accountLeafInputRef = useRef<HTMLInputElement | null>(null)

  const [unaccountDialogOpen, setUnaccountDialogOpen] = useState(false)
  const [unaccountConsignmentNo, setUnaccountConsignmentNo] = useState("")
  const [unaccountLeafTo, setUnaccountLeafTo] = useState("")
  const unaccountLeafInputRef = useRef<HTMLInputElement | null>(null)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editBookId, setEditBookId] = useState<number | null>(null)
  const [editBookNo, setEditBookNo] = useState("")
  const [editOfficeId, setEditOfficeId] = useState("")
  const [editLeafFrom, setEditLeafFrom] = useState("")
  const [editLeafTo, setEditLeafTo] = useState("")
  const [editEmployeeId, setEditEmployeeId] = useState("")
  const [editNewEmployeeName, setEditNewEmployeeName] = useState("")
  const [editNewEmployeeRole, setEditNewEmployeeRole] = useState("")

  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkStep, setBulkStep] = useState<"form" | "leaf">("form")
  const [bulkBookFrom, setBulkBookFrom] = useState("")
  const [bulkBookTo, setBulkBookTo] = useState("")
  const [bulkOfficeId, setBulkOfficeId] = useState("")
  const [bulkEmployeeId, setBulkEmployeeId] = useState("")
  const [bulkNewEmployeeName, setBulkNewEmployeeName] = useState("")
  const [bulkNewEmployeeRole, setBulkNewEmployeeRole] = useState("")
  const [bulkActionError, setBulkActionError] = useState<string | null>(null)
  const [bulkResultMessage, setBulkResultMessage] = useState<string | null>(
    null
  )
  /** Book ids resolved from the Book from/to range once the wizard starts. */
  const [bulkBookIds, setBulkBookIds] = useState<number[]>([])
  /** Subset of bulkBookIds still missing a leaf range, in the order they'll be asked for. */
  const [bulkPendingLeafBookIds, setBulkPendingLeafBookIds] = useState<
    number[]
  >([])
  const [bulkLeafTotal, setBulkLeafTotal] = useState(0)
  const [bulkLeafFrom, setBulkLeafFrom] = useState("")
  const [bulkLeafTo, setBulkLeafTo] = useState("")
  /** Just-saved leaf ranges within the current wizard run, keyed by book id, so the
   * final apply step sees fresh values even before onReload's props re-render. */
  const bulkLeafRangeOverridesRef = useRef<Record<number, Book>>({})

  const [statusFilter, setStatusFilter] = useState<"all" | BookStatus>(
    "current"
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
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
  const [unaccountActionError, setUnaccountActionError] = useState<
    string | null
  >(null)
  const [editActionError, setEditActionError] = useState<string | null>(null)

  const [deleteActionError, setDeleteActionError] = useState<string | null>(
    null
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingDeleteRow, setPendingDeleteRow] = useState<BookRow | null>(
    null
  )
  const [deleteAdminOpen, setDeleteAdminOpen] = useState(false)
  const [deleteAdminError, setDeleteAdminError] = useState<string | null>(
    null
  )
  const [pendingDeleteBookId, setPendingDeleteBookId] = useState<
    number | null
  >(null)

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
      consignmentNo: number
      assignedTo: string
      assignedDate: string | null
      accounted: boolean
      accountedDate: string | null
    }[] = []
    for (let L = b.leafFrom; L <= b.leafTo; L++) {
      const cons = consumptions.find(
        (c) => c.book_id === b.dbId && parseConsignmentNo(c.consignment_no) === L
      )
      rows.push({
        consignmentNo: L,
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

    if (!bookNo.trim()) e.bookNo = "Book No. is required."

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
        const conflict = findLeafOverlap(
          apiBooks,
          from,
          to,
          null,
          new Date().getFullYear()
        )
        if (conflict) {
          e.leafTo = `Leaves ${from}-${to} overlap with book ${conflict.book_number} (leaves ${conflict.consignment_no_from}-${conflict.consignment_no_to}). Choose a range starting after ${conflict.consignment_no_to}.`
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
    () =>
      [...employees]
        .filter((e) => e.role?.trim().toLowerCase() !== "developer")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  )

  const bookYearOptions = useMemo(() => {
    const years = new Set<string>()
    years.add(String(new Date().getFullYear()))
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
      rows = rows.filter(
        (b) => !b.assignedDate || b.assignedDate.slice(0, 4) === yearFilter
      )
    }
    if (monthFilter !== "all") {
      rows = rows.filter(
        (b) => !b.assignedDate || b.assignedDate.slice(5, 7) === monthFilter
      )
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
    const e: { consignmentNo?: string; leafTo?: string } = {}
    const raw = accountConsignmentNo.trim()
    if (!raw) {
      e.consignmentNo = "Consignment no. is required."
    } else {
      const plainMatch = /^\d+$/.test(raw)
      const yearPrefixedMatch = /^\d{4}-\d+$/.test(raw)
      if (!plainMatch && !yearPrefixedMatch) {
        e.consignmentNo = "Enter a consignment number, e.g. 5 or 2026-5."
      } else {
        const n = Number.parseInt(plainMatch ? raw : raw.split("-")[1], 10)
        if (n < 1) e.consignmentNo = "Consignment no. must be at least 1."
      }
    }

    const toRaw = accountLeafTo.trim()
    if (toRaw) {
      if (!/^\d+$/.test(toRaw)) {
        e.leafTo = "Enter a plain consignment number, e.g. 20."
      } else if (!e.consignmentNo) {
        const plainMatch = /^\d+$/.test(raw)
        const fromNum = Number.parseInt(
          plainMatch ? raw : raw.split("-")[1],
          10
        )
        const toNum = Number.parseInt(toRaw, 10)
        if (toNum < fromNum) {
          e.leafTo = "Consignment no. to must be at or after consignment no. from."
        } else if (toNum - fromNum + 1 > 200) {
          e.leafTo = "Range too large — account at most 200 leaves at once."
        }
      }
    }

    return e
  }, [accountConsignmentNo, accountLeafTo])

  const canAccount = !accountErrors.consignmentNo && !accountErrors.leafTo

  const unaccountErrors = useMemo(() => {
    const e: { consignmentNo?: string; leafTo?: string } = {}
    const raw = unaccountConsignmentNo.trim()
    if (!raw) {
      e.consignmentNo = "Consignment no. is required."
    } else {
      const plainMatch = /^\d+$/.test(raw)
      const yearPrefixedMatch = /^\d{4}-\d+$/.test(raw)
      if (!plainMatch && !yearPrefixedMatch) {
        e.consignmentNo = "Enter a consignment number, e.g. 5 or 2026-5."
      } else {
        const n = Number.parseInt(plainMatch ? raw : raw.split("-")[1], 10)
        if (n < 1) e.consignmentNo = "Consignment no. must be at least 1."
      }
    }

    const toRaw = unaccountLeafTo.trim()
    if (toRaw) {
      if (!/^\d+$/.test(toRaw)) {
        e.leafTo = "Enter a plain consignment number, e.g. 20."
      } else if (!e.consignmentNo) {
        const plainMatch = /^\d+$/.test(raw)
        const fromNum = Number.parseInt(
          plainMatch ? raw : raw.split("-")[1],
          10
        )
        const toNum = Number.parseInt(toRaw, 10)
        if (toNum < fromNum) {
          e.leafTo = "Consignment no. to must be at or after consignment no. from."
        } else if (toNum - fromNum + 1 > 200) {
          e.leafTo = "Range too large — unaccount at most 200 leaves at once."
        }
      }
    }

    return e
  }, [unaccountConsignmentNo, unaccountLeafTo])

  const canUnaccount =
    !unaccountErrors.consignmentNo && !unaccountErrors.leafTo

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
        const editingBook = apiBooks.find((b) => b.id === editBookId)
        const conflict = findLeafOverlap(
          apiBooks,
          from,
          to,
          editBookId,
          effectiveLeafYear(editingBook)
        )
        if (conflict) {
          e.leafTo = `Leaves ${from}-${to} overlap with book ${conflict.book_number} (leaves ${conflict.consignment_no_from}-${conflict.consignment_no_to}). Choose a range starting after ${conflict.consignment_no_to}.`
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
          : apiBook.consignment_no_from
        const to = toTrim ? Number.parseInt(toTrim, 10) : apiBook.consignment_no_to
        const updatedBook: Book = {
          ...apiBook,
          consignment_no_from: from,
          consignment_no_to: to,
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

  const bulkFormErrors = useMemo(() => {
    const e: {
      bookFrom?: string
      bookTo?: string
      office?: string
      employee?: string
      newEmployeeName?: string
      newEmployeeRole?: string
    } = {}

    const from = Number.parseInt(bulkBookFrom, 10)
    const to = Number.parseInt(bulkBookTo, 10)

    if (!bulkBookFrom.trim()) e.bookFrom = "Book from is required."
    else if (!Number.isInteger(from))
      e.bookFrom = "Book from must be a whole number."

    if (!bulkBookTo.trim()) e.bookTo = "Book to is required."
    else if (!Number.isInteger(to)) e.bookTo = "Book to must be a whole number."

    if (!e.bookFrom && !e.bookTo && to < from) {
      e.bookTo = "Book to must be greater than or equal to book from."
    }

    if (offices.length === 0) {
      e.office = "No offices available."
    } else if (!bulkOfficeId) {
      e.office = "Office is required."
    }

    if (bulkEmployeeId === "__new__") {
      if (!bulkNewEmployeeName.trim()) e.newEmployeeName = "Name is required."
      if (!bulkNewEmployeeRole.trim()) e.newEmployeeRole = "Role is required."
    }

    return e
  }, [
    bulkBookFrom,
    bulkBookTo,
    bulkOfficeId,
    offices,
    bulkEmployeeId,
    bulkNewEmployeeName,
    bulkNewEmployeeRole,
  ])

  const canStartBulk =
    !bulkFormErrors.bookFrom &&
    !bulkFormErrors.bookTo &&
    !bulkFormErrors.office &&
    !bulkFormErrors.employee &&
    !bulkFormErrors.newEmployeeName &&
    !bulkFormErrors.newEmployeeRole

  const bulkCurrentLeafBookId = bulkPendingLeafBookIds[0] ?? null
  const bulkCurrentLeafBook =
    bulkCurrentLeafBookId !== null
      ? apiBooks.find((b) => b.id === bulkCurrentLeafBookId)
      : undefined

  const bulkLeafMetrics = useMemo(() => {
    const from = Number.parseInt(bulkLeafFrom, 10)
    const to = Number.parseInt(bulkLeafTo, 10)
    const fromValid = Number.isFinite(from)
    const toValid = Number.isFinite(to)
    if (!fromValid || !toValid) {
      return {
        from: fromValid ? from : null,
        to: toValid ? to : null,
        count: 0,
      }
    }
    return { from, to, count: to - from + 1 }
  }, [bulkLeafFrom, bulkLeafTo])

  const bulkLeafErrors = useMemo(() => {
    const e: { leafFrom?: string; leafTo?: string } = {}

    if (!bulkLeafFrom.trim()) e.leafFrom = "Leaf from is required."
    if (!bulkLeafTo.trim()) e.leafTo = "Leaf to is required."

    const { from, to, count } = bulkLeafMetrics
    if (bulkLeafFrom.trim() && from === null)
      e.leafFrom = "Leaf from must be a number."
    if (bulkLeafTo.trim() && to === null) e.leafTo = "Leaf to must be a number."

    if (from !== null && to !== null) {
      if (to < from)
        e.leafTo = "Leaf to must be greater than or equal to leaf from."
      if (count <= 0) e.leafTo = "Leaf range must be at least 1."
      if (count > 50) e.leafTo = "Leaf count cannot exceed 50."

      if (!e.leafTo && bulkCurrentLeafBookId !== null) {
        const conflict = findLeafOverlap(
          apiBooks,
          from,
          to,
          bulkCurrentLeafBookId,
          new Date().getFullYear()
        )
        if (conflict) {
          e.leafTo = `Leaves ${from}-${to} overlap with book ${conflict.book_number} (leaves ${conflict.consignment_no_from}-${conflict.consignment_no_to}). Choose a range starting after ${conflict.consignment_no_to}.`
        }
      }
    }

    return e
  }, [
    bulkLeafFrom,
    bulkLeafTo,
    bulkLeafMetrics,
    apiBooks,
    bulkCurrentLeafBookId,
  ])

  const canSaveBulkLeafRange =
    !bulkLeafErrors.leafFrom && !bulkLeafErrors.leafTo

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
    setAccountConsignmentNo("")
    setAccountLeafTo("")
  }

  /** Accounts a single leaf, or every leaf from accountConsignmentNo through accountLeafTo
   *  (inclusive) when a "to" value is given. Continues past individual failures
   *  (e.g. a leaf with no consumption row) so one bad leaf doesn't block the rest. */
  async function accountLeaves(): Promise<boolean> {
    if (!canAccount) return false
    const fromRaw = accountConsignmentNo.trim()
    const toRaw = accountLeafTo.trim()

    setBusy(true)
    setAccountActionError(null)
    try {
      if (!toRaw) {
        await accountConsumptionLeaf(fromRaw)
        await onReload()
        toast({ title: `Leaf ${fromRaw} accounted`, variant: "success" })
        return true
      }

      const plainMatch = /^\d+$/.test(fromRaw)
      const prefix = plainMatch ? "" : `${fromRaw.split("-")[0]}-`
      const fromNum = Number.parseInt(
        plainMatch ? fromRaw : fromRaw.split("-")[1],
        10
      )
      const toNum = Number.parseInt(toRaw, 10)

      const failures: string[] = []
      let successCount = 0
      for (let L = fromNum; L <= toNum; L++) {
        const leafKey = `${prefix}${L}`
        try {
          await accountConsumptionLeaf(leafKey)
          successCount += 1
        } catch (err) {
          failures.push(
            `${leafKey}: ${err instanceof Error ? err.message : "failed"}`
          )
        }
      }

      await onReload()

      if (failures.length > 0) {
        const total = toNum - fromNum + 1
        const message = `Accounted ${successCount} of ${total} leaf${total === 1 ? "" : "s"}.\n${failures.join("\n")}`
        setAccountActionError(message)
        toast({
          title: "Accounting incomplete",
          description: message,
          variant: "destructive",
        })
        return false
      }
      toast({
        title: `${toNum - fromNum + 1} leaves accounted`,
        variant: "success",
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Accounting failed"
      setAccountActionError(message)
      toast({ title: "Accounting failed", description: message, variant: "destructive" })
      return false
    } finally {
      setBusy(false)
    }
  }

  function resetUnaccountForm() {
    setUnaccountConsignmentNo("")
    setUnaccountLeafTo("")
  }

  /** Unaccounts a single leaf, or every leaf from unaccountConsignmentNo through
   *  unaccountLeafTo (inclusive) when a "to" value is given. Continues past
   *  individual failures so one bad leaf doesn't block the rest. */
  async function unaccountLeaves(): Promise<boolean> {
    if (!canUnaccount) return false
    const fromRaw = unaccountConsignmentNo.trim()
    const toRaw = unaccountLeafTo.trim()

    setBusy(true)
    setUnaccountActionError(null)
    try {
      if (!toRaw) {
        await unaccountConsumptionLeaf(fromRaw)
        await onReload()
        toast({ title: `Leaf ${fromRaw} unaccounted`, variant: "success" })
        return true
      }

      const plainMatch = /^\d+$/.test(fromRaw)
      const prefix = plainMatch ? "" : `${fromRaw.split("-")[0]}-`
      const fromNum = Number.parseInt(
        plainMatch ? fromRaw : fromRaw.split("-")[1],
        10
      )
      const toNum = Number.parseInt(toRaw, 10)

      const failures: string[] = []
      let successCount = 0
      for (let L = fromNum; L <= toNum; L++) {
        const leafKey = `${prefix}${L}`
        try {
          await unaccountConsumptionLeaf(leafKey)
          successCount += 1
        } catch (err) {
          failures.push(
            `${leafKey}: ${err instanceof Error ? err.message : "failed"}`
          )
        }
      }

      await onReload()

      if (failures.length > 0) {
        const total = toNum - fromNum + 1
        const message = `Unaccounted ${successCount} of ${total} leaf${total === 1 ? "" : "s"}.\n${failures.join("\n")}`
        setUnaccountActionError(message)
        toast({
          title: "Unaccounting incomplete",
          description: message,
          variant: "destructive",
        })
        return false
      }
      toast({
        title: `${toNum - fromNum + 1} leaves unaccounted`,
        variant: "success",
      })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unaccounting failed"
      setUnaccountActionError(message)
      toast({ title: "Unaccounting failed", description: message, variant: "destructive" })
      return false
    } finally {
      setBusy(false)
    }
  }

  /** Ensures a consumption row exists (unassigned) for every leaf in [from, to] on
   *  this book, without touching leaves that already have a row. Setting a leaf
   *  range (via Bulk Assign or Edit) must not leave leaves with no row at all —
   *  otherwise accounting them later fails with "No consumption row for leaf". */
  async function backfillConsumptionRange(
    bookId: number,
    leafPrefix: string,
    from: number,
    to: number,
    today: string
  ) {
    const existingLeaves = new Set(
      consumptions
        .filter((c) => Number(c.book_id) === bookId)
        .map((c) => parseConsignmentNo(c.consignment_no))
    )
    for (let L = from; L <= to; L++) {
      if (existingLeaves.has(L)) continue
      try {
        await createConsumption({
          book_id: bookId,
          consignment_no: `${leafPrefix}${L}`,
          user_id: null,
          assigned_date: today,
          accounted: false,
          accounted_date: null,
        })
      } catch {
        // Row already exists (race/legacy data) — nothing to backfill.
      }
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

      // Only update consumption rows — do not change book.consignment_no_from, or later
      // assignments would shrink the visible range and hide leaves assigned earlier.

      const leafPrefix =
        apiBook.leaf_year !== null ? `${apiBook.leaf_year}-` : ""
      for (let L = fromL; L <= endL; L++) {
        await upsertConsumptionAssignment(apiBook.id, `${leafPrefix}${L}`, {
          user_id: empId,
          assigned_date: today,
          accounted: false,
          accounted_date: null,
        })
      }

      await onReload()
      toast({ title: `Book ${apiBook.book_number} assigned`, variant: "success" })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assignment failed"
      setAssignActionError(message)
      toast({ title: "Assignment failed", description: message, variant: "destructive" })
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
        consignment_no_from: from,
        consignment_no_to: to,
        book_status: "current",
        in_floor: true,
      })

      const emp = empName ? matchEmployee(employees, empName) : undefined
      const userIdForLeaves = emp?.id ?? null

      try {
        const leafPrefix =
          created.leaf_year !== null ? `${created.leaf_year}-` : ""
        for (let L = from; L <= to; L++) {
          await createConsumption({
            book_id: created.id,
            consignment_no: `${leafPrefix}${L}`,
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
      toast({ title: `Book ${created.book_number} added`, variant: "success" })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add book"
      setAddActionError(message)
      toast({ title: "Failed to add book", description: message, variant: "destructive" })
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
      toast({ title: `Book ${apiBook.book_number} moved to store`, variant: "success" })
    } catch (err) {
      toast({
        title: "Failed to move book to store",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
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
      toast({
        title: `Book ${apiBook.book_number} marked ${apiBook.in_floor ? "out of floor" : "in floor"}`,
        variant: "success",
      })
    } catch (err) {
      toast({
        title: "Failed to update in-floor status",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  /** Opens the confirm-delete dialog for a book. Books already assigned to an
   *  office or an employee need admin credentials — the server rejects with
   *  ADMIN_CONFIRM_REQUIRED_STATUS, which opens the admin-confirm dialog instead. */
  function deleteBookRow(row: BookRow) {
    if (busy) return
    setPendingDeleteRow(row)
    setDeleteActionError(null)
    setDeleteConfirmOpen(true)
  }

  /** Deletes the book pending confirmation (and, by DB cascade, its leaves). */
  async function confirmDeleteBookRow() {
    if (!pendingDeleteRow) return
    const row = pendingDeleteRow

    setBusy(true)
    setDeleteActionError(null)
    try {
      await deleteBook(row.dbId)
      await onReload()
      toast({ title: `Book ${row.bookNo} deleted`, variant: "success" })
      setDeleteConfirmOpen(false)
      setPendingDeleteRow(null)
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === ADMIN_CONFIRM_REQUIRED_STATUS
      ) {
        setDeleteConfirmOpen(false)
        setPendingDeleteRow(null)
        setPendingDeleteBookId(row.dbId)
        setDeleteAdminError(null)
        setDeleteAdminOpen(true)
      } else {
        const message = err instanceof Error ? err.message : "Failed to delete book"
        setDeleteActionError(message)
        toast({ title: "Failed to delete book", description: message, variant: "destructive" })
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteBookWithAdmin(name: string, password: string) {
    if (pendingDeleteBookId === null) return
    setBusy(true)
    setDeleteAdminError(null)
    try {
      await deleteBook(pendingDeleteBookId, { name, password })
      setDeleteAdminOpen(false)
      setPendingDeleteBookId(null)
      await onReload()
      toast({ title: "Book deleted", variant: "success" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete book"
      setDeleteAdminError(message)
      toast({ title: "Failed to delete book", description: message, variant: "destructive" })
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
      apiBook.consignment_no_from !== null ? String(apiBook.consignment_no_from) : ""
    )
    setEditLeafTo(apiBook.consignment_no_to !== null ? String(apiBook.consignment_no_to) : "")

    const { from: leafFrom, to: leafTo } = displayLeafSpanForBook(apiBook)
    const assignedUserIds = new Set(
      consumptions
        .filter((c) => {
          if (c.book_id !== apiBook.id || typeof c.user_id !== "number") return false
          const n = parseConsignmentNo(c.consignment_no)
          return n !== null && n >= leafFrom && n <= leafTo
        })
        .map((c) => c.user_id as number)
    )
    setEditEmployeeId(
      assignedUserIds.size === 1 ? String([...assignedUserIds][0]) : ""
    )
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
      const savedBook = await updateBook(editBookId, {
        office_id: officeIdNum,
        book_number: editBookNo.trim(),
        initial_assigned_date: apiBook.initial_assigned_date,
        consignment_no_from: leafFromNum,
        consignment_no_to: leafToNum,
        book_status: apiBook.book_status,
        in_floor: apiBook.in_floor,
      })

      if (leafFromNum !== null && leafToNum !== null) {
        const leafPrefix =
          savedBook.leaf_year !== null ? `${savedBook.leaf_year}-` : ""
        await backfillConsumptionRange(
          editBookId,
          leafPrefix,
          leafFromNum,
          leafToNum,
          dateIsoLocal()
        )
      }

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
          consignment_no_from: leafFromNum,
          consignment_no_to: leafToNum,
        }
        const span = displayLeafSpanForBook(updatedBook)
        const minLeaf = minAssignableLeaf(updatedBook, consumptions)
        const today = dateIsoLocal()
        const leafPrefix =
          savedBook.leaf_year !== null ? `${savedBook.leaf_year}-` : ""

        for (let L = minLeaf; L <= span.to; L++) {
          await upsertConsumptionAssignment(editBookId, `${leafPrefix}${L}`, {
            user_id: empId,
            assigned_date: today,
            accounted: false,
            accounted_date: null,
          })
        }
      }

      await onReload()
      toast({ title: `Book ${editBookNo.trim()} updated`, variant: "success" })
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update book"
      setEditActionError(message)
      toast({ title: "Failed to update book", description: message, variant: "destructive" })
      return false
    } finally {
      setBusy(false)
    }
  }

  function resetBulkForm() {
    setBulkStep("form")
    setBulkBookFrom("")
    setBulkBookTo("")
    setBulkOfficeId("")
    setBulkEmployeeId("")
    setBulkNewEmployeeName("")
    setBulkNewEmployeeRole("")
    setBulkActionError(null)
    setBulkResultMessage(null)
    setBulkBookIds([])
    setBulkPendingLeafBookIds([])
    setBulkLeafTotal(0)
    setBulkLeafFrom("")
    setBulkLeafTo("")
    bulkLeafRangeOverridesRef.current = {}
  }

  async function startBulkAssign() {
    if (!canStartBulk) return

    const from = Number.parseInt(bulkBookFrom, 10)
    const to = Number.parseInt(bulkBookTo, 10)
    const year = new Date().getFullYear()

    const matched: number[] = []
    for (let n = from; n <= to; n++) {
      const book = apiBooks.find((b) => b.book_number === `${year}-${n}`)
      if (book) matched.push(book.id)
    }

    if (matched.length === 0) {
      setBulkActionError(
        `No books found numbered ${year}-${from} through ${year}-${to}.`
      )
      return
    }

    const pending = matched.filter((id) => {
      const b = apiBooks.find((bk) => bk.id === id)
      return b?.consignment_no_from === null
    })

    setBulkActionError(null)
    setBulkResultMessage(null)
    setBulkBookIds(matched)
    setBulkPendingLeafBookIds(pending)
    setBulkLeafTotal(pending.length)
    setBulkLeafFrom("")
    setBulkLeafTo("")

    if (pending.length > 0) {
      setBulkStep("leaf")
    } else {
      await finishBulkAssign(matched)
    }
  }

  async function saveBulkLeafRangeForCurrentBook(): Promise<boolean> {
    if (
      !canSaveBulkLeafRange ||
      bulkCurrentLeafBookId === null ||
      !bulkCurrentLeafBook
    )
      return false
    const from = bulkLeafMetrics.from
    const to = bulkLeafMetrics.to
    if (from === null || to === null) return false

    setBusy(true)
    setBulkActionError(null)
    try {
      const updated = await updateBook(bulkCurrentLeafBookId, {
        ...bookToUpdateBody(bulkCurrentLeafBook),
        consignment_no_from: from,
        consignment_no_to: to,
      })
      const leafPrefix = updated.leaf_year !== null ? `${updated.leaf_year}-` : ""
      await backfillConsumptionRange(
        updated.id,
        leafPrefix,
        from,
        to,
        dateIsoLocal()
      )
      const overrides = {
        ...bulkLeafRangeOverridesRef.current,
        [updated.id]: updated,
      }
      bulkLeafRangeOverridesRef.current = overrides
      await onReload()

      const remaining = bulkPendingLeafBookIds.slice(1)
      setBulkPendingLeafBookIds(remaining)
      setBulkLeafFrom("")
      setBulkLeafTo("")

      if (remaining.length === 0) {
        await finishBulkAssign(bulkBookIds, overrides)
      } else {
        toast({ title: `Leaf range saved for book ${bulkCurrentLeafBook.book_number}`, variant: "success" })
      }
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save leaf range"
      setBulkActionError(message)
      toast({ title: "Failed to save leaf range", description: message, variant: "destructive" })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function finishBulkAssign(
    bookIds: number[],
    overrides: Record<number, Book> = {}
  ) {
    setBusy(true)
    setBulkActionError(null)
    try {
      let empId: number | null = null
      if (bulkEmployeeId === "__new__") {
        const created = await createEmployee({
          name: bulkNewEmployeeName.trim(),
          role: bulkNewEmployeeRole.trim(),
        })
        empId = created.id
      } else if (bulkEmployeeId) {
        empId = Number.parseInt(bulkEmployeeId, 10)
      }

      const officeIdNum = Number.parseInt(bulkOfficeId, 10)
      const today = dateIsoLocal()
      let leavesAssigned = 0

      for (const bookId of bookIds) {
        const apiBook =
          overrides[bookId] ?? apiBooks.find((b) => b.id === bookId)
        if (!apiBook) continue

        const savedBook = await updateBook(bookId, {
          ...bookToUpdateBody(apiBook),
          office_id: officeIdNum,
        })

        if (empId !== null) {
          const span = displayLeafSpanForBook(savedBook)
          const minLeaf = minAssignableLeaf(savedBook, consumptions)
          const leafPrefix =
            savedBook.leaf_year !== null ? `${savedBook.leaf_year}-` : ""

          for (let L = minLeaf; L <= span.to; L++) {
            await upsertConsumptionAssignment(bookId, `${leafPrefix}${L}`, {
              user_id: empId,
              assigned_date: today,
              accounted: false,
              accounted_date: null,
            })
            leavesAssigned += 1
          }
        }
      }

      await onReload()
      bulkLeafRangeOverridesRef.current = {}
      const resultMessage =
        `${bookIds.length} book${bookIds.length === 1 ? "" : "s"} assigned to the selected office` +
        (empId !== null ? `, ${leavesAssigned} leaves assigned.` : ".")
      setBulkResultMessage(resultMessage)
      setBulkStep("form")
      setBulkBookIds([])
      setBulkPendingLeafBookIds([])
      toast({ title: "Bulk assignment complete", description: resultMessage, variant: "success" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk assignment failed"
      setBulkActionError(message)
      toast({ title: "Bulk assignment failed", description: message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return {
    // detail view
    detailBookId,
    setDetailBookId,
    detailBook,
    leafDetailRows,

    // add book dialog
    dialogOpen,
    setDialogOpen,
    keepAddDialogOpenRef,
    setKeepAddDialogOpen,
    bookNo,
    setBookNo,
    leafFrom,
    setLeafFrom,
    leafTo,
    setLeafTo,
    assignedTo,
    setAssignedTo,
    officeId,
    setOfficeId,
    errors,
    leafCountLabel,
    canAdd,
    assignedToOptions,
    addActionError,
    setAddActionError,
    resetForm,
    resetFormKeepOffice,
    addBook,

    // assign book dialog
    assignDialogOpen,
    setAssignDialogOpen,
    assignBookNo,
    setAssignBookNo,
    assignEmployeeId,
    setAssignEmployeeId,
    assignNewEmployeeName,
    setAssignNewEmployeeName,
    assignNewEmployeeRole,
    setAssignNewEmployeeRole,
    assignLeafFrom,
    setAssignLeafFrom,
    assignNewBook,
    setAssignNewBook,
    assignErrors,
    canAssign,
    assignActionError,
    setAssignActionError,
    bookNoOptions,
    employeesSortedForAssign,
    resetAssignForm,
    resetAssignFormKeepEmployee,
    assignBook,

    // account leaf dialog
    accountDialogOpen,
    setAccountDialogOpen,
    accountConsignmentNo,
    setAccountConsignmentNo,
    accountLeafTo,
    setAccountLeafTo,
    accountLeafInputRef,
    accountErrors,
    canAccount,
    accountActionError,
    setAccountActionError,
    resetAccountForm,
    accountLeaves,

    // unaccount leaf dialog
    unaccountDialogOpen,
    setUnaccountDialogOpen,
    unaccountConsignmentNo,
    setUnaccountConsignmentNo,
    unaccountLeafTo,
    setUnaccountLeafTo,
    unaccountLeafInputRef,
    unaccountErrors,
    canUnaccount,
    unaccountActionError,
    setUnaccountActionError,
    resetUnaccountForm,
    unaccountLeaves,

    // edit book dialog
    editDialogOpen,
    setEditDialogOpen,
    editBookNo,
    setEditBookNo,
    editOfficeId,
    setEditOfficeId,
    editLeafFrom,
    setEditLeafFrom,
    editLeafTo,
    setEditLeafTo,
    editEmployeeId,
    setEditEmployeeId,
    editNewEmployeeName,
    setEditNewEmployeeName,
    editNewEmployeeRole,
    setEditNewEmployeeRole,
    editErrors,
    canEditSave,
    editActionError,
    setEditActionError,
    openEditDialog,
    saveEdit,

    // bulk assign dialog
    bulkDialogOpen,
    setBulkDialogOpen,
    bulkStep,
    bulkBookFrom,
    setBulkBookFrom,
    bulkBookTo,
    setBulkBookTo,
    bulkOfficeId,
    setBulkOfficeId,
    bulkEmployeeId,
    setBulkEmployeeId,
    bulkNewEmployeeName,
    setBulkNewEmployeeName,
    bulkNewEmployeeRole,
    setBulkNewEmployeeRole,
    bulkActionError,
    bulkResultMessage,
    bulkFormErrors,
    canStartBulk,
    bulkCurrentLeafBook,
    bulkLeafTotal,
    bulkPendingLeafBookIds,
    bulkLeafFrom,
    setBulkLeafFrom,
    bulkLeafTo,
    setBulkLeafTo,
    bulkLeafErrors,
    canSaveBulkLeafRange,
    resetBulkForm,
    startBulkAssign,
    saveBulkLeafRangeForCurrentBook,

    // toolbar / table / pagination
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    yearFilter,
    setYearFilter,
    monthFilter,
    setMonthFilter,
    page,
    setPage,
    bookYearOptions,
    visibleBooks,
    pagedBooks,
    totalBookPages,
    currentBookPage,
    isBookFullyAccounted,
    toggleInFloor,
    moveBookToStore,

    deleteActionError,
    setDeleteActionError,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    pendingDeleteRow,
    deleteAdminOpen,
    setDeleteAdminOpen,
    deleteAdminError,
    pendingDeleteBookId,
    deleteBookRow,
    confirmDeleteBookRow,
    confirmDeleteBookWithAdmin,

    busy,
  }
}
