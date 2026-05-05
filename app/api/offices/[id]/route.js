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

  const result = await query("SELECT id, name FROM offices WHERE id = $1", [id]);
  const office = result.rows[0];
  if (!office) return jsonError("Office not found", 404);
  return Response.json(office);
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

  const { name } = body ?? {};
  if (typeof name !== "string" || !name.trim()) return jsonError("name is required");

  try {
    const result = await query(
      "UPDATE offices SET name = $1 WHERE id = $2 RETURNING id, name",
      [name.trim(), id],
    );
    const office = result.rows[0];
    if (!office) return jsonError("Office not found", 404);
    return Response.json(office);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    if (pgCode(err) === "23505") return jsonError("Office name already exists", 409);
    return jsonError("Failed to update office", 500);
  }
}

export async function DELETE(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query("DELETE FROM offices WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return jsonError("Office not found", 404);
  return Response.json({ ok: true });
}

