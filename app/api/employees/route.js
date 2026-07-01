import { prisma, query } from "@/lib/db";
import { humanizePgError, jsonError, pgCode } from "@/lib/http";

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

export async function GET() {
  const result = await query(`${EMPLOYEE_SELECT} GROUP BY e.id, e.name, e.role ORDER BY e.id`);
  return Response.json(result.rows);
}

export async function POST(request) {
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
        "INSERT INTO employee (name, role) VALUES ($1, $2) RETURNING id",
        name.trim(),
        role.trim(),
      );
      const employeeId = rows[0].id;

      for (const officeId of officeIds) {
        await tx.$executeRawUnsafe(
          "INSERT INTO employee_office (employee_id, office_id) VALUES ($1, $2)",
          employeeId,
          officeId,
        );
      }

      const [created] = await tx.$queryRawUnsafe(
        `${EMPLOYEE_SELECT} WHERE e.id = $1 GROUP BY e.id, e.name, e.role`,
        employeeId,
      );
      return created;
    });

    return Response.json(employee, { status: 201 });
  } catch (err) {
    const human = humanizePgError(err);
    if (human) return jsonError(human.message, human.status);

    if (pgCode(err) === "23503") return jsonError("One or more office_ids are invalid", 400);
    return jsonError("Failed to create employee", 500);
  }
}
