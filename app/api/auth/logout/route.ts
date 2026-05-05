import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants"

export async function POST() {
  const res = NextResponse.json({ ok: true as const })
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}
