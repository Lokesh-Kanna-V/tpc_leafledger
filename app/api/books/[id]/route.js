import { query } from "@/lib/db";
import { asInt, humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query(
    "SELECT id, office_id, book_number, initial_assigned_date, consignment_no_from, consignment_no_to, leaf_year, book_status, in_floor FROM book WHERE id = $1",
    [id],
  );
  const book = result.rows[0];
  if (!book) return jsonError("Book not found", 404);
  return Response.json(book);
}

export async function PUT(request, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

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

  // Stock books may not have an office or leaf range yet, so null is allowed.
  if (office_id !== null && !Number.isInteger(office_id))
    return jsonError("office_id must be a whole number or null");
  if (typeof book_number !== "string" || !book_number.trim())
    return jsonError("book_number is required");
  if (consignment_no_from !== null && !Number.isInteger(consignment_no_from))
    return jsonError("consignment_no_from must be a whole number or null");
  if (consignment_no_to !== null && !Number.isInteger(consignment_no_to))
    return jsonError("consignment_no_to must be a whole number or null");
  if (book_status !== "current" && book_status !== "completed" && book_status !== "store") {
    return jsonError("book_status must be one of: current, completed, store");
  }
  if (typeof in_floor !== "boolean")
    return jsonError("in_floor must be a boolean");

  const dateValue =
    initial_assigned_date === undefined || initial_assigned_date === null
      ? null
      : typeof initial_assigned_date === "string"
        ? initial_assigned_date
        : undefined;
  if (dateValue === undefined) return jsonError("initial_assigned_date must be a string or null");

  const existing = await query(
    "SELECT consignment_no_from, leaf_year FROM book WHERE id = $1",
    [id],
  );
  if (!existing.rows[0]) return jsonError("Book not found", 404);
  const wasUnassigned = existing.rows[0].consignment_no_from === null;
  const existingLeafYear = existing.rows[0].leaf_year;

  // A book keeps the year its leaf range was first assigned in; only a
  // first-time assignment (no consignment_no_from yet) picks up the current year.
  // Pre-existing rows with a range but no leaf_year (legacy data) stay
  // scoped to the untagged "legacy" pool rather than the current year.
  const effectiveYear =
    existingLeafYear ?? (wasUnassigned ? new Date().getFullYear() : null);
  const nextLeafYear =
    consignment_no_from !== null && consignment_no_to !== null ? effectiveYear : existingLeafYear;

  if (consignment_no_from !== null && consignment_no_to !== null) {
    const overlap = await query(
      `SELECT book_number, consignment_no_from, consignment_no_to FROM book
       WHERE id != $1
         AND leaf_year IS NOT DISTINCT FROM $2
         AND consignment_no_from IS NOT NULL AND consignment_no_to IS NOT NULL
         AND consignment_no_from <= $3 AND consignment_no_to >= $4
       LIMIT 1`,
      [id, effectiveYear, consignment_no_to, consignment_no_from],
    );
    const conflict = overlap.rows[0];
    if (conflict) {
      return jsonError(
        `Leaves ${consignment_no_from}-${consignment_no_to} overlap with book ${conflict.book_number} (leaves ${conflict.consignment_no_from}-${conflict.consignment_no_to}). Choose a range starting after ${conflict.consignment_no_to}.`,
        409,
      );
    }
  }

  try {
    const result = await query(
      `UPDATE book
       SET office_id = $1,
           book_number = $2,
           initial_assigned_date = $3::date,
           consignment_no_from = $4,
           consignment_no_to = $5,
           leaf_year = $6,
           book_status = $7::"BookStatus",
           in_floor = $8
       WHERE id = $9
       RETURNING id, office_id, book_number, initial_assigned_date, consignment_no_from, consignment_no_to, leaf_year, book_status, in_floor`,
      [
        office_id,
        book_number.trim(),
        dateValue,
        consignment_no_from,
        consignment_no_to,
        nextLeafYear,
        book_status,
        in_floor,
        id,
      ],
    );
    const book = result.rows[0];
    if (!book) return jsonError("Book not found", 404);
    return Response.json(book);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    const code = pgCode(err);
    if (code === "23505") return jsonError("book_number already exists", 409);
    if (code === "23503") return jsonError("Invalid office_id", 400);
    if (code === "23514") return jsonError("Invalid leaf range or status", 400);
    return jsonError("Failed to update book", 500);
  }
}

export async function DELETE(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query("DELETE FROM book WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return jsonError("Book not found", 404);
  return Response.json({ ok: true });
}

