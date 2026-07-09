import { verifyPassword } from "./password"
import { query } from "@/lib/db"

type EmployeeRow = {
  id: number
  name: string
  role: string
  password: string | null
}

export type AdminVerifyResult =
  | { ok: true; employeeId: number }
  | { ok: false; message: string }

/**
 * Verifies a name+password pair belongs to an admin/developer employee.
 * Used to re-confirm destructive actions (e.g. deleting an assigned book or
 * lot) independent of the requester's existing session cookie.
 */
export async function verifyAdminCredentials(
  name: unknown,
  password: unknown
): Promise<AdminVerifyResult> {
  const nameTrim = typeof name === "string" ? name.trim() : ""
  const passwordStr = typeof password === "string" ? password : ""
  if (!nameTrim || !passwordStr) {
    return { ok: false, message: "Admin name and password are required." }
  }

  const result = await query<EmployeeRow>(
    `SELECT id, name, role, password FROM employee WHERE LOWER(TRIM(name)) = $1 ORDER BY id LIMIT 1`,
    [nameTrim.toLowerCase()]
  )
  const emp = result.rows[0]
  if (!emp?.password) {
    return { ok: false, message: "Invalid admin name or password." }
  }

  const roleNorm = emp.role.trim().toLowerCase()
  if (roleNorm !== "admin" && roleNorm !== "developer") {
    return { ok: false, message: "Only administrators may confirm this action." }
  }

  if (!verifyPassword(passwordStr, emp.password)) {
    return { ok: false, message: "Invalid admin name or password." }
  }

  return { ok: true, employeeId: emp.id }
}
