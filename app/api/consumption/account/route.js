import { refreshBookCompletionStatus } from "@/lib/book-completion";
import { query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

function consignmentNoPredicate(leafParam) {
  return `(
    consignment_no::text = $${leafParam}
    OR trim(consignment_no::text) = trim($${leafParam}::text)
    OR (
      trim(consignment_no::text) ~ '^-?[0-9]+$'
      AND trim($${leafParam}::text) ~ '^-?[0-9]+$'
      AND trim(consignment_no::text)::bigint = trim($${leafParam}::text)::bigint
    )
  )`;
}

function normalizeLeaf(consignment_no) {
  const t = String(consignment_no ?? "").trim();
  if (/^\d+$/.test(t)) return String(Number.parseInt(t, 10));
  return t;
}

function dateIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function asBookId(v) {
  if (v === null || v === undefined) return null;
  const n = Number.parseInt(String(v), 10);
  return Number.isInteger(n) ? n : null;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const raw = body?.consignment_no;
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return jsonError("consignment_no is required");
  }

  const leafNorm = normalizeLeaf(String(raw));

  try {
    const found = await query(
      `SELECT book_id, consignment_no, user_id, assigned_date, accounted, accounted_date
       FROM consumption
       WHERE ${consignmentNoPredicate(1)}
       ORDER BY book_id ASC NULLS LAST`,
      [leafNorm],
    );

    const rows = found.rows;
    if (rows.length === 0) {
      return jsonError(`No consumption row for consignment ${leafNorm}.`, 404);
    }

    const bookIds = [
      ...new Set(rows.map((r) => asBookId(r.book_id)).filter((id) => id !== null)),
    ];
    if (bookIds.length > 1) {
      return jsonError(
        "That consignment number exists on more than one book. Fix data or use distinct leaf ranges.",
        409,
      );
    }

    const row = rows[0];
    const bookId = asBookId(row.book_id);
    if (bookId === null) {
      return jsonError("That leaf is not linked to a book yet.", 400);
    }

    if (row.user_id == null) {
      return jsonError("Leaf is not assigned to anyone yet — assign before accounting.", 400);
    }

    if (row.accounted) {
      return jsonError(`Consignment ${leafNorm} is already accounted.`, 400);
    }

    const today = dateIsoLocal();

    const upd = await query(
      `UPDATE consumption
       SET accounted = true,
           accounted_date = $1::date
       WHERE book_id = $2 AND ${consignmentNoPredicate(3)}
       RETURNING book_id, consignment_no, user_id, assigned_date, accounted, accounted_date`,
      [today, bookId, leafNorm],
    );

    const out = upd.rows[0];
    if (!out) {
      return jsonError(`No consumption row for consignment ${leafNorm}.`, 404);
    }

    await refreshBookCompletionStatus(bookId);

    return Response.json(out);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    const code = pgCode(err);
    console.error("POST /api/consumption/account", err);
    if (code === "23514") return jsonError("Invalid accounted_date (check constraint)", 400);
    return jsonError(err instanceof Error ? err.message : "Accounting failed", 500);
  }
}
