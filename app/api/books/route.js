import { query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const result = await query(
    "SELECT id, office_id, book_number, initial_assigned_date, leaf_no_from, leaf_no_to, book_status FROM book ORDER BY id",
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
    leaf_no_from,
    leaf_no_to,
    book_status,
  } = body ?? {};

  if (!Number.isInteger(office_id)) return jsonError("office_id is required");
  if (typeof book_number !== "string" || !book_number.trim())
    return jsonError("book_number is required");
  if (!Number.isInteger(leaf_no_from)) return jsonError("leaf_no_from is required");
  if (!Number.isInteger(leaf_no_to)) return jsonError("leaf_no_to is required");
  if (book_status !== "current" && book_status !== "completed" && book_status !== "store") {
    return jsonError("book_status must be one of: current, completed, store");
  }

  const dateValue =
    initial_assigned_date === undefined || initial_assigned_date === null
      ? null
      : typeof initial_assigned_date === "string"
        ? initial_assigned_date
        : undefined;
  if (dateValue === undefined) return jsonError("initial_assigned_date must be a string or null");

  const overlap = await query(
    `SELECT book_number, leaf_no_from, leaf_no_to FROM book
     WHERE leaf_no_from IS NOT NULL AND leaf_no_to IS NOT NULL
       AND leaf_no_from <= $1 AND leaf_no_to >= $2
     LIMIT 1`,
    [leaf_no_to, leaf_no_from],
  );
  const conflict = overlap.rows[0];
  if (conflict) {
    return jsonError(
      `Leaves ${leaf_no_from}-${leaf_no_to} overlap with book ${conflict.book_number} (leaves ${conflict.leaf_no_from}-${conflict.leaf_no_to}). Choose a range starting after ${conflict.leaf_no_to}.`,
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
        (office_id, book_number, initial_assigned_date, leaf_no_from, leaf_no_to, book_status)
       VALUES ($1, $2, $3::date, $4, $5, $6::"BookStatus")
       RETURNING id, office_id, book_number, initial_assigned_date, leaf_no_from, leaf_no_to, book_status`,
      [office_id, book_number.trim(), dateValue, leaf_no_from, leaf_no_to, derivedStatus],
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

