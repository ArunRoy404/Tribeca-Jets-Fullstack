"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true once the page is live in
 * the browser.
 *
 * For a value only the browser knows — the session's permissions, say — that
 * changes what renders. Reading it straight away gives the server one answer
 * and the client another, and React throws a hydration error; rendering the
 * server's answer until this turns true keeps both passes identical.
 */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
