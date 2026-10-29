"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";

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
  return typeof navigator !== "undefined" ? navigator.onLine : false;
}

function getServerOnlineSnapshot() {
  return false;
}

export default function OfflinePage() {
  const router = useRouter();
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/settings/branding", { cache: "no-store" });
      if (res.ok) {
        router.push("/dashboard");
        return;
      }
    } catch {
      // Remain on offline page
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-zinc-900 flex flex-col justify-between font-sans selection:bg-zinc-900 selection:text-white">
      <header className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BrandLogo variant="dark" className="h-7 w-auto" />
            <span className="hidden sm:inline-block h-4 w-px bg-zinc-200" />
            <span className="hidden sm:inline-block text-[10px] font-semibold tracking-[0.2em] uppercase text-zinc-400">
              Command Center
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-semibold tracking-[0.14em] uppercase ${
              isOnline
                ? "bg-emerald-50/80 text-emerald-800 border-emerald-200"
                : "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isOnline ? "bg-emerald-600" : "bg-zinc-500"
              }`}
            />
            {isOnline ? "Connection Restored" : "Offline Mode"}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-sm p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="size-10 rounded-sm bg-zinc-100 border border-zinc-200/80 flex items-center justify-center mb-6">
            {isOnline ? (
              <CheckCircle2 className="size-4 text-emerald-700" />
            ) : (
              <WifiOff className="size-4 text-zinc-700" />
            )}
          </div>

          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-zinc-400 mb-1.5">
            {isOnline ? "Network Ready" : "Network Unavailable"}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 mb-2">
            {isOnline
              ? "Your connection is back online"
              : "You are currently working offline"}
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed mb-6">
            {isOnline
              ? "Live synchronization with the charter desk database is available again. Continue to the Command Center to resume your work."
              : "Live charter desk data, quotes, and financial ledgers require an active connection so outdated figures are never displayed. Any open tabs will automatically resynchronize as soon as your network returns."}
          </p>

          <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking connection..." : "Retry Connection"}
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-zinc-200 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-colors"
            >
              Return to Dashboard
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200/70 bg-white/60">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Private Aviation Charter Command Center</span>
          <span>Offline Resilience · PWA</span>
        </div>
      </footer>
    </div>
  );
}
