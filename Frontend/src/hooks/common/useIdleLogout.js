"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearSession } from "@/lib/session";
import { authService } from "@/services/auth.service";
import { useCurrentUser } from "@/hooks/auth";

/**
 * Signs the user out after a period of no activity (client request #4:
 * "automatically logout within 10 minutes if it's not being touched").
 *
 * Four things make this harder than a `setTimeout`, and each is why a line
 * below looks the way it does:
 *
 * - **"Touched" means a person, not the network.** A dashboard polling in a
 *   forgotten tab must still sign out, so only real input events count. A
 *   request finishing is not activity.
 * - **A laptop that sleeps does not fire timers.** So nothing is scheduled for
 *   the deadline; a short tick compares the clock against a stored timestamp,
 *   and waking after three hours signs out immediately rather than eventually.
 * - **Tabs share a session.** Working in one tab must keep the others alive,
 *   or the idle one signs everybody out. The last-activity stamp lives in
 *   `localStorage`, which is shared per origin and fires `storage` events in
 *   the other tabs.
 * - **Losing unsaved work without warning is its own bug.** The warning fires
 *   a minute early with a countdown, so a half-written quote can be saved.
 *
 * The timeout comes from `/auth/me` rather than the frontend's own env, for
 * the same reason the permission matrix does: a second copy of the number
 * drifts from the server's, silently. The API independently refuses to refresh
 * a session that has been idle past the limit, so this is the precise half of
 * a policy rather than the whole of it.
 *
 * **The server has to hear about the activity** (7 Oct 2026). Its idle limit
 * reads the session's last-active time, which only moves when the browser
 * says so: a throttled `POST /auth/activity` on real input, and at once on
 * "Stay signed in". Without it, someone reading or typing for twenty minutes
 * without saving kept this timer happy while the server's clock ran out, and
 * the next reload landed on the sign-in page. The ping is claimed through a
 * shared `localStorage` stamp, so one tab sends it for all of them.
 */

/** Shared across tabs of this origin. Not a secret — a millisecond timestamp. */
const ACTIVITY_KEY = "tj_last_activity";

/** How long before the deadline the warning appears. */
const WARNING_LEAD_MS = 60_000;

/** When any tab last told the server about activity — shared like the stamp above. */
const PING_KEY = "tj_last_activity_ping";

/**
 * At most one activity ping per this long, across every tab. Well inside the
 * server's slack on the idle limit, so steady work never reaches it.
 */
const PING_INTERVAL_MS = 2 * 60_000;

/** How often the clock is compared against the stamp. */
const TICK_MS = 1_000;

/**
 * Events that mean a person is there.
 *
 * Deliberately not `mousemove`: a trackpad nudged by a sleeve is not someone
 * working, and on some hardware it fires continuously with nobody present.
 * `scroll` and `wheel` are here because reading a long table is activity even
 * though nothing is clicked.
 */
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
];

function readStamp() {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    // Private mode, or storage disabled. The in-memory ref below still works;
    // only the cross-tab half is lost, which is the safe way to lose it.
    return null;
  }
}

function writeStamp(value, key = ACTIVITY_KEY) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // As above — never let a storage failure stop the timer from running.
  }
}

/** Last ping by any tab; in memory when storage is unavailable. */
let lastPingFallback = 0;

function readPing() {
  try {
    const parsed = Number(window.localStorage.getItem(PING_KEY));
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return lastPingFallback;
  }
}

/**
 * Tells the server a person is here — unless any tab already did within
 * PING_INTERVAL_MS, or `force` ("Stay signed in"). The stamp is claimed
 * before the request goes, so two tabs active at once send one ping. A
 * failure is left to the API client: a 401 tries a refresh and, if the
 * session is really over, signs out — which is then the truth.
 */
function reportActivity(force = false) {
  const now = Date.now();
  if (!force && now - readPing() < PING_INTERVAL_MS) return;
  lastPingFallback = now;
  writeStamp(now, PING_KEY);
  authService.activity().catch(() => {});
}

