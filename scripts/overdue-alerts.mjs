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

  const groups = await prisma.consumption.groupBy({
    by: ["book_id"],
    where: {
      accounted: false,
      assigned_date: { lte: threshold },
      book_id: { not: null },
    },
    _count: { _all: true },
    _min: { assigned_date: true },
  })

  const overdueByBook = new Map()
  for (const g of groups) {
    if (typeof g.book_id !== "number") continue
    const oldest = g._min.assigned_date
    if (!oldest) continue
    const daysOverdue = Math.max(
      0,
      Math.floor((today.getTime() - oldest.getTime()) / (24 * 60 * 60 * 1000)) -
        OVERDUE_DAYS,
    )
    overdueByBook.set(g.book_id, {
      overdueCount: g._count._all,
      oldestAssignedDate: isoDateOnly(oldest),
      daysOverdue,
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

