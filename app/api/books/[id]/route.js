import { query } from "@/lib/db";
import { asInt, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query(
    "SELECT id, office_id, book_number, initial_assigned_date, leaf_no_from, leaf_no_to, book_status FROM book WHERE id = $1",
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

  try {
    const result = await query(
      `UPDATE book
       SET office_id = $1,
           book_number = $2,
           initial_assigned_date = $3,
           leaf_no_from = $4,
           leaf_no_to = $5,
           book_status = $6
       WHERE id = $7
       RETURNING id, office_id, book_number, initial_assigned_date, leaf_no_from, leaf_no_to, book_status`,
      [
        office_id,
        book_number.trim(),
        dateValue,
        leaf_no_from,
        leaf_no_to,
        book_status,
        id,
      ],
    );
    const book = result.rows[0];
    if (!book) return jsonError("Book not found", 404);
    return Response.json(book);
  } catch (err) {
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

