import { parseResponse } from "@/lib/api/request"

export type Lot = {
  id: number
  lot_number: string
  book_from: number
  book_to: number
  created_at: string
}

export type CreateLotInput = {
  lot_number: string
  book_from: number
  book_to: number
}

export type UpdateLotInput = {
  lot_number: string
}

/**
 * GET /api/lots
 */
export async function getLots(): Promise<Lot[]> {
  const response = await fetch("/api/lots", { method: "GET" })
  const data = await parseResponse<Lot[]>(response)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/lots
 *
 * Creates the lot and generates one stock book per number in
 * [book_from, book_to], each tagged with this lot's lot_number.
 */
export async function createLot(body: CreateLotInput): Promise<Lot> {
  const response = await fetch("/api/lots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Lot>(response)
}

/**
 * PUT /api/lots/[id]
 *
 * Renames the lot; generated books follow via ON UPDATE CASCADE.
 */
export async function updateLot(id: number, body: UpdateLotInput): Promise<Lot> {
  const response = await fetch(`/api/lots/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Lot>(response)
}

/**
 * DELETE /api/lots/[id]
 *
 * Removes the lot; generated books are kept but their lot_number is cleared.
 */
export async function deleteLot(id: number): Promise<{ ok: true }> {
  const response = await fetch(`/api/lots/${id}`, { method: "DELETE" })
  return parseResponse<{ ok: true }>(response)
}
