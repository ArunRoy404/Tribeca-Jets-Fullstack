import { MERGE_KEYS, type MergeKey } from './email.fields.js';

/**
 * Filling a template's merge fields — pure, so every rule here is tested
 * without a server, a database or a mail account.
 *
 * A token is `{snake_case}`. Braces around anything else are left alone, so
 * a template can still say "{see attached}" if it wants to.
 */
const TOKEN = /\{([a-z][a-z0-9_]*)\}/g;

export type MergeValues = Partial<Record<MergeKey, string | null>>;

/** Every token in the text, in order of first appearance, once each. */
export function mergeTokens(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(TOKEN)) seen.add(match[1]);
  return [...seen];
}

/** Tokens that are not in the catalogue — a typo, refused on save. */
export function unknownTokens(...texts: string[]): string[] {
  return [...new Set(texts.flatMap(mergeTokens))].filter((token) => !MERGE_KEYS.has(token));
}

/**
 * The text with every field that has a value filled in.
 *
 * A known field with no value — its record was not given, or the fact is not
 * on file — is **left as its token** and reported in `missing`. It is never
 * blanked and never guessed: an email reading "your flight on ." is worse
 * than one the broker is told to fix, and a stand-in date is worse than both.
 * Unknown tokens are left as they are; the template check refuses them.
 */
export function renderMerge(text: string, values: MergeValues): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const rendered = text.replace(TOKEN, (token, key: string) => {
    if (!MERGE_KEYS.has(key)) return token;
    const value = values[key as MergeKey];
    if (value === null || value === undefined || value === '') {
      missing.add(key);
      return token;
    }
    return value;
  });
  return { text: rendered, missing: [...missing] };
}

// ---- Formatting ------------------------------------------------------------
//
// How a figure reads inside an email. Fixed to US English and US dollars —
// the desk's own convention, and the currency every price in this system is
// entered in — rather than the server's locale, which would change the email
// the day the API moved hosts.

const MONEY = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** $85,463.00 — or null when there is no figure, never $0.00. */
export function formatMoney(value: number | null | undefined): string | null {
  return value === null || value === undefined || Number.isNaN(value) ? null : MONEY.format(value);
}

/**
 * Aug 12, 2026 — for a calendar day stored as midnight UTC, so it is read in
 * UTC: formatted locally it would say the 11th west of Greenwich.
 */
export function formatDay(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : DAY.format(date);
}

/** "14:30" → "2:30 PM". A leg's local time, as the desk typed it. */
export function formatTime(value: string | null | undefined): string | null {
  const match = value ? /^(\d{2}):(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 || 12}:${match[2]} ${suffix}`;
}

/** An airport as a route reads it: its ICAO code, else its IATA. */
export function airportCode(airport: { icao?: string | null; iata?: string | null } | null | undefined): string | null {
  return airport?.icao ?? airport?.iata ?? null;
}

/** KTEB → KMIA → KTEB: each leg's origin, then the last arrival. Null if any stop is unknown. */
export function formatRoute(
  legs: readonly {
    originAirport?: { icao?: string | null; iata?: string | null } | null;
    destinationAirport?: { icao?: string | null; iata?: string | null } | null;
  }[],
): string | null {
  if (!legs.length) return null;
  const stops = [...legs.map((leg) => airportCode(leg.originAirport)), airportCode(legs[legs.length - 1].destinationAirport)];
  return stops.every(Boolean) ? stops.join(' → ') : null;
}
