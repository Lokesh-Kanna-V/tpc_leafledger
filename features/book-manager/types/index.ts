import type { BookStatus } from "../services/books.service"

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
  /** Whether staff have marked this book as physically in floor (office) use. */
  inFloor: boolean
  assignedTo?: string
  /** Earliest assigned_date among this book's assigned leaves, when multiple employees share the book. */
  assignedDate?: string
  /** Derived: inclusive leaf index for contiguous accounted prefix from leafFrom. */
  accountedThrough: number
  /** Leaves in [leafFrom, leafTo] with a consumption row marked accounted. */
  accountedLeafCount: number
  /** Whether this book has a real consignment_no_from/consignment_no_to assigned (false for unassigned stock books). */
  hasLeafRange: boolean
  /** Total leaves in this book: leafTo - leafFrom + 1 when assigned, else the standard 50-leaf book size. */
  leafCount: number
}

export type OfficeLite = { id: number; name: string }
