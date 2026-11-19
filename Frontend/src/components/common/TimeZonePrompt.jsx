"use client";

import { useState, useSyncExternalStore } from "react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useCurrentUser, useUpdateProfile } from "@/hooks/auth";

const DECLINED_KEY = "tj_tz_declined";

function subscribeToBrowser(onChange) {
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/**
 * One spelling per zone. Browsers disagree on renamed zones — Chrome says
 * "Asia/Calcutta" where Firefox says "Asia/Kolkata" (Kiev/Kyiv,
 * Saigon/Ho_Chi_Minh likewise) — and the API stores Node's spelling, so a
 * plain comparison would ask again on every visit after a yes.
 */
function sameZone(a, b) {
  try {
    const canonical = (zone) => new Intl.DateTimeFormat("en-US", { timeZone: zone }).resolvedOptions().timeZone;
    return canonical(a) === canonical(b);
  } catch {
    return a === b;
  }
}

function browserZoneToOffer() {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    if (localStorage.getItem(DECLINED_KEY) === browser) return null;
  } catch {
    // Storage may be unavailable. The prompt still works for this visit.
  }
  return browser;
}

/** Offer the browser's zone once the session has supplied the saved preference. */
export default function TimeZonePrompt() {
  const { data: me, isPending: loadingProfile } = useCurrentUser();
  const { mutate, isPending: saving } = useUpdateProfile();
  const browser = useSyncExternalStore(subscribeToBrowser, browserZoneToOffer, () => null);
  const [dismissedZone, setDismissedZone] = useState(null);
  const effective = me?.timeZone ?? me?.companyTimeZone;

  if (loadingProfile || saving || !browser || !effective || sameZone(browser, effective) || browser === dismissedZone) {
    return null;
  }

  function decline() {
    setDismissedZone(browser);
    try {
      localStorage.setItem(DECLINED_KEY, browser);
    } catch {
      // Keep this dismissal for the current visit.
    }
  }

  return (
    <ConfirmDialog
      open
      title="Use your browser’s time zone?"
      description={`You seem to be in ${browser}. Use ${browser} time for your account? It is set to ${effective}.`}
      confirmLabel="Yes"
      cancelLabel="No"
      onOpenChange={(open) => { if (!open) decline(); }}
      onConfirm={() => mutate({ timeZone: browser })}
    />
  );
}
