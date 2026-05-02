import type { Book, BookStatus } from "@/lib/api/books"
import type { Consumption } from "@/lib/api/consumption"
import type { Employee } from "@/lib/api/employees"

export type { BookStatus }

export type BookRow = {
  id: string
  dbId: number
  bookNo: string
  leafFrom: number
  leafTo: number
  officeId: number
  officeName?: string
  bookStatus: BookStatus
  assignedTo?: string
  /** Derived: inclusive leaf index for contiguous accounted prefix from leafFrom. */
  accountedThrough: number
}

export type OfficeLite = { id: number; name: string }

export function parseLeafNo(leafNo: string): number | null {
  const n = Number.parseInt(String(leafNo).trim(), 10)
  return Number.isFinite(n) ? n : null
}

export function displayLeafSpanForBook(b: Book): { from: number; to: number } {
  return { from: b.leaf_no_from, to: b.leaf_no_to }
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
      if (c.book_id !== b.id) return false
      const n = parseLeafNo(c.leaf_no)
      return n !== null && n >= displayLeafFrom && n <= displayLeafTo
    })

    const userIds = [
      ...new Set(
        leavesInBook
          .map((l) => l.user_id)
          .filter(
            (id): id is number => typeof id === "number" && Number.isInteger(id)
          )
      ),
    ]
    const names = userIds
      .map((id) => empMap.get(id) ?? `#${id}`)
      .sort((a, b) => a.localeCompare(b))
    const assignedTo = names.length > 0 ? names.join(", ") : undefined

    let accountedThrough = displayLeafFrom - 1
    for (let L = displayLeafFrom; L <= displayLeafTo; L++) {
      const row = leavesInBook.find((c) => parseLeafNo(c.leaf_no) === L)
      if (!row || !row.accounted) break
      accountedThrough = L
    }

    return {
      id: String(b.id),
      dbId: b.id,
      bookNo: b.book_number,
      leafFrom: displayLeafFrom,
      leafTo: displayLeafTo,
      officeId: b.office_id,
      officeName: officeMap.get(b.office_id),
      bookStatus: b.book_status,
      assignedTo,
      accountedThrough,
    }
  })
}
