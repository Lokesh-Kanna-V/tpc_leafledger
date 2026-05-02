export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

/** PostgreSQL error code when present (e.g. "23505" unique violation). */
export function pgCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
  }
  return undefined
}

/** Parses a route param or other value as a positive integer id. */
export function asInt(value: unknown): number {
  const s =
    value === undefined || value === null ? "" : String(value).trim()
  if (!s) throw new Error("Invalid id")
  const n = Number.parseInt(s, 10)
  if (!Number.isInteger(n) || n < 1) throw new Error("Invalid id")
  return n
}
