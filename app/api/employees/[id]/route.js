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

  const result = await query("SELECT id, name, role FROM employee WHERE id = $1", [id]);
  const employee = result.rows[0];
  if (!employee) return jsonError("Employee not found", 404);
  return Response.json(employee);
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

  const { name, role } = body ?? {};
  if (typeof name !== "string" || !name.trim()) return jsonError("name is required");
  if (typeof role !== "string" || !role.trim()) return jsonError("role is required");

  try {
    const result = await query(
      "UPDATE employee SET name = $1, role = $2 WHERE id = $3 RETURNING id, name, role",
      [name.trim(), role.trim(), id],
    );
    const employee = result.rows[0];
    if (!employee) return jsonError("Employee not found", 404);
    return Response.json(employee);
  } catch {
    return jsonError("Failed to update employee", 500);
  }
}

export async function DELETE(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query("DELETE FROM employee WHERE id = $1 RETURNING id", [id]);
  if (!result.rows[0]) return jsonError("Employee not found", 404);
  return Response.json({ ok: true });
}

