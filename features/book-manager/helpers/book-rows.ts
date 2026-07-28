import type { Book } from "../services/books.service"
import type { Consumption } from "../services/consumption.service"
import type { Employee } from "@/shared/services/employees.service"
import type { BookRow, OfficeLite } from "../types"

/** Every physical book has this many leaves before it's assigned a numbered range. */
export const DEFAULT_BOOK_LEAF_COUNT = 100

/** Strips an optional "YYYY-" year prefix (e.g. "2026-5" -> "5") before parsing. */
export function parseConsignmentNo(consignmentNo: string): number | null {
  const trimmed = String(consignmentNo).trim()
  const withoutYear = trimmed.replace(/^\d{4}-/, "")
  const n = Number.parseInt(withoutYear, 10)
  return Number.isFinite(n) ? n : null
}

function consumptionBookId(bookId: Consumption["book_id"]): number | null {
  if (bookId === null || bookId === undefined) return null
  if (typeof bookId === "number" && Number.isInteger(bookId)) return bookId
  const n = Number.parseInt(String(bookId).trim(), 10)
  return Number.isInteger(n) ? n : null
}

export function displayLeafSpanForBook(b: Book): { from: number; to: number } {
  // Stock books may have no leaf range yet; treat as an empty span.
  return { from: b.consignment_no_from ?? 0, to: b.consignment_no_to ?? 0 }
}

/**
 * First leaf index in this book that may receive a (re)assignment:
 * max(accounted leaf in range) + 1, never below the book's range start.
 */
export function minAssignableLeaf(
  apiBook: Book,
  consumptions: Consumption[]
): number {
  const span = displayLeafSpanForBook(apiBook)
  let maxAccounted: number | null = null
  const bid = apiBook.id

  for (const c of consumptions) {
    if (consumptionBookId(c.book_id) !== bid) continue
    if (!c.accounted) continue
    const n = parseConsignmentNo(String(c.consignment_no))
    if (n === null || n < span.from || n > span.to) continue
    maxAccounted = maxAccounted === null ? n : Math.max(maxAccounted, n)
  }

  if (maxAccounted === null) return span.from
  return Math.max(span.from, maxAccounted + 1)
}

export function rowsFromDatabase(
  apiBooks: Book[],
  consumptions: Consumption[],
  employees: Employee[],
  offices: OfficeLite[] = []
): BookRow[] {
  const empMap = new Map(employees.map((e) => [e.id, e.name]))
  const officeMap = new Map(offices.map((o) => [o.id, o.name]))

  return apiBooks.map((b) => {
    const { from: displayLeafFrom, to: displayLeafTo } =
      displayLeafSpanForBook(b)

    const leavesInBook = consumptions.filter((c) => {
      if (consumptionBookId(c.book_id) !== b.id) return false
      const n = parseConsignmentNo(c.consignment_no)
      return n !== null && n >= displayLeafFrom && n <= displayLeafTo
    })

    const assignedRows = leavesInBook.filter(
      (l) => typeof l.user_id === "number" && Number.isInteger(l.user_id)
    )

    const userIds = [...new Set(assignedRows.map((l) => l.user_id as number))]
    const names = userIds
      .map((id) => empMap.get(id) ?? `#${id}`)
      .sort((a, b) => a.localeCompare(b))
    const assignedTo = names.length > 0 ? names.join(", ") : undefined

    // When multiple employees have been assigned leaves in this book, show
    // the earliest assignment date rather than the most recent one.
    const assignedDates = assignedRows
      .map((l) => l.assigned_date)
      .filter((d): d is string => typeof d === "string" && d.trim() !== "")
      .sort()
    const assignedDate = assignedDates.length > 0 ? assignedDates[0] : undefined

    let accountedThrough = displayLeafFrom - 1
    let accountedLeafCount = 0
    for (let L = displayLeafFrom; L <= displayLeafTo; L++) {
      const row = leavesInBook.find((c) => parseConsignmentNo(c.consignment_no) === L)
      if (row?.accounted) accountedLeafCount++
      if (!row || !row.accounted) break
      accountedThrough = L
    }

    const hasLeafRange = b.consignment_no_from !== null && b.consignment_no_to !== null
    const leafCount = hasLeafRange
      ? displayLeafTo - displayLeafFrom + 1
      : DEFAULT_BOOK_LEAF_COUNT

    return {
      id: String(b.id),
      dbId: b.id,
      bookNo: b.book_number,
      leafFrom: displayLeafFrom,
      leafTo: displayLeafTo,
      officeId: b.office_id ?? 0,
      officeName:
        b.office_id === null ? undefined : officeMap.get(b.office_id),
      bookStatus: b.book_status,
      inFloor: b.in_floor,
      assignedTo,
      assignedDate,
      accountedThrough,
      accountedLeafCount,
      hasLeafRange,
      leafCount,
    }
  })
}
