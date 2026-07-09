import { verifyAdminCredentials } from "@/lib/auth/verify-admin-credentials";
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

export async function DELETE(request, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const lotRow = await query("SELECT lot_number FROM lot WHERE id = $1", [id]);
  const lot = lotRow.rows[0];
  if (!lot) return jsonError("Lot not found", 404);

  // If any book this lot generated has already been assigned to an office
  // or an employee, deleting the lot needs admin credentials — it cascades
  // to delete those books (and their leaves), not just orphan them.
  const assignedCheck = await query(
    `SELECT EXISTS (
       SELECT 1 FROM book b
       WHERE b.lot_number = $1
         AND (
           b.office_id IS NOT NULL
           OR EXISTS (SELECT 1 FROM consumption c WHERE c.book_id = b.id AND c.user_id IS NOT NULL)
         )
     ) AS assigned`,
    [lot.lot_number],
  );
  if (assignedCheck.rows[0]?.assigned) {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // No body sent — treated as missing credentials below.
    }
    const verified = await verifyAdminCredentials(body?.admin_name, body?.admin_password);
    if (!verified.ok) return jsonError(verified.message, 428);
  }

  // book.lot_number now has ON DELETE CASCADE: generated books, and their
  // consumption rows (leaves) and alerts, are deleted along with the lot.
  const result = await query("DELETE FROM lot WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return jsonError("Lot not found", 404);
  return Response.json({ ok: true });
}
