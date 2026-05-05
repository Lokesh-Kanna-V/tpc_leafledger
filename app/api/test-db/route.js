import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { cleanDbMessage } from "@/lib/http";

export async function GET() {
  try {
    const result = await query("SELECT NOW() as time");
    const row = result.rows[0] ?? {};

    return NextResponse.json({
      success: true,
      dbTime: row.time,
    });
  } catch (error) {
    console.error("DB ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? cleanDbMessage(error.message) : "Unknown error",
      },
      { status: 500 },
    );
  }
}

