import { z } from 'zod';

export const DEFAULT_TIME_ZONE = 'America/New_York';

const zoneMessage = 'Use a time zone name, e.g. America/New_York';
const calendarDay = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC',
});

export const timeZoneSchema = z.string(zoneMessage).trim().min(1, zoneMessage).max(64, zoneMessage)
  .transform((zone, context) => {
    // Accept named zones. A fixed offset cannot follow daylight saving time.
    if (!/^[+-]|^(?:UTC|(?:Etc\/)?GMT)[+-]/i.test(zone)) {
      try {
        return new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
      }
    }
    context.addIssue({ code: 'custom', message: zoneMessage });
    return z.NEVER;
  });

/** The current calendar day and clock time in the named zone. */
export function nowIn(zone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
  return {
    date: `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`,
    weekday: part('weekday'),
    time: `${part('hour')}:${part('minute')}`,
  };
}

/** A timestamp as the reader sees it in the named zone. */
export function formatMomentIn(value: Date | string | null | undefined, zone: string): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const local = nowIn(zone, date);
  // The zone has already decided the day. Print it as a calendar date.
  return `${local.weekday} ${calendarDay.format(new Date(`${local.date}T00:00:00Z`))}, ${local.time}`;
}

/** Resolve a local day and time, choosing the earlier instant if the clock repeats. */
export function momentIn(date: string, time: string, zone: string): Date | null {
  const wallTime = `${date}T${time}`;
  const utc = new Date(`${wallTime}:00.000Z`);
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 16) !== wallTime) return null;

  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'longOffset' });
  const offsetAt = (instant: number) => {
    const label = formatter.formatToParts(instant).find(({ type }) => type === 'timeZoneName')!.value;
    if (label === 'GMT') return 0;
    const [, sign, hours, minutes, seconds = '0'] = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(label)!;
    return (sign === '-' ? -1 : 1) * (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
  };
  const instant = utc.getTime();
  const day = 86_400_000;
  // Try the offsets on either side of a transition. A skipped time has no
  // matching offset and a repeated time has two matching instants.
  const offsets = new Set([offsetAt(instant - day), offsetAt(instant), offsetAt(instant + day)]);
  let earliest = Infinity;
  for (const offset of offsets) {
    const candidate = instant - offset;
    if (offsetAt(candidate) === offset) earliest = Math.min(earliest, candidate);
  }
  return Number.isFinite(earliest) ? new Date(earliest) : null;
}
