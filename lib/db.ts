import { Pool, type QueryResultRow } from "pg"

const connectionString = process.env.DATABASE_URL

const globalForPg = globalThis as unknown as { __leafledgerPgPool?: Pool }

function createPool(): Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set")
  }
  return new Pool({ connectionString })
}

function getPool(): Pool {
  if (!globalForPg.__leafledgerPgPool) {
    globalForPg.__leafledgerPgPool = createPool()
  }
  return globalForPg.__leafledgerPgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<{ rows: T[] }> {
  const result = await getPool().query<T>(text, values)
  return { rows: result.rows }
}
