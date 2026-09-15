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

/** Refresh cookie is scoped to the refresh + logout routes only. */
export const REFRESH_COOKIE_PATH = '/api/auth';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const RATE_LIMIT_KEY = 'rateLimit';
