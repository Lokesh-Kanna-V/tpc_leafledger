import { prisma } from "@/lib/db"

export const runtime = "nodejs"

const OVERDUE_DAYS = 4
const HOUR_MS = 60 * 60 * 1000

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10)
}

async function refreshOverdueAccountingAlerts() {
  const today = new Date()
  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() - OVERDUE_DAYS)

  const books = await prisma.book.findMany({
    where: {
      book_status: "current",
      initial_assigned_date: { not: null, lte: threshold },
      consumptions: { some: { accounted: false } },
    },
    select: {
      id: true,
      initial_assigned_date: true,
      consumptions: {
        where: { accounted: false, user_id: { not: null } },
        select: { employee: { select: { name: true } } },
      },
      _count: {
        select: {
          consumptions: { where: { accounted: false } },
        },
      },
    },
  })

  const overdueByBook = new Map<
    number,
    {
      overdueCount: number
      oldestAssignedDate: string
      daysPassed: number
      assignedTo: string[]
    }
  >()

  for (const b of books) {
    const oldest = b.initial_assigned_date
    if (!oldest) continue

    const daysPassed = Math.max(
      0,
      Math.floor((today.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000)),
    )

    const assignedTo = [
      ...new Set(
        (b.consumptions ?? [])
          .map((c) => c.employee?.name)
          .filter((x): x is string => typeof x === "string" && x.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b))

    overdueByBook.set(b.id, {
      overdueCount: b._count.consumptions,
      oldestAssignedDate: isoDateOnly(oldest),
      daysPassed,
      assignedTo,
    })
  }

  const activeBookIds = [...overdueByBook.keys()]

  // Resolve alerts that are no longer overdue.
  await prisma.alert.updateMany({
    where: {
      type: "ACCOUNTING_OVERDUE",
      resolvedAt: null,
      ...(activeBookIds.length
        ? { book_id: { notIn: activeBookIds } }
        : { book_id: { not: null } }),
    },
    data: { resolvedAt: today },
  })

  // Upsert active alerts per book.
  for (const [bookId, payload] of overdueByBook.entries()) {
    await prisma.alert.upsert({
      where: { type_book_id: { type: "ACCOUNTING_OVERDUE", book_id: bookId } },
      create: {
        type: "ACCOUNTING_OVERDUE",
        book_id: bookId,
        payload,
        resolvedAt: null,
      },
      update: {
        payload,
        resolvedAt: null,
      },
    })
  }
}

async function maybeRefreshAlerts(request: Request) {
  const g = globalThis as unknown as { __alertsLastRunMs?: number }
  const now = Date.now()

  const url = new URL(request.url)
  const force =
    url.searchParams.get("refresh") === "1" || process.env.NODE_ENV !== "production"

  if (!force && g.__alertsLastRunMs && now - g.__alertsLastRunMs < HOUR_MS) return

  try {
    await refreshOverdueAccountingAlerts()
    g.__alertsLastRunMs = now
  } catch (err) {
    console.error("[alerts] refresh failed:", err)
  }
}

export async function GET(request: Request) {
  await maybeRefreshAlerts(request)

  const alerts = await prisma.alert.findMany({
    where: {
      type: "ACCOUNTING_OVERDUE",
      resolvedAt: null,
    },
    include: {
      book: {
        include: {
          office: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  })

  return Response.json(
    alerts.map((a) => ({
      id: a.id,
      type: a.type,
      book_id: a.book_id,
      resolvedAt: a.resolvedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      payload: a.payload,
      book: a.book
        ? {
            id: a.book.id,
            book_number: a.book.book_number,
            office: a.book.office
              ? { id: a.book.office.id, name: a.book.office.name }
              : null,
          }
        : null,
    })),
  )
}

