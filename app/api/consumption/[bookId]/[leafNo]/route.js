import { query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

function parseBookId(raw) {
  const n = Number.parseInt(String(raw), 10);
  return Number.isInteger(n) ? n : null;
}

/** Param index for leaf in URL (e.g. 2 for GET, 6 for PUT). */
function leafNoPredicate(leafParam) {
  return `(
    leaf_no::text = $${leafParam}
    OR trim(leaf_no::text) = trim($${leafParam}::text)
    OR (
      trim(leaf_no::text) ~ '^-?[0-9]+$'
      AND trim($${leafParam}::text) ~ '^-?[0-9]+$'
      AND trim(leaf_no::text)::bigint = trim($${leafParam}::text)::bigint
    )
  )`;
}

export async function GET(_req, { params }) {
  const { bookId: bookIdRaw, leafNo: leafNoRaw } = await params;
  const bookId = parseBookId(bookIdRaw);
  const leafNo = decodeURIComponent(String(leafNoRaw ?? "")).trim();
  if (bookId === null || !leafNo) return jsonError("Invalid bookId or leafNo");

  const result = await query(
    `SELECT book_id, leaf_no, user_id, assigned_date, accounted, accounted_date
     FROM consumption
     WHERE book_id = $1 AND ${leafNoPredicate(2)}`,
    [bookId, leafNo],
  );
  const row = result.rows[0];
  if (!row) return jsonError("Consumption not found", 404);
  return Response.json(row);
}

export async function PUT(request, { params }) {
  const { bookId: bookIdRaw, leafNo: leafNoRaw } = await params;
  const bookId = parseBookId(bookIdRaw);
  const leafNo = decodeURIComponent(String(leafNoRaw ?? "")).trim();
  if (bookId === null || !leafNo) return jsonError("Invalid bookId or leafNo");

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { user_id, assigned_date, accounted, accounted_date } = body ?? {};

  if (!Object.prototype.hasOwnProperty.call(body ?? {}, "user_id"))
    return jsonError("user_id is required");

  const userIdOrNull = user_id === null ? null : user_id;
  if (userIdOrNull !== null && !Number.isInteger(userIdOrNull)) {
    return jsonError("user_id must be an integer or null");
  }
  if (accounted === true && userIdOrNull === null) {
    return jsonError("user_id is required when accounted is true");
  }
  if (typeof assigned_date !== "string" || !assigned_date.trim())
    return jsonError("assigned_date is required");
  if (typeof accounted !== "boolean") return jsonError("accounted is required");

  const accountedDateValue =
    accounted_date === undefined || accounted_date === null
      ? null
      : typeof accounted_date === "string"
        ? accounted_date
        : undefined;
  if (accountedDateValue === undefined) return jsonError("accounted_date must be a string or null");
  if (accounted && !accountedDateValue) {
    return jsonError("accounted_date is required when accounted is true");
  }

  try {
    const result = await query(
      `UPDATE consumption
       SET user_id = $1,
           assigned_date = $2::date,
           accounted = $3,
           accounted_date = $4::date
       WHERE book_id = $5 AND ${leafNoPredicate(6)}
       RETURNING book_id, leaf_no, user_id, assigned_date, accounted, accounted_date`,
      [userIdOrNull, assigned_date.trim(), accounted, accountedDateValue, bookId, leafNo],
    );
    const row = result.rows[0];
    if (!row) return jsonError("Consumption not found", 404);
    return Response.json(row);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    const code = pgCode(err);
    if (code === "23503") return jsonError("Invalid user_id", 400);
    if (code === "23514") return jsonError("Invalid accounted/accounted_date", 400);
    return jsonError("Failed to update consumption", 500);
  }
}

export async function DELETE(_req, { params }) {
  const { bookId: bookIdRaw, leafNo: leafNoRaw } = await params;
  const bookId = parseBookId(bookIdRaw);
  const leafNo = decodeURIComponent(String(leafNoRaw ?? "")).trim();
  if (bookId === null || !leafNo) return jsonError("Invalid bookId or leafNo");

  const result = await query(
    `DELETE FROM consumption WHERE book_id = $1 AND ${leafNoPredicate(2)} RETURNING leaf_no`,
    [bookId, leafNo],
  );
  if (!result.rows[0]) return jsonError("Consumption not found", 404);
  return Response.json({ ok: true });
}
