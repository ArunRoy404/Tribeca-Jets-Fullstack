/**
 * Tokens travel only in httpOnly cookies — never in a response body, never in
 * localStorage, never in an Authorization header. The browser attaches them
 * automatically and frontend JavaScript can never read them.
 */
export const ACCESS_TOKEN_COOKIE = 'tj_access';
export const REFRESH_TOKEN_COOKIE = 'tj_refresh';

/**
 * Readable by JavaScript by design: the frontend echoes it back in the
 * X-CSRF-Token header. A cross-site attacker can trigger a cookie-bearing
 * request but cannot read this cookie to forge the matching header.
 */
export const CSRF_COOKIE = 'tj_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Short-lived, httpOnly cookies that carry an in-flight auth flow between
 * pages. The OTP screens post only a 6-digit code, so the challenge itself
 * cannot live in the request body — and keeping it in a cookie binds the flow
 * to one browser.
 */
export const TWO_FACTOR_COOKIE = 'tj_2fa';
export const PASSWORD_RESET_COOKIE = 'tj_pwreset';

/** Refresh and flow cookies are scoped to the auth routes only. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const RATE_LIMIT_KEY = 'rateLimit';

/** Metadata key for @RequirePermissions, read by PermissionsGuard. */
export const PERMISSIONS_KEY = 'permissions';
