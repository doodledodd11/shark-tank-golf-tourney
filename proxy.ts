import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Optimistic gatekeeper for every /admin page (and the Server Action POSTs
// those pages submit, which land on the same URL). This is a fast,
// cookie-only check — no database hit — exactly as Next.js recommends for
// Proxy. It is NOT the only auth check: every admin Server Action also
// calls requireAdminSession() itself (see lib/auth.ts), since Proxy alone
// is not meant to be the sole line of defense for mutations.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
