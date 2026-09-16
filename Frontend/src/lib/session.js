import { api } from "@/lib/axios";
import { clearAllQueries } from "@/lib/queryClient";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Cookies the app is allowed to delete from JavaScript.
 *
 * The session cookies (`tj_access`, `tj_refresh`) are httpOnly by design and
 * cannot be touched from here — only the server can clear those, which is why
 * `clearSession` calls the logout endpoint rather than trying.
 */
const READABLE_COOKIES = ["tj_csrf"];

/**
 * Expires a cookie on every path prefix it might have been scoped to.
 *
 * A cookie set with `path=/api/auth` is not removed by deleting it at `/`, and
 * the browser gives no way to ask which path a cookie actually has.
 */
function deleteCookie(name) {
  if (typeof document === "undefined") return;

  const paths = ["/", "/api", "/api/auth"];
  const expiry = "Thu, 01 Jan 1970 00:00:00 GMT";

  for (const path of paths) {
    document.cookie = `${name}=; expires=${expiry}; path=${path}`;
    // Also try the parent domain, for the production `.domain.com` cookie.
    const host = window.location.hostname;
    if (host.includes(".")) {
      document.cookie = `${name}=; expires=${expiry}; path=${path}; domain=.${host}`;
    }
  }
}

/** Auth screens must never trigger a session-expiry redirect to themselves. */
const PUBLIC_PATHS = [
  "/sign-in",
  "/forgot-password",
  "/reset-password",
];

function isOnPublicPath() {
  if (typeof window === "undefined") return false;
  const { pathname } = window.location;
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Guards against a stampede.
 *
 * A dashboard screen can have several queries in flight at once; when the
 * session dies they all 401 together. Without this, each would tear down and
 * navigate, and the user could end up at `?next=` pointing somewhere arbitrary.
 */
let expiryInProgress = false;

/**
 * Single entry point for "the session is gone".
 *
 * Called from the axios interceptor, so it covers every request rather than
 * only the session check — a 401 from any endpoint after a failed refresh means
 * the same thing.
 *
 * Navigates with a full page load rather than the router: it guarantees no
 * in-memory state survives, and the edge proxy then handles the request
 * normally on the way in. Session expiry is rare and terminal, so losing the
 * SPA transition is the right trade.
 */
export async function handleSessionExpiry() {
  if (typeof window === "undefined" || expiryInProgress) return;

  // Already on an auth screen: tear down quietly, but do not redirect.
  if (isOnPublicPath()) {
    await clearSession({ notifyServer: false });
    return;
  }

  expiryInProgress = true;

  await clearSession({ notifyServer: false });

  const { pathname, search } = window.location;
  const target = new URL("/sign-in", window.location.origin);
  target.searchParams.set("next", `${pathname}${search}`);

  window.location.replace(target.toString());
}

/**
 * Tears down everything that identifies the signed-out user.
 *
 * Order matters: the server call goes first so the httpOnly cookies are
 * actually cleared, then local state. It is best-effort — if the request fails
 * the local teardown must still happen, otherwise a user whose session expired
 * would be stuck looking at another session's cached data.
 *
 * @param {object} options
 * @param {boolean} options.notifyServer - call the logout endpoint first.
 *   Skip it when the server already told us the session is gone.
 */
export async function clearSession({ notifyServer = true } = {}) {
  if (notifyServer) {
    try {
      // Public + CSRF-exempt on the API, so this works even with no valid
      // session. Failures are ignored on purpose.
      await api.post("/auth/logout");
    } catch {
      // Nothing to do: the local teardown below is what matters.
    }
  }

  READABLE_COOKIES.forEach(deleteCookie);

  // Zustand: drop the in-flight auth flow and its persisted copy.
  useAuthStore.getState()?.clearFlow?.();
  useAuthStore.persist?.clearStorage?.();

  // Leaving one user's clients and financials cached for whoever signs in next
  // on this browser is a data leak, not a stale cache.
  clearAllQueries();
}
