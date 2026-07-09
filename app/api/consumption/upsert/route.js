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

async function markBookCurrentOnAssignment(bookId, assignedDate) {
  await query(
    `UPDATE book
     SET book_status = 'current'::"BookStatus",
         in_floor = true,
         initial_assigned_date = COALESCE(initial_assigned_date, $1::date)
     WHERE id = $2`,
    [assignedDate, bookId],
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { book_id, consignment_no, user_id, assigned_date, accounted, accounted_date } = body ?? {};

  if (!Number.isInteger(book_id)) return jsonError("book_id is required (integer)");
  if (typeof consignment_no !== "string" || !consignment_no.trim()) return jsonError("consignment_no is required");

  const leafNorm = normalizeLeaf(consignment_no);

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

  const returning =
    "RETURNING book_id, consignment_no, user_id, assigned_date, accounted, accounted_date";

  try {
    let result = await query(
      `UPDATE consumption
       SET user_id = $1,
           assigned_date = $2::date,
           accounted = $3,
           accounted_date = $4::date
       WHERE book_id = $5 AND ${consignmentNoPredicate(6)}
       ${returning}`,
      [
        userIdOrNull,
        assigned_date.trim(),
        accountedValue,
        accountedDateValue,
        book_id,
        leafNorm,
      ],
    );
    if (result.rows[0]) {
      if (userIdOrNull !== null) {
        await markBookCurrentOnAssignment(book_id, assigned_date.trim());
      }
      await refreshBookCompletionStatus(book_id);
      return Response.json(result.rows[0]);
    }

    try {
      result = await query(
        `INSERT INTO consumption
          (book_id, consignment_no, user_id, assigned_date, accounted, accounted_date)
         VALUES ($1, $2, $3, $4::date, $5, $6::date)
         ${returning}`,
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
        await markBookCurrentOnAssignment(book_id, assigned_date.trim());
      }
      await refreshBookCompletionStatus(book_id);
      return Response.json(result.rows[0], { status: 201 });
    } catch (err) {
      if (pgCode(err) !== "23505") throw err;
    }

    result = await query(
      `UPDATE consumption
       SET book_id = $1,
           user_id = $2,
           assigned_date = $3::date,
           accounted = $4,
           accounted_date = $5::date
       WHERE (${consignmentNoPredicate(6)}) AND book_id IS NULL
       ${returning}`,
      [
        book_id,
        userIdOrNull,
        assigned_date.trim(),
        accountedValue,
        accountedDateValue,
        leafNorm,
      ],
    );
    if (result.rows[0]) {
      if (userIdOrNull !== null) {
        await markBookCurrentOnAssignment(book_id, assigned_date.trim());
      }
      await refreshBookCompletionStatus(book_id);
      return Response.json(result.rows[0]);
    }

    const clash = await query(
      `SELECT book_id FROM consumption WHERE ${consignmentNoPredicate(1)} LIMIT 1`,
      [leafNorm],
    );
    const ownerId = clash.rows[0]?.book_id;
    if (ownerId != null && ownerId !== book_id) {
      return jsonError(
        `Consignment ${leafNorm} is already tied to book ${ownerId}. Change leaf ranges or fix the database.`,
        409,
      );
    }

    return jsonError(`Could not upsert consignment ${leafNorm} for book ${book_id}.`, 409);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    const code = pgCode(err);
    console.error("POST /api/consumption/upsert", code || "", err);
    return jsonError("Upsert failed", 500);
  }
}
