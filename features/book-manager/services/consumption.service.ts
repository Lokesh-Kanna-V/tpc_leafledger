import { parseResponse } from "@/shared/services/api-client"

export type Consumption = {
  book_id: number | null
  consignment_no: string
  user_id: number | null
  assigned_date: string
  accounted: boolean
  accounted_date: string | null
}

export type CreateConsumptionInput = {
  book_id: number
  consignment_no: string
  /** Null when the leaf exists but is not assigned to an employee yet. */
  user_id: number | null
  assigned_date: string
  accounted?: boolean
  accounted_date: string | null
}

export type UpdateConsumptionInput = {
  user_id: number | null
  assigned_date: string
  accounted: boolean
  accounted_date: string | null
}

export type BulkUpsertConsumptionEntry = {
  consignment_no: string
  user_id: number | null
  assigned_date: string
  accounted: boolean
  accounted_date: string | null
}

function consumptionPath(bookId: number, consignmentNo: string): string {
  return `/api/consumption/${encodeURIComponent(String(bookId))}/${encodeURIComponent(consignmentNo)}`
}

/** Match URL and DB storage (e.g. "05" vs "5"). */
export function canonicalConsignmentNo(consignmentNo: string): string {
  const t = String(consignmentNo).trim()
  if (/^\d+$/.test(t)) return String(Number.parseInt(t, 10))
  return t
}

export async function getConsumptions(): Promise<Consumption[]> {
  const response = await fetch("/api/consumption", { method: "GET" })
  const data = await parseResponse<Consumption[]>(response)
  return Array.isArray(data) ? data : []
}

export async function createConsumption(
  body: CreateConsumptionInput
): Promise<Consumption> {
  const payload: CreateConsumptionInput = {
    ...body,
    consignment_no: canonicalConsignmentNo(body.consignment_no),
  }
  const response = await fetch("/api/consumption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  return parseResponse<Consumption>(response)
}

export async function getConsumption(
  bookId: number,
  consignmentNo: string
): Promise<Consumption> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "GET",
  })
  return parseResponse<Consumption>(response)
}

export async function updateConsumption(
  bookId: number,
  consignmentNo: string,
  body: UpdateConsumptionInput
): Promise<Consumption> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Consumption>(response)
}

export async function deleteConsumption(
  bookId: number,
  consignmentNo: string
): Promise<{ ok: true }> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "DELETE",
  })
  return parseResponse<{ ok: true }>(response)
}

/** Mark one leaf accounted; resolves row in the database by consignment_no only. */
export async function accountConsumptionLeaf(consignmentNo: string): Promise<Consumption> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch("/api/consumption/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consignment_no: key }),
  })
  return parseResponse<Consumption>(response)
}

/** Mark one leaf not accounted; resolves row in the database by consignment_no only. */
export async function unaccountConsumptionLeaf(consignmentNo: string): Promise<Consumption> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch("/api/consumption/unaccount", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consignment_no: key }),
  })
  return parseResponse<Consumption>(response)
}

/**
 * Assign/update every leaf in a book in a single request instead of one
 * network round trip per leaf — used by bulk-assign, which can touch dozens
 * or hundreds of leaves across many books at once.
 */
export async function bulkUpsertConsumptionAssignments(
  bookId: number,
  entries: BulkUpsertConsumptionEntry[]
): Promise<Consumption[]> {
  const response = await fetch("/api/consumption/bulk-upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      book_id: bookId,
      entries: entries.map((e) => ({
        ...e,
        consignment_no: canonicalConsignmentNo(e.consignment_no),
      })),
    }),
  })
  const data = await parseResponse<Consumption[]>(response)
  return Array.isArray(data) ? data : []
}

/** Assign/update one leaf without relying on POST 409 + PUT (legacy rows may not match PUT filters). */
export async function upsertConsumptionAssignment(
  bookId: number,
  consignmentNo: string,
  params: UpdateConsumptionInput
): Promise<Consumption> {
  const key = canonicalConsignmentNo(consignmentNo)
  const response = await fetch("/api/consumption/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      book_id: bookId,
      consignment_no: key,
      user_id: params.user_id ?? null,
      assigned_date: params.assigned_date,
      accounted: params.accounted ?? false,
      accounted_date: params.accounted_date,
    }),
  })
  return parseResponse<Consumption>(response)
}
