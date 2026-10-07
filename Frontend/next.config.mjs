/**
 * Proxies the API through the Next server so the browser only ever talks to
 * its own origin.
 *
 * Why this matters for auth: the session is httpOnly cookies. Calling the API
 * directly makes them third-party cookies, which need CORS with credentials,
 * a permissive SameSite, and are increasingly restricted by browsers and ad
 * blockers. Behind the proxy they are plain first-party cookies on the web
 * origin — no CORS preflight, no SameSite negotiation.
 *
 * `API_PROXY_TARGET` is server-only (no NEXT_PUBLIC_ prefix): the browser never
 * needs to know where the API actually lives.
 */
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Every request is buffered up to this size on its way through the
    // server, and a body beyond it is cut short — so a 12 MB upload reached
    // the API truncated and failed with a 500. The API takes documents up to
    // 25 MB (uploads.rules.ts); this leaves room for the multipart envelope.
    // Change it with that limit.
    proxyClientMaxBodySize: "26mb",
  },
  async rewrites() {
    return [
      {
        // The API mounts everything under its own `/api` prefix, so the path
        // is preserved verbatim rather than rewritten.
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
