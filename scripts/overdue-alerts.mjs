import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ALERT_TYPE = "ACCOUNTING_OVERDUE"
const OVERDUE_DAYS = 4

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10)
}

export async function runOverdueAccountingAlerts() {
  const today = new Date()
  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() - OVERDUE_DAYS)

  // Overdue is based on when the book was first assigned (book.initial_assigned_date),
  // not per-leaf assignment timestamps.
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

  const overdueByBook = new Map()
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
          .filter((x) => typeof x === "string" && x.trim()),
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
      type: ALERT_TYPE,
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
      where: { type_book_id: { type: ALERT_TYPE, book_id: bookId } },
      create: {
        type: ALERT_TYPE,
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

  return { active: activeBookIds.length }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await runOverdueAccountingAlerts()
    console.log(`[alerts] overdue accounting: ${result.active} active`)
  } catch (err) {
    console.error("[alerts] failed:", err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

