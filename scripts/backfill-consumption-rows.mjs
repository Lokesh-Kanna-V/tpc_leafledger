import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DRY_RUN = process.argv.includes("--dry-run")

function isoDateOnly(d) {
  return d.toISOString().slice(0, 10)
}

function parseLeafNo(leafNo) {
  const n = Number.parseInt(String(leafNo).trim().replace(/^\d{4}-/, ""), 10)
  return Number.isFinite(n) ? n : null
}

/**
 * One-time repair for books whose leaf range was set (via Bulk Assign or Edit)
 * before an employee was ever chosen, which left leaves with no `consumption`
 * row at all — causing "No consumption row for leaf" when trying to account
 * them. Inserts a row (unassigned, not accounted) for every leaf in each
 * book's declared range that doesn't already have one. Never touches existing
 * rows.
 */
async function main() {
  const today = new Date(isoDateOnly(new Date()))

  const books = await prisma.book.findMany({
    where: {
      leaf_no_from: { not: null },
      leaf_no_to: { not: null },
    },
    select: {
      id: true,
      book_number: true,
      leaf_no_from: true,
      leaf_no_to: true,
      leaf_year: true,
      consumptions: { select: { leaf_no: true } },
    },
  })

  let totalMissing = 0
  const perBook = []

  for (const b of books) {
    const existing = new Set(
      b.consumptions.map((c) => parseLeafNo(c.leaf_no)).filter((n) => n !== null)
    )
    const prefix = b.leaf_year !== null ? `${b.leaf_year}-` : ""
    const rows = []
    for (let L = b.leaf_no_from; L <= b.leaf_no_to; L++) {
      if (existing.has(L)) continue
      rows.push({
        book_id: b.id,
        leaf_no: `${prefix}${L}`,
        user_id: null,
        assigned_date: today,
        accounted: false,
        accounted_date: null,
      })
    }
    if (rows.length === 0) continue

    totalMissing += rows.length
    perBook.push({ book: b.book_number, missing: rows.length, rows })
  }

  if (perBook.length === 0) {
    console.log("No gaps found — every book's leaf range is fully covered.")
    return
  }

  console.log(
    `${DRY_RUN ? "[dry run] " : ""}Found ${totalMissing} missing consumption row(s) across ${perBook.length} book(s):`
  )
  for (const p of perBook) {
    console.log(`  ${p.book}: +${p.missing}`)
  }

  if (DRY_RUN) {
    console.log("\nRe-run without --dry-run to apply.")
    return
  }

  let created = 0
  for (const p of perBook) {
    const result = await prisma.consumption.createMany({
      data: p.rows,
      skipDuplicates: true,
    })
    created += result.count
  }
  console.log(`\nCreated ${created} consumption row(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
