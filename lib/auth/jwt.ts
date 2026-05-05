import { SignJWT } from "jose"

import { AUTH_COOKIE_MAX_AGE_SEC } from "./constants"

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim()
  if (!s) throw new Error("JWT_SECRET is not set")
  return new TextEncoder().encode(s)
}

export async function signAuthToken(args: {
  employeeId: number
  role: string
}): Promise<string> {
  const secret = getSecret()
  return new SignJWT({ role: args.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(args.employeeId))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SEC)
    .sign(secret)
}
