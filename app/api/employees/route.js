import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const result = await query("SELECT id, name, role FROM employee ORDER BY id");
  return Response.json(result.rows);
}

export async function POST(request) {
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
      "INSERT INTO employee (name, role) VALUES ($1, $2) RETURNING id, name, role",
      [name.trim(), role.trim()],
    );
    return Response.json(result.rows[0], { status: 201 });
  } catch {
    return jsonError("Failed to create employee", 500);
  }
}

