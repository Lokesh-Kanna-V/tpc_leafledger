import { query } from "@/lib/db"
import { humanizePgError, jsonError, pgCode } from "@/lib/http"

export const runtime = "nodejs"

const DEFAULT_LEAF_ALERT_DAYS = 2

export async function GET() {
  console.log("GET /api/offices")
  const result = await query(
    "SELECT id, name, leaf_alert_days FROM offices ORDER BY id"
  )
  return Response.json(result.rows)
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const { name, leaf_alert_days } = body ?? {}
  if (typeof name !== "string" || !name.trim())
    return jsonError("name is required")
  if (leaf_alert_days !== undefined && !Number.isInteger(leaf_alert_days))
    return jsonError("leaf_alert_days must be a whole number")
  const leafAlertDays =
    leaf_alert_days !== undefined ? leaf_alert_days : DEFAULT_LEAF_ALERT_DAYS
  if (leafAlertDays < 1)
    return jsonError("leaf_alert_days must be at least 1")

  try {
    const result = await query(
      "INSERT INTO offices (name, leaf_alert_days) VALUES ($1, $2) RETURNING id, name, leaf_alert_days",
      [name.trim(), leafAlertDays]
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (err) {
    const human = humanizePgError(err)
    if (human) return jsonError(human.message, human.status)

    if (pgCode(err) === "23505")
      return jsonError("Office name already exists", 409)
    return jsonError("Failed to create office", 500)
  }
}
