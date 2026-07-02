import { NextResponse } from "next/server"

import { AUTH_COOKIE_MAX_AGE_SEC, AUTH_COOKIE_NAME } from "@/lib/auth/constants"
import { signAuthToken } from "@/lib/auth/jwt"
import { verifyPassword } from "@/lib/auth/password"
import { query } from "@/lib/db"
import { jsonError } from "@/lib/http"

export const runtime = "nodejs"

type EmployeeRow = {
  id: number
  name: string
  role: string
  password: string | null
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

  const password =
    body &&
    typeof body === "object" &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : ""

  if (!name || !password) {
    return jsonError("Name and password are required")
  }

  const nameKey = name.toLowerCase()

  let rows: EmployeeRow[]
  try {
    const result = await query<EmployeeRow>(
      `SELECT id, name, role, password FROM employee WHERE LOWER(TRIM(name)) = $1 ORDER BY id LIMIT 1`,
      [nameKey]
    )
    rows = result.rows
  } catch {
    return jsonError("Login failed", 500)
  }

  const emp = rows[0]
  if (!emp?.password) {
    return jsonError("Invalid name or password", 401)
  }

  const roleNorm = emp.role.trim().toLowerCase()
  if (roleNorm !== "admin" && roleNorm !== "developer") {
    return jsonError(
      "Only administrators may sign in to this application.",
      403
    )
  }

  if (!verifyPassword(password, emp.password)) {
    return jsonError("Invalid name or password", 401)
  }

  let token: string
  try {
    token = await signAuthToken({
      employeeId: emp.id,
      role: emp.role.trim(),
    })
  } catch {
    return jsonError(
      "Server configuration error: JWT_SECRET is not set or invalid.",
      500
    )
  }

  const res = NextResponse.json({
    ok: true as const,
    employee: { id: emp.id, name: emp.name, role: emp.role },
  })
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SEC,
  })
  return res
}
