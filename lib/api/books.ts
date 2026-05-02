import { parseResponse } from "@/lib/api/request"

export type BookStatus = "current" | "completed" | "store"

export type Book = {
  id: number
  office_id: number
  book_number: string
  initial_assigned_date: string | null
  leaf_no_from: number
  leaf_no_to: number
  book_status: BookStatus
}

export type CreateBookInput = {
  office_id: number
  book_number: string
  initial_assigned_date: string | null
  leaf_no_from: number
  leaf_no_to: number
  book_status: BookStatus
}

export type UpdateBookInput = CreateBookInput

/** Build PUT body from an existing row returned by GET. */
export function bookToUpdateBody(b: Book): UpdateBookInput {
  return {
    office_id: b.office_id,
    book_number: b.book_number,
    initial_assigned_date: b.initial_assigned_date,
    leaf_no_from: b.leaf_no_from,
    leaf_no_to: b.leaf_no_to,
    book_status: b.book_status,
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
 */
export async function deleteBook(id: number): Promise<{ ok: true }> {
  const response = await fetch(`/api/books/${id}`, { method: "DELETE" })
  return parseResponse<{ ok: true }>(response)
}
