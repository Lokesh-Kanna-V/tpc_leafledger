import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/auth/password"
import { query } from "@/lib/db"
import { humanizePgError, jsonError, pgCode } from "@/lib/http"

export const runtime = "nodejs"

type NewEmployee = {
  id: number
  name: string
  role: string
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("Invalid JSON body")
  }

  const name =
    body &&
    typeof body === "object" &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : ""

  const role =
    body &&
    typeof body === "object" &&
    "role" in body &&
    typeof (body as { role: unknown }).role === "string"
      ? (body as { role: string }).role.trim()
      : ""

  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : ""

  if (!name || !role) {
    return jsonError("Name and role are required")
  }

  if (!password) {
    return jsonError("Password is required")
  }

  const hashed = hashPassword(password)

  try {
    const result = await query<NewEmployee>(
      `INSERT INTO employee (name, role, password) VALUES ($1, $2, $3) RETURNING id, name, role`,
      [name, role, hashed],
    )
    const row = result.rows[0]
    if (!row) return jsonError("Failed to create employee", 500)
    return NextResponse.json(
      { ok: true as const, employee: row },
      { status: 201 },
    )
  } catch (err) {
    const human = humanizePgError(err)
    if (human) return jsonError(human.message, human.status)

    if (pgCode(err) === "23505") {
      return jsonError("An employee with this name already exists", 409)
    }
    return jsonError("Failed to sign up", 500)
  }
}
