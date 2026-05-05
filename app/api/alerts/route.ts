import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
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

