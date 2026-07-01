import { parseResponse } from "@/lib/api/request"

export type Employee = {
  id: number
  name: string
  role: string
  office_ids: number[]
}

export type CreateEmployeeInput = {
  name: string
  role: string
  office_ids?: number[]
}

export type UpdateEmployeeInput = CreateEmployeeInput

/**
 * GET /api/employees
 */
export async function getEmployees(): Promise<Employee[]> {
  const response = await fetch("/api/employees", { method: "GET" })
  const data = await parseResponse<Employee[]>(response)
  return Array.isArray(data) ? data : []
}

/**
 * POST /api/employees
 */
export async function createEmployee(
  body: CreateEmployeeInput
): Promise<Employee> {
  const response = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Employee>(response)
}

/**
 * GET /api/employees/[id]
 */
export async function getEmployee(id: number): Promise<Employee> {
  const response = await fetch(`/api/employees/${id}`, { method: "GET" })
  return parseResponse<Employee>(response)
}

/**
 * PUT /api/employees/[id]
 */
export async function updateEmployee(
  id: number,
  body: UpdateEmployeeInput
): Promise<Employee> {
  const response = await fetch(`/api/employees/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return parseResponse<Employee>(response)
}

/**
 * DELETE /api/employees/[id]
 */
export async function deleteEmployee(id: number): Promise<{ ok: true }> {
  const response = await fetch(`/api/employees/${id}`, { method: "DELETE" })
  return parseResponse<{ ok: true }>(response)
}
