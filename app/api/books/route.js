import { query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const result = await query(
    "SELECT id, office_id, book_number, initial_assigned_date, consignment_no_from, consignment_no_to, leaf_year, book_status, in_floor FROM book ORDER BY id",
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

  const {
    office_id,
    book_number,
    initial_assigned_date,
    consignment_no_from,
    consignment_no_to,
    book_status,
    in_floor,
  } = body ?? {};

  if (!Number.isInteger(office_id)) return jsonError("office_id is required");
  if (typeof book_number !== "string" || !book_number.trim())
    return jsonError("book_number is required");
  if (!Number.isInteger(consignment_no_from)) return jsonError("consignment_no_from is required");
  if (!Number.isInteger(consignment_no_to)) return jsonError("consignment_no_to is required");
  if (book_status !== "current" && book_status !== "completed" && book_status !== "store") {
    return jsonError("book_status must be one of: current, completed, store");
  }
  const inFloorValue = typeof in_floor === "boolean" ? in_floor : false;

  const dateValue =
    initial_assigned_date === undefined || initial_assigned_date === null
      ? null
      : typeof initial_assigned_date === "string"
        ? initial_assigned_date
        : undefined;
  if (dateValue === undefined) return jsonError("initial_assigned_date must be a string or null");

  // Admins re-enter plain sequential numbers each year; the current year is
  // prefixed automatically, and leaf-range overlap is scoped to the same
  // year so raw leaf numbers can restart at 1 without colliding with
  // previous years' (or pre-existing, unscoped) ranges.
  const year = new Date().getFullYear();
  const bookNumber = `${year}-${book_number.trim()}`;

  const overlap = await query(
    `SELECT book_number, consignment_no_from, consignment_no_to FROM book
     WHERE leaf_year = $1
       AND consignment_no_from IS NOT NULL AND consignment_no_to IS NOT NULL
       AND consignment_no_from <= $2 AND consignment_no_to >= $3
     LIMIT 1`,
    [year, consignment_no_to, consignment_no_from],
  );
  const conflict = overlap.rows[0];
  if (conflict) {
    return jsonError(
      `Leaves ${consignment_no_from}-${consignment_no_to} overlap with book ${conflict.book_number} (leaves ${conflict.consignment_no_from}-${conflict.consignment_no_to}). Choose a range starting after ${conflict.consignment_no_to}.`,
      409,
    );
  }

  const derivedStatus =
    dateValue === null
      ? "store"
      : book_status === "current" || book_status === "completed" || book_status === "store"
        ? book_status
        : "current";

  try {
    const result = await query(
      `INSERT INTO book
        (office_id, book_number, initial_assigned_date, consignment_no_from, consignment_no_to, leaf_year, book_status, in_floor)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7::"BookStatus", $8)
       RETURNING id, office_id, book_number, initial_assigned_date, consignment_no_from, consignment_no_to, leaf_year, book_status, in_floor`,
      [office_id, bookNumber, dateValue, consignment_no_from, consignment_no_to, year, derivedStatus, inFloorValue],
    );
    return Response.json(result.rows[0], { status: 201 });
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    const code = pgCode(err);
    if (code === "23505") return jsonError("book_number already exists", 409);
    if (code === "23503") return jsonError("Invalid office_id", 400);
    if (code === "23514") return jsonError("Invalid leaf range or status", 400);
    return jsonError("Failed to create book", 500);
  }
}

