import { prisma, query } from "@/lib/db";
import { asInt, humanizePgError, jsonError, pgCode } from "@/lib/http";

export const runtime = "nodejs";

const EMPLOYEE_SELECT = `
  SELECT e.id, e.name, e.role,
    COALESCE(ARRAY_AGG(eo.office_id ORDER BY eo.office_id) FILTER (WHERE eo.office_id IS NOT NULL), '{}') AS office_ids
  FROM employee e
  LEFT JOIN employee_office eo ON eo.employee_id = e.id
`;

function parseOfficeIds(officeIds) {
  if (officeIds === undefined || officeIds === null) return [];
  if (!Array.isArray(officeIds) || !officeIds.every((id) => Number.isInteger(id))) {
    return null;
  }
  return [...new Set(officeIds)];
}

export async function GET(_req, { params }) {
  let id;
  try {
    id = asInt((await params).id);
  } catch {
    return jsonError("Invalid id");
  }

  const result = await query(
    `${EMPLOYEE_SELECT} WHERE e.id = $1 GROUP BY e.id, e.name, e.role`,
    [id],
  );
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

  const { name, role, office_ids } = body ?? {};
  if (typeof name !== "string" || !name.trim()) return jsonError("name is required");
  if (typeof role !== "string" || !role.trim()) return jsonError("role is required");

  const officeIds = parseOfficeIds(office_ids);
  if (officeIds === null) return jsonError("office_ids must be an array of whole numbers");

  try {
    const employee = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe(
        "UPDATE employee SET name = $1, role = $2 WHERE id = $3 RETURNING id",
        name.trim(),
        role.trim(),
        id,
      );
      if (!rows[0]) return null;

      await tx.$executeRawUnsafe("DELETE FROM employee_office WHERE employee_id = $1", id);
      for (const officeId of officeIds) {
        await tx.$executeRawUnsafe(
          "INSERT INTO employee_office (employee_id, office_id) VALUES ($1, $2)",
          id,
          officeId,
        );
      }

      const [updated] = await tx.$queryRawUnsafe(
        `${EMPLOYEE_SELECT} WHERE e.id = $1 GROUP BY e.id, e.name, e.role`,
        id,
      );
      return updated;
    });

    if (!employee) return jsonError("Employee not found", 404);
    return Response.json(employee);
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    if (pgCode(err) === "23503") return jsonError("One or more office_ids are invalid", 400);
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
