import { parseResponse } from "@/shared/services/api-client"

export type AuthEmployee = { id: number; name: string; role: string }

type LoginSuccess = { ok: true; employee: AuthEmployee }
type SignupSuccess = { ok: true; employee: AuthEmployee }

export async function login(params: {
  name: string
  password: string
}): Promise<LoginSuccess> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  return parseResponse<LoginSuccess>(response)
}

export async function signup(params: {
  name: string
  role: string
  password: string
}): Promise<SignupSuccess> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  return parseResponse<SignupSuccess>(response)
}
