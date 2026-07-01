import { query } from "@/lib/db";
import { asInt, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query(
    "SELECT id, lot_number, book_from, book_to FROM lot WHERE id = $1",
    [id],
  );
  const lot = result.rows[0];
  if (!lot) return jsonError("Lot not found", 404);
  return Response.json(lot);
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