/**
 * Stamps "activity now" outside of any mounted `useIdleLogout` instance.
 *
 * Call this the moment a session actually starts (a completed login or
 * two-factor verification) — never on a silent token refresh, which is
 * network activity, not a person. Without it, a brand-new session inherits
 * whatever `tj_last_activity` was left over from a previous one, which can be
 * hours or days old, and the idle watcher reads that stale stamp as soon as
 * it mounts on the dashboard and signs the person right back out — someone
 * who just typed their password gets bounced to `reason=idle` on the very
 * next reload.
 */
export function markSessionActivityNow() {
  writeStamp(Date.now());
}

export function useIdleLogout({ enabled = true } = {}) {
  const { data: user } = useCurrentUser();

  // Absent while `/auth/me` is in flight, so the timer simply does not run
  // yet — better than guessing a limit and signing someone out on a number
  // the server never sent.
  const timeoutMs = user?.session?.idleTimeoutMinutes
    ? user.session.idleTimeoutMinutes * 60_000
    : null;

  const active = enabled && Boolean(user) && Boolean(timeoutMs);

  const [secondsLeft, setSecondsLeft] = useState(null);
  // The stamp is mirrored in a ref so the tick reads it without re-subscribing,
  // and so it still works when localStorage is unavailable. It starts at 0
  // because reading the clock during render is impure; the effect sets the
  // real value before the first tick reads it.
  const lastActivity = useRef(0);
  const signingOut = useRef(false);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    writeStamp(now);
    setSecondsLeft(null);
    reportActivity();
  }, []);

  /** "I'm still here": the clock resets everywhere, and the server hears now. */
  const staySignedIn = useCallback(() => {
    markActive();
    reportActivity(true);
  }, [markActive]);

  useEffect(() => {
    if (!active) return undefined;

    // Adopt whatever another tab last recorded, so opening a second tab does
    // not reset a session that has been idle for nine minutes.
    const existing = readStamp();
    lastActivity.current = existing ?? Date.now();
    if (!existing) writeStamp(lastActivity.current);

    const onActivity = () => markActive();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    // Another tab recorded activity: adopt its stamp rather than signing out.
    const onStorage = (event) => {
      if (event.key !== ACTIVITY_KEY) return;
      const parsed = Number(event.newValue);
      if (Number.isFinite(parsed) && parsed > lastActivity.current) {
        lastActivity.current = parsed;
        setSecondsLeft(null);
      }
    };
    window.addEventListener("storage", onStorage);

    const signOut = async () => {
      if (signingOut.current) return;
      signingOut.current = true;

      // Tell the server, so the refresh token is revoked rather than left
      // usable by whoever sits down at the machine next.
      await clearSession({ notifyServer: true });

      const target = new URL("/sign-in", window.location.origin);
      const { pathname, search } = window.location;
      target.searchParams.set("next", `${pathname}${search}`);
      // The sign-in screen says why, so it does not read as a random logout.
      target.searchParams.set("reason", "idle");
      // A full load rather than the router, so nothing in memory survives.
      window.location.replace(target.toString());
    };

    /**
     * Compares the clock against the stamp rather than counting down.
     *
     * A scheduled timer does not fire while the machine is asleep, so a laptop
     * closed for three hours would wake with minutes still "remaining".
     */
    const tick = () => {
      const idleFor = Date.now() - lastActivity.current;
      const remaining = timeoutMs - idleFor;

      if (remaining <= 0) {
        void signOut();
        return;
      }
      setSecondsLeft(
        remaining <= WARNING_LEAD_MS ? Math.ceil(remaining / 1000) : null,
      );
    };

    const interval = window.setInterval(tick, TICK_MS);
    // Run once immediately, so returning to a tab that slept past the deadline
    // signs out now rather than a second from now.
    tick();

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [active, timeoutMs, markActive]);

  return {
    /** Seconds remaining once inside the warning window, else null. */
    secondsLeft,
    /** "I'm still here" — resets the clock in every tab and on the server. */
    staySignedIn,
    idleTimeoutMinutes: user?.session?.idleTimeoutMinutes ?? null,
  };
}
