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
    "SELECT id, lot_number, book_from, book_to, created_at FROM lot WHERE id = $1",
    [id],
  );
  const lot = result.rows[0];
  if (!lot) return jsonError("Lot not found", 404);
  return Response.json(lot);
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

  const { lot_number } = body ?? {};
  if (typeof lot_number !== "string" || !lot_number.trim())
    return jsonError("lot_number is required");

  try {
    const result = await query(
      // book.lot_number FK has ON UPDATE CASCADE, so generated books follow the rename.
      `UPDATE lot SET lot_number = $1 WHERE id = $2
       RETURNING id, lot_number, book_from, book_to, created_at`,
      [lot_number.trim(), id],
    );
    const lot = result.rows[0];
    if (!lot) return jsonError("Lot not found", 404);
    return Response.json(lot);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    if (pgCode(err) === "23505") return jsonError("lot_number already exists", 409);
    return jsonError("Failed to update lot", 500);
  }
}

export async function DELETE(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  // book.lot_number has ON DELETE SET NULL, so generated books are kept.
  const result = await query("DELETE FROM lot WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return jsonError("Lot not found", 404);
  return Response.json({ ok: true });
}
