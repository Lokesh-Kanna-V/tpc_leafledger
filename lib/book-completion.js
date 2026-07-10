import { query } from "@/lib/db";

/**
 * Sets book_status to completed when *all leaves in the book's declared range*
 * are accounted (accounting order can be random).
 */
export async function refreshBookCompletionStatus(bookId) {
  // c.consignment_no may carry a "YYYY-" year prefix (e.g. "2026-5"); strip it
  // before checking/casting the raw numeric leaf index.
  const result = await query(
    `SELECT
       (b.consignment_no_to - b.consignment_no_from + 1)::int AS expected,
       COUNT(*) FILTER (
         WHERE c.accounted = true
           AND regexp_replace(trim(c.consignment_no::text), '^[0-9]{4}-', '') ~ '^-?[0-9]+$'
           AND regexp_replace(trim(c.consignment_no::text), '^[0-9]{4}-', '')::bigint
             BETWEEN b.consignment_no_from AND b.consignment_no_to
       )::int AS accounted_in_range
     FROM book b
     LEFT JOIN consumption c ON c.book_id = b.id
     WHERE b.id = $1
     GROUP BY b.consignment_no_from, b.consignment_no_to`,
    [bookId],
  );
  const row = result.rows[0];
  const expected = Number(row?.expected ?? 0);
  const accountedInRange = Number(row?.accounted_in_range ?? 0);

  if (expected <= 0) return;

  if (accountedInRange < expected) {
    // Unaccounting a leaf can drop a book below full completion again — move it
    // back to current so it doesn't linger in the completed list. Books manually
    // set to "store" are left alone.
    await query(
      `UPDATE book SET book_status = 'current'::"BookStatus" WHERE id = $1 AND book_status = 'completed'::"BookStatus"`,
      [bookId],
    );
    return;
  }

  await query(`UPDATE book SET book_status = 'completed'::"BookStatus" WHERE id = $1`, [
    bookId,
  ]);
}
