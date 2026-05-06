import { query } from "@/lib/db";
import { humanizePgError, jsonError } from "@/lib/http";

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

  let leafNorm = leaf_no.trim();
  if (/^\d+$/.test(leafNorm)) {
    leafNorm = String(Number.parseInt(leafNorm, 10));
  }

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
       VALUES ($1, $2, $3, $4::date, $5, $6::date)
       RETURNING book_id, leaf_no, user_id, assigned_date, accounted, accounted_date`,
      [
        book_id,
        leafNorm,
        userIdOrNull,
        assigned_date.trim(),
        accountedValue,
        accountedDateValue,
      ],
    );
    if (userIdOrNull !== null) {
      await query(
        `UPDATE book
         SET book_status = 'current'::"BookStatus",
             initial_assigned_date = COALESCE(initial_assigned_date, $1::date)
         WHERE id = $2`,
        [assigned_date.trim(), book_id],
      );
    }
    return Response.json(result.rows[0], { status: 201 });
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    console.error("POST /api/consumption", err);
    return jsonError("Failed to create consumption", 500);
  }
}
