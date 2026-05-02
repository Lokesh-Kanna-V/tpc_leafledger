import { parseResponse } from "@/lib/api/request"

export type TestDbSuccess = {
  success: true
  dbTime: unknown
}

/**
 * GET /api/test-db — connectivity check.
 */
export async function getTestDb(): Promise<TestDbSuccess> {
  const response = await fetch("/api/test-db", { method: "GET" })
  return parseResponse<TestDbSuccess>(response)
}
