/**
 * "Chrome on macOS" from a raw User-Agent header, for the sessions list.
 *
 * Deliberately small: the list needs a name a person recognises, not a
 * device database, and a dependency for it would be the larger risk. Order
 * matters — Edge and Opera also claim Chrome, every Chromium browser claims
 * Safari, and iPadOS can claim macOS.
 */
const BROWSERS: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

function match(table: [RegExp, string][], ua: string): string | null {
  return table.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
}

/** Null when nothing is recognisable — the caller says "Unknown device". */
export function describeUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const browser = match(BROWSERS, ua);
  const system = match(SYSTEMS, ua);
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system;
}
