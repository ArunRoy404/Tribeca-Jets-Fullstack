"use client";

import { useSearchParams } from "next/navigation";

const DEFAULT_TARGET = "/dashboard";

/**
 * Where to send the user after a successful sign-in.
 *
 * The proxy adds `?next=` when it bounces someone off a protected route, so
 * they return to the page they actually wanted instead of always landing on
 * the dashboard.
 *
 * Only same-origin paths are honoured. Redirecting to an attacker-supplied
 * absolute URL is a textbook open-redirect, and a plausible-looking
 * `?next=https://tribeca-jets.evil.com/sign-in` after a real sign-in is exactly
 * how credential-phishing links are laundered.
 */
export function useRedirectTarget() {
  const searchParams = useSearchParams();
  const next = searchParams?.get?.("next");

  if (!next) return DEFAULT_TARGET;

  // Must be a root-relative path. `//evil.com` and `https://evil.com` are both
  // absolute to a browser, so a leading single slash is the only safe shape.
  const isSafe = next.startsWith("/") && !next.startsWith("//");
  return isSafe ? next : DEFAULT_TARGET;
}
