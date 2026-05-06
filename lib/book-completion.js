import { query } from "@/lib/db";

/**
 * Sets book_status to completed when *all leaves in the book's declared range*
 * are accounted (accounting order can be random).
 */
export async function refreshBookCompletionStatus(bookId) {
  const result = await query(
    `SELECT
       (b.leaf_no_to - b.leaf_no_from + 1)::int AS expected,
       COUNT(*) FILTER (
         WHERE c.accounted = true
           AND trim(c.leaf_no::text) ~ '^-?[0-9]+$'
           AND trim(c.leaf_no::text)::bigint BETWEEN b.leaf_no_from AND b.leaf_no_to
       )::int AS accounted_in_range
     FROM book b
     LEFT JOIN consumption c ON c.book_id = b.id
     WHERE b.id = $1
     GROUP BY b.leaf_no_from, b.leaf_no_to`,
    [bookId],
  );
  const row = result.rows[0];
  const expected = Number(row?.expected ?? 0);
  const accountedInRange = Number(row?.accounted_in_range ?? 0);

  if (expected <= 0) return;
  if (accountedInRange < expected) return;

  await query(`UPDATE book SET book_status = 'completed'::"BookStatus" WHERE id = $1`, [
    bookId,
  ]);
}
