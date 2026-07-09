import type { AdminCredentials } from "@/shared/services/api-client"
import { parseResponse } from "@/shared/services/api-client"

export type BookStatus = "current" | "completed" | "store"

export type Book = {
  id: number
  office_id: number | null
  book_number: string
  initial_assigned_date: string | null
  consignment_no_from: number | null
  consignment_no_to: number | null
  /** Calendar year this book's leaf range belongs to; server-assigned when the range is first set. */
  leaf_year: number | null
  book_status: BookStatus
  in_floor: boolean
}

export type CreateBookInput = {
  office_id: number
  book_number: string
  initial_assigned_date: string | null
  consignment_no_from: number
  consignment_no_to: number
  book_status: BookStatus
  in_floor: boolean
}

// Stock books can lack an office / leaf range until they are assigned.
export type UpdateBookInput = {
  office_id: number | null
  book_number: string
  initial_assigned_date: string | null
  consignment_no_from: number | null
  consignment_no_to: number | null
  book_status: BookStatus
  in_floor: boolean
}

/** Build PUT body from an existing row returned by GET. */
export function bookToUpdateBody(b: Book): UpdateBookInput {
  return {
    office_id: b.office_id,
    book_number: b.book_number,
    initial_assigned_date: b.initial_assigned_date,
    consignment_no_from: b.consignment_no_from,
    consignment_no_to: b.consignment_no_to,
    book_status: b.book_status,
    in_floor: b.in_floor,
  }
}

/**
 * GET /api/books
 */
export async function getBooks(): Promise<Book[]> {
  const response = await fetch("/api/books", { method: "GET" })
  const data = await parseResponse<Book[]>(response)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/books
 */
export async function createBook(body: CreateBookInput): Promise<Book> {
  const response = await fetch("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Book>(response)
}

/**
 * GET /api/books/[id]
 */
export async function getBook(id: number): Promise<Book> {
  const response = await fetch(`/api/books/${id}`, { method: "GET" })
  return parseResponse<Book>(response)
}

/**
 * PUT /api/books/[id]
 */
export async function updateBook(
  id: number,
  body: UpdateBookInput
): Promise<Book> {
  const response = await fetch(`/api/books/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Book>(response)
}

/**
 * DELETE /api/books/[id]
 *
 * If the book is assigned to an office or an employee, the server requires
 * admin credentials — pass them once the caller has them (see
 * ADMIN_CONFIRM_REQUIRED_STATUS in shared/services/api-client).
 */
export async function deleteBook(
  id: number,
  adminCredentials?: AdminCredentials
): Promise<{ ok: true }> {
  const response = await fetch(`/api/books/${id}`, {
    method: "DELETE",
    headers: adminCredentials ? { "Content-Type": "application/json" } : undefined,
    body: adminCredentials
      ? JSON.stringify({
          admin_name: adminCredentials.name,
          admin_password: adminCredentials.password,
        })
      : undefined,
  })
  return parseResponse<{ ok: true }>(response)
}
