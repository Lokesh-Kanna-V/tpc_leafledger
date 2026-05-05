import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { AUTH_COOKIE_NAME } from "@/lib/auth/constants"

async function isValidAdminSession(
  token: string,
  secretBytes: Uint8Array,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretBytes)
    const role =
      typeof payload.role === "string" ? payload.role.trim().toLowerCase() : ""
    return role === "admin"
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const secret = process.env.JWT_SECRET?.trim()
  const secretBytes = secret ? new TextEncoder().encode(secret) : null

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null

  const leafledger =
    pathname === "/leafledger" || pathname.startsWith("/leafledger/")

  if (leafledger) {
    if (!secretBytes || !token || !(await isValidAdminSession(token, secretBytes))) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.search = ""
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    if (
      secretBytes &&
      token &&
      (await isValidAdminSession(token, secretBytes))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/leafledger"
      url.search = ""
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/leafledger", "/leafledger/:path*"],
}
