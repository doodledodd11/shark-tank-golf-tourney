import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * True if the current request carries a valid admin session cookie.
 * Wrapped in React's cache() so multiple calls within one render/action
 * only verify the signature once per request.
 *
 * proxy.ts already redirects unauthenticated page loads away from /admin,
 * but that is only an optimistic, cookie-presence check (Next.js's own
 * guidance: Proxy "should not be your only line of defense"). Server
 * Actions can be POSTed directly, bypassing page navigation entirely, so
 * every admin mutation calls requireAdminSession() itself — this is the
 * real authorization check, done right next to the data it protects.
 */
export const isAdminSession = cache(async () => {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/** Call at the top of every admin Server Action. Throws if the request
 * isn't an authenticated admin session, aborting the mutation. */
export async function requireAdminSession(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized: an admin session is required for this action.");
  }
}
