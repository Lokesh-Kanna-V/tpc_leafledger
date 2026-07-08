import type { Employee } from "@/shared/services/employees.service"
import type { Book } from "../services/books.service"

function normalizeName(s: string): string {
  return s.trim().toLowerCase()
}

export function matchEmployee(
  employees: Employee[],
  name: string
): Employee | undefined {
  const n = normalizeName(name)
  return employees.find((e) => normalizeName(e.name) === n)
}

/** Finds another book in the same leaf-numbering year whose leaf range overlaps [from, to], if any. */
export function findLeafOverlap(
  apiBooks: Book[],
  from: number,
  to: number,
  excludeBookId: number | null,
  year: number | null
): Book | undefined {
  return apiBooks.find(
    (b) =>
      b.id !== excludeBookId &&
      (b.leaf_year ?? null) === year &&
      b.leaf_no_from !== null &&
      b.leaf_no_to !== null &&
      b.leaf_no_from <= to &&
      from <= b.leaf_no_to
  )
}

/**
 * The leaf-numbering year a book's range belongs (or would belong) to: its
 * own leaf_year if set, else the current year for a first-time assignment,
 * else null for a pre-existing untagged (legacy) range.
 */
export function effectiveLeafYear(apiBook: Book | undefined): number | null {
  if (!apiBook) return new Date().getFullYear()
  if (apiBook.leaf_year !== null) return apiBook.leaf_year
  return apiBook.leaf_no_from === null ? new Date().getFullYear() : null
}
