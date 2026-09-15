"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";
import { getQueryClient } from "@/lib/queryClient";
import { setUnauthorizedHandler } from "@/lib/axios";
import { handleSessionExpiry } from "@/lib/session";
import { TOAST_DURATION } from "@/lib/toast";

/**
 * Teaches the axios layer what to do when a request comes back unauthenticated.
 *
 * Module scope in a "use client" file: runs once when the browser bundle loads,
 * before any component renders, so no request can 401 before it is wired up.
 */
setUnauthorizedHandler(handleSessionExpiry);

/**
 * Wraps the app in React Query and mounts the toast outlet.
 *
 * The client comes from `getQueryClient()` rather than `useState(new
 * QueryClient())` so the very same instance backs both the React tree and the
 * global helpers in `lib/queryClient` — otherwise invalidating from a hook file
 * would update a cache nothing is subscribed to.
 */
export default function QueryProvider({ children }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <GooeyToaster
        position="top-right"
        duration={TOAST_DURATION.default}
        richColors
        closeButton
        // Light theme only — this project never applies a dark class.
        theme="light"
      />
    </QueryClientProvider>
  );
}
