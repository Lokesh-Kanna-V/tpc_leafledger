import { ApiError, parseResponse } from "@/lib/api/request"

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

export async function getConsumptions(): Promise<Consumption[]> {
  const response = await fetch("/api/consumption", { method: "GET" })
  const data = await parseResponse<Consumption[]>(response)
  return Array.isArray(data) ? data : []
}

export async function createConsumption(
  body: CreateConsumptionInput
): Promise<Consumption> {
  const response = await fetch("/api/consumption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Consumption>(response)
}

export async function getConsumption(
  bookId: number,
  leafNo: string
): Promise<Consumption> {
  const response = await fetch(consumptionPath(bookId, leafNo), {
    method: "GET",
  })
  return parseResponse<Consumption>(response)
}

export async function updateConsumption(
  bookId: number,
  leafNo: string,
  body: UpdateConsumptionInput
): Promise<Consumption> {
  const response = await fetch(consumptionPath(bookId, leafNo), {
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
  const response = await fetch(consumptionPath(bookId, leafNo), {
    method: "DELETE",
  })
  return parseResponse<{ ok: true }>(response)
}

export async function upsertConsumptionAssignment(
  bookId: number,
  leafNo: string,
  params: UpdateConsumptionInput
): Promise<Consumption> {
  try {
    return await updateConsumption(bookId, leafNo, params)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      try {
        return await createConsumption({
          book_id: bookId,
          leaf_no: leafNo,
          user_id: params.user_id ?? null,
          assigned_date: params.assigned_date,
          accounted: params.accounted ?? false,
          accounted_date: params.accounted_date,
        })
      } catch (e2) {
        if (e2 instanceof ApiError && e2.status === 409) {
          return await updateConsumption(bookId, leafNo, params)
        }
        throw e2
      }
    }
    throw e
  }
}
