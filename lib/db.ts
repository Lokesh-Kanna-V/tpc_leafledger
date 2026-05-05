import { PrismaClient } from "@prisma/client"
import type { QueryResultRow } from "pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * Runs a parameterized Postgres query via Prisma (same `$1` placeholders as `pg`).
 * Keeps existing API route SQL working while migrations are managed by Prisma Migrate.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<{ rows: T[] }> {
  const rows = values?.length
    ? await prisma.$queryRawUnsafe<T[]>(text, ...values)
    : await prisma.$queryRawUnsafe<T[]>(text)
  return { rows }
}
