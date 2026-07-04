import { parseResponse } from "@/lib/api/request"

export type Office = {
  id: number
  name: string
  /** Days a book assigned to this office may go unaccounted before it's flagged overdue. */
  leaf_alert_days: number
}

/**
 * GET /api/offices
 */
export async function getOffices(): Promise<Office[]> {
  const response = await fetch("/api/offices", { method: "GET" })
  const data = await parseResponse<Office[]>(response)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/offices
 */
export async function createOffice(body: {
  name: string
  leaf_alert_days?: number
}): Promise<Office> {
  const response = await fetch("/api/offices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Office>(response)
}

/**
 * GET /api/offices/[id]
 */
export async function getOffice(id: number): Promise<Office> {
  const response = await fetch(`/api/offices/${id}`, { method: "GET" })
  return parseResponse<Office>(response)
}

/**
 * PUT /api/offices/[id]
 */
export async function updateOffice(
  id: number,
  body: { name: string; leaf_alert_days: number }
): Promise<Office> {
  const response = await fetch(`/api/offices/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Office>(response)
}

/**
 * DELETE /api/offices/[id]
 */
export async function deleteOffice(id: number): Promise<{ ok: true }> {
  const response = await fetch(`/api/offices/${id}`, { method: "DELETE" })
  return parseResponse<{ ok: true }>(response)
}
