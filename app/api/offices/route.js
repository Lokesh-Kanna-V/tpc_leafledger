import { query } from "@/lib/db"
import { jsonError, pgCode } from "@/lib/http"

export const runtime = "nodejs"

export async function GET() {
  console.log("GET /api/offices")
  const result = await query("SELECT id, name FROM offices ORDER BY id")
  return Response.json(result.rows)
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const { name } = body ?? {}
  if (typeof name !== "string" || !name.trim())
    return jsonError("name is required")

  try {
    const result = await query(
      "INSERT INTO offices (name) VALUES ($1) RETURNING id, name",
      [name.trim()]
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (err) {
    if (pgCode(err) === "23505")
      return jsonError("Office name already exists", 409)
    return jsonError("Failed to create office", 500)
  }
}
