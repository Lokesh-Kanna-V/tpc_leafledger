import { query } from "@/lib/db";
import { jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const result = await query(
    `SELECT book_id, leaf_no, user_id, assigned_date, accounted, accounted_date
     FROM consumption
     ORDER BY book_id NULLS LAST, leaf_no`,
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

  const { book_id, leaf_no, user_id, assigned_date, accounted, accounted_date } = body ?? {};

  if (!Number.isInteger(book_id)) return jsonError("book_id is required (integer)");

  if (typeof leaf_no !== "string" || !leaf_no.trim()) return jsonError("leaf_no is required");

  const userIdOrNull = user_id === undefined || user_id === null ? null : user_id;
  if (userIdOrNull !== null && !Number.isInteger(userIdOrNull)) {
    return jsonError("user_id must be an integer or null");
  }
  if (typeof assigned_date !== "string" || !assigned_date.trim())
    return jsonError("assigned_date is required");

  const accountedValue = accounted === undefined ? false : accounted;
  if (typeof accountedValue !== "boolean") return jsonError("accounted must be boolean");

  const accountedDateValue =
    accounted_date === undefined || accounted_date === null
      ? null
      : typeof accounted_date === "string"
        ? accounted_date
        : undefined;
  if (accountedDateValue === undefined) return jsonError("accounted_date must be a string or null");

  if (accountedValue && !accountedDateValue) {
    return jsonError("accounted_date is required when accounted is true");
  }

  try {
    const result = await query(
      `INSERT INTO consumption
        (book_id, leaf_no, user_id, assigned_date, accounted, accounted_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING book_id, leaf_no, user_id, assigned_date, accounted, accounted_date`,
      [
        book_id,
        leaf_no.trim(),
        userIdOrNull,
        assigned_date.trim(),
        accountedValue,
        accountedDateValue,
      ],
    );
    return Response.json(result.rows[0], { status: 201 });
  } catch (err) {
    const code = pgCode(err);
    const detail =
      typeof err === "object" && err !== null && "detail" in err
        ? String(err.detail)
        : "";
    const message =
      err instanceof Error && err.message ? err.message : "Failed to create consumption";

    if (code === "23505") {
      return jsonError("This leaf already exists for this book.", 409);
    }
    if (code === "23503") {
      return jsonError("Invalid user_id (no matching employee) or book_id", 400);
    }
    if (code === "23514") {
      return jsonError("Invalid accounted/accounted_date (check constraint)", 400);
    }
    if (code === "23502") {
      return jsonError(
        "consumption.user_id does not allow NULL. Run: ALTER TABLE consumption ALTER COLUMN user_id DROP NOT NULL;",
        400,
      );
    }
    if (code === "42804" || /type/i.test(message) && /leaf_no|user_id|assigned_date/i.test(message)) {
      return jsonError(
        `Database type mismatch: ${message}${detail ? ` — ${detail}` : ""}`,
        400,
      );
    }

    console.error("POST /api/consumption", message, detail || code || err);
    return jsonError(message, 500);
  }
}
