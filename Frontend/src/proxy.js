import { NextResponse } from "next/server";
import { NO_ACCESS_PATH, firstAllowedHref, moduleForPath } from "@/components/dashboard/nav/crmNav";

/**
 * Edge gate that runs before any route renders.
 *
 * In Next.js 16 this file replaces the deprecated `middleware.js` — same
 * behaviour, new name and export.
 *
 * This is the frontend's only render-time gate:
 *
 *   1. proxy      — is there any sign of a session, and may this person open
 *                   this CRM page? runs before anything renders
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
/** The referral partner portal (#11) — signed-in only, exactly like the CRM. */
const PORTAL = "/portal";

/**
 * Only the *entry* screens bounce a signed-in user away.
 *
 * Sub-routes are excluded on purpose: `/sign-in/complete` is reached with a
 * live session and would otherwise be unreachable, and the OTP screens are
 * mid-flow states that must not be interrupted.
 */
const AUTH_ENTRY_ROUTES = new Set([SIGN_IN, "/forgot-password"]);

/**
 * The modules this person may view, `DASHBOARD.TRIPS.QUOTES`, written by the
 * API with the session and on every `/auth/me` (7 Oct 2026). The proxy cannot
 * call `/auth/me` on every navigation, so the API leaves it this hint.
 *
 * It decides routing only: an edited cookie shows a page whose every API call
 * is still refused. A session without it (one that began before it existed)
 * is let through, and `ModuleGate` decides once `/auth/me` answers.
 */
const MODULES_COOKIE = "tj_modules";

/**
 * The cookie's first entry for a referral agent: their area is the portal,
 * decided by their real role (7 Oct 2026). Staff carry no marker.
 */
const PORTAL_MARKER = "PORTAL";

/** The modules cookie as a set, or null for a session that predates it. */
function modulesHint(request) {
  const raw = request.cookies.get(MODULES_COOKIE)?.value;
  return raw === undefined ? null : new Set(raw.split(".").filter(Boolean));
}

/**
 * The other area when this person is in the wrong one: the portal for a
 * referral agent on a CRM page, the CRM for staff on a portal page.
 */
function wrongArea(hint, isCrm, isPortal) {
  if (!hint) return null;
  const partner = hint.has(PORTAL_MARKER);
  if (isCrm && partner) return PORTAL;
  if (isPortal && !partner) return DASHBOARD;
  return null;
}

/**
 * Where a CRM page the person may not view goes instead: the first page they
 * may open when they asked for the Dashboard itself, so sign-in never lands
 * on a refusal; the "No access" page otherwise.
 */
function refusedPage(request, pathname, allowed) {
  if (!allowed) return null;

  const needed = moduleForPath(pathname);
  if (!needed || allowed.has(needed)) return null;

  const url = request.nextUrl.clone();
  url.search = "";
  const home = pathname === DASHBOARD ? firstAllowedHref((module) => allowed.has(module)) : null;
  if (home) {
    url.pathname = home;
  } else {
    url.pathname = NO_ACCESS_PATH;
    url.searchParams.set("module", needed);
  }
  return url;
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const hasSessionHint = SESSION_HINT_COOKIES.some((name) =>
    request.cookies.has(name),
  );

  // Which of the two a signed-in user may use is decided by role: the
  // modules cookie carries it (below), and the layouts check it again once
  // `/auth/me` answers.
  const isProtected = [DASHBOARD, PORTAL].some(
    (area) => pathname === area || pathname.startsWith(`${area}/`),
  );

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

  // Signed in, on a CRM page their permissions leave out: refuse it before it
  // renders, as the sidebar already hides it.
  const isCrm = pathname === DASHBOARD || pathname.startsWith(`${DASHBOARD}/`);
  const isPortal = pathname === PORTAL || pathname.startsWith(`${PORTAL}/`);
  if ((isCrm || isPortal) && hasSessionHint) {
    const hint = modulesHint(request);
    // Each person has one area: a referral agent the portal, staff the CRM.
    const area = wrongArea(hint, isCrm, isPortal);
    if (area) {
      const url = request.nextUrl.clone();
      url.pathname = area;
      url.search = "";
      return NextResponse.redirect(url);
    }
    const refused = isCrm ? refusedPage(request, pathname, hint) : null;
    if (refused) return NextResponse.redirect(refused);
  }

  // Already signed in: skip the sign-in screen. A referral agent sent here is
  // moved on to the portal by the dashboard layout.
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
  matcher: ["/dashboard", "/dashboard/:path*", "/portal", "/portal/:path*", "/sign-in", "/forgot-password"],
};
