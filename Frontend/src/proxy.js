import { NextResponse } from "next/server";

/**
 * Edge gate that runs before any route renders.
 *
 * In Next.js 16 this file replaces the deprecated `middleware.js` — same
 * behaviour, new name and export.
 *
 * This is the frontend's only render-time gate:
 *
 *   1. proxy      — is there any sign of a session? runs before anything renders
 *   2. axios 401  — a cookie that exists but is dead; tears down and redirects
 *   3. the API    — the real boundary; every route is authorised server-side
 *
 * It runs before render on purpose. A client-side guard cannot stop a server
 * component from executing: an unauthenticated visitor hitting a dashboard URL
 * would still run that page's server component, and its output would land in
 * the RSC payload before anything checked who they are.
 */

/**
 * Cookies that indicate a session probably exists.
 *
 * `tj_refresh` is intentionally absent: it is path-scoped to `/api/auth`, so
 * the browser never sends it to a page route and the proxy cannot see it.
 *
 * `tj_access` alone is not enough either — it lives 15 minutes, while the
 * session behind it lasts days. Gating on that would sign people out every
 * quarter hour despite a perfectly good refresh token. `tj_csrf` is issued and
 * cleared alongside the session and shares the refresh token's lifetime, so
 * "either cookie present" is the honest signal for *maybe* signed in.
 */
const SESSION_HINT_COOKIES = ["tj_access", "tj_csrf"];

const SIGN_IN = "/sign-in";
const DASHBOARD = "/dashboard";

/**
 * Only the *entry* screens bounce a signed-in user away.
 *
 * Sub-routes are excluded on purpose: `/sign-in/complete` is reached with a
 * live session and would otherwise be unreachable, and the OTP screens are
 * mid-flow states that must not be interrupted.
 */
const AUTH_ENTRY_ROUTES = new Set([SIGN_IN, "/forgot-password"]);

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const hasSessionHint = SESSION_HINT_COOKIES.some((name) =>
    request.cookies.has(name),
  );

  const isProtected =
    pathname === DASHBOARD || pathname.startsWith(`${DASHBOARD}/`);

  // No session at all: redirect before the route renders, so no server
  // component runs and nothing reaches the RSC payload.
  if (isProtected && !hasSessionHint) {
    const url = request.nextUrl.clone();
    url.pathname = SIGN_IN;
    url.search = "";
    // Preserve the destination so sign-in can return the user to it.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // Already signed in: skip the sign-in screen.
  if (AUTH_ENTRY_ROUTES.has(pathname) && hasSessionHint) {
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Explicit paths rather than a catch-all with negative lookaheads: nothing
  // here can accidentally intercept `/api`, `_next`, or files in `public/`.
  matcher: ["/dashboard", "/dashboard/:path*", "/sign-in", "/forgot-password"],
};
