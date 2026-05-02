import { parseResponse } from "@/lib/api/request"

export type Consumption = {
  book_id: number | null
  leaf_no: string
  user_id: number | null
  assigned_date: string
  accounted: boolean
  accounted_date: string | null
}

export type CreateConsumptionInput = {
  book_id: number
  leaf_no: string
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

function consumptionPath(bookId: number, leafNo: string): string {
  return `/api/consumption/${encodeURIComponent(String(bookId))}/${encodeURIComponent(leafNo)}`
}

/** Match URL and DB storage (e.g. "05" vs "5"). */
export function canonicalLeafNo(leafNo: string): string {
  const t = String(leafNo).trim()
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
    leaf_no: canonicalLeafNo(body.leaf_no),
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
  leafNo: string
): Promise<Consumption> {
  const key = canonicalLeafNo(leafNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "GET",
  })
  return parseResponse<Consumption>(response)
}

export async function updateConsumption(
  bookId: number,
  leafNo: string,
  body: UpdateConsumptionInput
): Promise<Consumption> {
  const key = canonicalLeafNo(leafNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Consumption>(response)
}

export async function deleteConsumption(
  bookId: number,
  leafNo: string
): Promise<{ ok: true }> {
  const key = canonicalLeafNo(leafNo)
  const response = await fetch(consumptionPath(bookId, key), {
    method: "DELETE",
  })
  return parseResponse<{ ok: true }>(response)
}

/** Mark one leaf accounted; resolves row in the database by leaf_no only. */
export async function accountConsumptionLeaf(leafNo: string): Promise<Consumption> {
  const key = canonicalLeafNo(leafNo)
  const response = await fetch("/api/consumption/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leaf_no: key }),
  })
  return parseResponse<Consumption>(response)
}

/** Assign/update one leaf without relying on POST 409 + PUT (legacy rows may not match PUT filters). */
export async function upsertConsumptionAssignment(
  bookId: number,
  leafNo: string,
  params: UpdateConsumptionInput
): Promise<Consumption> {
  const key = canonicalLeafNo(leafNo)
  const response = await fetch("/api/consumption/upsert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      book_id: bookId,
      leaf_no: key,
      user_id: params.user_id ?? null,
      assigned_date: params.assigned_date,
      accounted: params.accounted ?? false,
      accounted_date: params.accounted_date,
    }),
  })
  return parseResponse<Consumption>(response)
}
