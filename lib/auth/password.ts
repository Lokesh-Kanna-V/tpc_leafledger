import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const KEYLEN = 64
const OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

export function hashPassword(plain: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(plain, salt, KEYLEN, OPTIONS)
  return ["scrypt", salt.toString("base64"), hash.toString("base64")].join("$")
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  try {
    const salt = Buffer.from(parts[1], "base64")
    const expected = Buffer.from(parts[2], "base64")
    const actual = scryptSync(plain, salt, expected.length, OPTIONS)
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
