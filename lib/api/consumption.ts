import { ApiError, parseResponse } from "@/lib/api/request"

export type Consumption = {
  leaf_no: string
  user_id: number | null
  assigned_date: string
  accounted: boolean
  accounted_date: string | null
}

export type CreateConsumptionInput = {
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

function consumptionPath(leafNo: string): string {
  return `/api/consumption/${encodeURIComponent(leafNo)}`
}

/**
 * GET /api/consumption
 */
export async function getConsumptions(): Promise<Consumption[]> {
  const response = await fetch("/api/consumption", { method: "GET" })
  const data = await parseResponse<Consumption[]>(response)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/consumption
 */
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

/**
 * GET /api/consumption/[leafNo]
 */
export async function getConsumption(leafNo: string): Promise<Consumption> {
  const response = await fetch(consumptionPath(leafNo), { method: "GET" })
  return parseResponse<Consumption>(response)
}

/**
 * PUT /api/consumption/[leafNo]
 */
export async function updateConsumption(
  leafNo: string,
  body: UpdateConsumptionInput
): Promise<Consumption> {
  const response = await fetch(consumptionPath(leafNo), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Consumption>(response)
}

/**
 * DELETE /api/consumption/[leafNo]
 */
export async function deleteConsumption(
  leafNo: string
): Promise<{ ok: true }> {
  const response = await fetch(consumptionPath(leafNo), { method: "DELETE" })
  return parseResponse<{ ok: true }>(response)
}

/** Create consumption row, or update if `leaf_no` already exists. */
export async function upsertConsumptionAssignment(
  leafNo: string,
  params: UpdateConsumptionInput
): Promise<Consumption> {
  try {
    await getConsumption(leafNo)
    return updateConsumption(leafNo, params)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return createConsumption({
        leaf_no: leafNo,
        user_id: params.user_id ?? null,
        assigned_date: params.assigned_date,
        accounted: params.accounted ?? false,
        accounted_date: params.accounted_date,
      })
    }
    throw e
  }
}
