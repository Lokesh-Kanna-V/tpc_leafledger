import { PrismaClient } from "@prisma/client"
import type { QueryResultRow } from "pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Runs a parameterized Postgres query via Prisma (same `$1` placeholders as `pg`).
 * Keeps existing API route SQL working while migrations are managed by Prisma Migrate.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<{ rows: T[] }> {
  try {
    const rows = values?.length
      ? await prisma.$queryRawUnsafe<T[]>(text, ...values)
      : await prisma.$queryRawUnsafe<T[]>(text)
    return { rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : ""
    const looksLikeCachedPlan =
      /cached plan must not change result type/i.test(message)

    if (!looksLikeCachedPlan) throw err

    // Schema/type changes can invalidate prepared statement caches on a live connection.
    // Reset the Prisma client once and retry.
    try {
      await prisma.$disconnect()
    } catch {
      // ignore
    }
    const fresh = createPrismaClient()
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = fresh

    const rows = values?.length
      ? await fresh.$queryRawUnsafe<T[]>(text, ...values)
      : await fresh.$queryRawUnsafe<T[]>(text)
    return { rows }
  }
}
