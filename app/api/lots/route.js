import { prisma } from "@/lib/db";
import { query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

// Guard against accidentally generating an enormous number of books in one lot.
const MAX_BOOKS_PER_LOT = 10000;

export async function GET() {
  const result = await query(
    `SELECT id, lot_number, book_from, book_to, created_at FROM lot
     ORDER BY
       CASE WHEN lot_number ~ '^[0-9]+$' THEN lot_number::int END DESC NULLS LAST,
       CASE WHEN lot_number ~ '^[0-9]{4}-[0-9]+$'
         THEN split_part(lot_number, '-', 1)::int END DESC NULLS LAST,
       CASE WHEN lot_number ~ '^[0-9]{4}-[0-9]+$'
         THEN split_part(lot_number, '-', 2)::int END DESC NULLS LAST,
       lot_number DESC`,
  );
  return Response.json(result.rows);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { lot_number, book_from, book_to } = body ?? {};

  if (typeof lot_number !== "string" || !lot_number.trim())
    return jsonError("lot_number is required");
  if (!Number.isInteger(book_from)) return jsonError("book_from must be a whole number");
  if (!Number.isInteger(book_to)) return jsonError("book_to must be a whole number");
  if (book_to < book_from)
    return jsonError("book_to must be greater than or equal to book_from");
  if (book_to - book_from + 1 > MAX_BOOKS_PER_LOT)
    return jsonError(`A lot cannot contain more than ${MAX_BOOKS_PER_LOT} books`);

  // Admins re-enter plain sequential numbers (1, 2, 3...) each year; the
  // current year is prefixed automatically so the full value stays unique
  // across years without the admin having to track it.
  const year = new Date().getFullYear();
  const lotNumber = `${year}-${lot_number.trim()}`;

  try {
    const lot = await prisma.$transaction(async (tx) => {
      const lotRows = await tx.$queryRawUnsafe(
        `INSERT INTO lot (lot_number, book_from, book_to)
         VALUES ($1, $2, $3)
         RETURNING id, lot_number, book_from, book_to, created_at`,
        lotNumber,
        book_from,
        book_to,
      );
      // One "store" book per number in the range, tagged with this lot.
      await tx.$executeRawUnsafe(
        `INSERT INTO book (book_number, lot_number, book_status)
         SELECT $4::text || '-' || gs::text, $1, 'store'::"BookStatus"
         FROM generate_series($2::int, $3::int) AS gs`,
        lotNumber,
        book_from,
        book_to,
        String(year),
      );
      return lotRows[0];
    });

    return Response.json(lot, { status: 201 });
  } catch (err) {
    const code = pgCode(err);
    if (code === "23505") {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("lot_number") || message.includes("lot_lot_number"))
        return jsonError("lot_number already exists", 409);
      if (message.includes("book_number") || message.includes("book_book_number"))
        return jsonError(
          "One or more book numbers in that range already exist",
          409,
        );
      return jsonError("That value already exists", 409);
    }

    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);
    return jsonError("Failed to create lot", 500);
  }
}
