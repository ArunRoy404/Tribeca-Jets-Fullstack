import axios from "axios";

/**
 * The single configured axios instance. Every request in the app goes through
 * it, so the cookie/CSRF contract with the API lives in exactly one place.
 */
/**
 * Relative by default, so requests go to the Next server and are proxied on
 * (see `next.config.mjs`). That keeps session cookies first-party.
 *
 * Set NEXT_PUBLIC_API_URL to an absolute URL to bypass the proxy and call the
 * API directly — the API's CORS allowlist must then include the web origin.
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  // Same-origin requests send cookies anyway, but this keeps the absolute-URL
  // mode working without a second code path.
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/**
 * Called when a request is rejected as unauthenticated and refresh could not
 * save it.
 *
 * Registered rather than imported: `lib/session` imports this module, so a
 * direct import back would be a cycle — and a cycle around a `const` export is
 * exactly the shape that produces a TDZ error once bundled.
 */
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

const CSRF_COOKIE = "tj_csrf";
const CSRF_HEADER = "X-CSRF-Token";
const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

/** Reads a readable (non-httpOnly) cookie. Returns null during SSR. */
function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Attaches the CSRF header to state-changing requests.
 *
 * The session cookie rides along automatically, including on requests a
 * malicious site triggers — so the API also requires a header that only
 * same-site JavaScript can set. `tj_csrf` is deliberately readable for this.
 */
api.interceptors.request.use((config) => {
  if (UNSAFE_METHODS.has(config?.method?.toLowerCase?.())) {
    const token = readCookie(CSRF_COOKIE);
    if (token) config.headers[CSRF_HEADER] = token;
  }
  return config;
});

/**
 * Normalises every failure into one predictable shape, so hooks never have to
 * dig through `error.response.data` and components never see an axios error.
 *
 * `fieldErrors` mirrors the API's Zod output (`{ email: "Invalid email" }`) and
 * is what forms bind to.
 */
function normaliseError(error) {
  const data = error?.response?.data;

  const normalised = new Error(
    data?.message ??
      (error?.code === "ERR_NETWORK"
        ? "Cannot reach the server. Check your connection and try again."
        : "Something went wrong. Please try again."),
  );

  normalised.statusCode = error?.response?.status ?? 0;
  normalised.fieldErrors = data?.errors ?? null;
  normalised.isNetworkError = error?.code === "ERR_NETWORK";
  return normalised;
}

/**
 * Endpoints that must never trigger a refresh-and-retry.
 *
 * `/auth/me` returning 401 is the ordinary signed-out state, and refresh/login
 * failing is terminal — retrying any of them would loop.
 */
const NO_RETRY = ["/auth/refresh", "/auth/login", "/auth/logout", "/auth/me"];

/**
 * Single-flight refresh.
 *
 * Access tokens last 15 minutes, so several queries can 401 at once. Without
 * this, each would fire its own refresh and the rotation-reuse detection on the
 * API would read the concurrent attempts as a stolen token and kill the
 * session. One shared promise means exactly one refresh.
 */
let refreshPromise = null;

function refreshSession() {
  refreshPromise ??= api
    .post("/auth/refresh")
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error?.config;
    const status = error?.response?.status;

    const shouldRefresh =
      status === 401 &&
      original &&
      !original._retried &&
      !NO_RETRY.some((path) => original?.url?.includes(path));

    if (shouldRefresh) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        // Refresh failed: the session is genuinely gone.
        onUnauthorized?.();
      }
    }

    /**
     * A 401 on the session check itself means the same thing — there was no
     * session to refresh. Login and logout are excluded: a rejected sign-in is
     * a form error, not an expired session.
     */
    if (
      status === 401 &&
      original?.url?.includes("/auth/me")
    ) {
      onUnauthorized?.();
    }

    return Promise.reject(normaliseError(error));
  },
);

/** Unwraps the API's `{ success, data, meta }` envelope. */
export async function request(config) {
  const response = await api(config);
  return response?.data?.data ?? null;
}

/** Same, but keeps `meta` for paginated endpoints. */
export async function requestWithMeta(config) {
  const response = await api(config);
  return { data: response?.data?.data ?? null, meta: response?.data?.meta ?? null };
}
