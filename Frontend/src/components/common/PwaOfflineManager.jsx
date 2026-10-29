"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { onlineManager, useQueryClient } from "@tanstack/react-query";
import { WifiOff, RefreshCw, CheckCircle2, Download, X } from "lucide-react";

function subscribeOnlineStatus(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getServerOnlineSnapshot() {
  return true;
}

/**
 * Registers the PWA Service Worker (`/sw.js`), synchronizes browser network
 * state with React Query's `onlineManager`, renders an editorial Offline Mode
 * status strip when connectivity drops, and automatically revalidates active
 * queries as soon as connectivity returns (#35).
 */
export default function PwaOfflineManager() {
  const queryClient = useQueryClient();
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );

  const [justRestored, setJustRestored] = useState(false);
  const [checking, setChecking] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  // Register Service Worker & listen for PWA install prompt
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Ignore service worker registration errors in unsupported environments
      });
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Synchronize with React Query and trigger automatic re-sync when back online
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let restoreTimer = null;

    const handleOffline = () => {
      onlineManager.setOnline(false);
      setJustRestored(false);
    };

    const handleOnline = () => {
      onlineManager.setOnline(true);
      setJustRestored(true);
      queryClient.invalidateQueries();
      restoreTimer = window.setTimeout(() => {
        setJustRestored(false);
      }, 3500);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (restoreTimer) window.clearTimeout(restoreTimer);
    };
  }, [queryClient]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/settings/branding", { cache: "no-store" });
      if (res.ok) {
        onlineManager.setOnline(true);
        queryClient.invalidateQueries();
      }
    } catch {
      // Still offline
    } finally {
      setChecking(false);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  if (isOnline && !justRestored && (!installPrompt || installDismissed)) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="bg-zinc-900 text-zinc-100 border-b border-zinc-800 px-4 py-2 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-zinc-800 border border-zinc-700 text-[10px] font-semibold tracking-[0.14em] uppercase text-amber-300 shrink-0">
              <WifiOff className="size-3" />
              Offline Mode
            </span>
            <span className="text-[11px] text-zinc-300 truncate">
              Network connection lost. Viewing cached screen state — live changes and saves are paused until connection returns.
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-medium text-white shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Retry"}
          </button>
        </div>
      )}

      {isOnline && justRestored && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-950 text-emerald-100 border-b border-emerald-900 px-4 py-1.5 text-xs flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium">
              Connection restored — synchronizing live charter desk data.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setJustRestored(false)}
            className="text-emerald-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {isOnline && !justRestored && installPrompt && !installDismissed && (
        <div className="bg-stone-100 text-zinc-800 border-b border-zinc-200/90 px-4 py-1.5 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="size-3.5 text-zinc-600 shrink-0" />
            <span className="text-[11px] text-zinc-600 truncate">
              Install <strong className="font-semibold text-zinc-900">Command Center</strong> as a standalone desktop or mobile app for instant launch and offline resilience.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-2.5 py-0.5 rounded-sm bg-zinc-900 text-white text-[11px] font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={() => setInstallDismissed(true)}
              className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              aria-label="Dismiss install prompt"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

