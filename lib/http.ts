export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

function metaProp(err: unknown, key: string): string | undefined {
  if (typeof err !== "object" || err === null || !("meta" in err)) return undefined
  const meta = (err as { meta?: unknown }).meta
  if (typeof meta !== "object" || meta === null) return undefined
  const v = (meta as Record<string, unknown>)[key]
  return typeof v === "string" ? v : undefined
}

/**
 * PostgreSQL error code when present (e.g. "23505" unique violation).
 * `query()` runs SQL via `prisma.$queryRawUnsafe`, which wraps DB errors as
 * `PrismaClientKnownRequestError` with `code: "P2010"` and the real
 * Postgres SQLSTATE nested under `.meta.code` — check that first.
 */
export function pgCode(err: unknown): string | undefined {
  const metaCode = metaProp(err, "code")
  if (metaCode) return metaCode

  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code
    return typeof code === "string" ? code : undefined
  }
  return undefined
}

function stringProp(err: unknown, key: string): string | undefined {
  if (typeof err !== "object" || err === null) return undefined
  if (!(key in err)) return undefined
  const v = (err as Record<string, unknown>)[key]
  return typeof v === "string" ? v : undefined
}

/** Strips noisy Prisma `$queryRawUnsafe`/`$executeRawUnsafe` prefix from messages. */
export function cleanDbMessage(message: string): string {
  return message
    .trim()
    .replace(/^Invalid `prisma\.\$(?:query|execute)RawUnsafe\(\)` invocation:\s*/i, "")
    .replace(/^Raw query failed\.\s*/i, "")
    .trim()
}

/**
 * Converts common Postgres errors into human-friendly API messages.
 * Returns null when the error doesn't look like a DB/PG error.
 */
export function humanizePgError(
  err: unknown,
): { status: number; message: string } | null {
  const code = pgCode(err)
  const rawMessage = err instanceof Error ? err.message : stringProp(err, "message")
  // Prisma's wrapped raw-query errors don't carry top-level `detail`/`table`/
  // `constraint` (those are `pg` driver fields); the same info lives in
  // `.meta.message` as a single Postgres detail string.
  const detail = stringProp(err, "detail") ?? metaProp(err, "message")
  const table = stringProp(err, "table")
  const constraint = stringProp(err, "constraint")

  if (!code && !rawMessage) return null
  const msg = rawMessage ? cleanDbMessage(rawMessage) : ""

  if (code === "23505") {
    // unique_violation
    if (detail) {
      // e.g. Key (consignment_no)=(301) already exists.
      const m = /Key\s+\(([^)]+)\)=\(([^)]+)\)\s+already exists\./i.exec(detail)
      if (m) {
        const field = m[1]
        const value = m[2]
        return {
          status: 409,
          message: `That ${field.replace(/_/g, " ")} (${value}) already exists.`,
        }
      }
    }
    if (table === "consumption" || constraint?.includes("consumption")) {
      return { status: 409, message: "That leaf already exists for this book." }
    }
    return { status: 409, message: "That value already exists." }
  }

  if (code === "23503") {
    // foreign_key_violation
    return {
      status: 400,
      message: "That selection is invalid (it references a record that doesn’t exist).",
    }
  }

  if (code === "23514") {
    // check_violation
    return {
      status: 400,
      message: "Some fields are inconsistent (a database validation rule was violated).",
    }
  }

  if (code === "23502") {
    // not_null_violation
    return { status: 400, message: "A required field is missing." }
  }

  if (code === "42804") {
    // datatype_mismatch
    return {
      status: 400,
      message: "One of the fields has the wrong type (for example, an invalid date).",
    }
  }

  // fallback for PG-ish errors: return the cleaned message but avoid leaking internals too much
  if (code && msg) {
    return { status: 400, message: msg }
  }

  return null
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
