import { formatDate } from "@/lib/archive";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Parses a plain "YYYY-MM-DD" string as a local-midnight Date, unlike `new Date(str)`
// which the spec treats as UTC midnight and can roll back a day in positive-offset zones.
export function parseLocalDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function startOfWeek(date) {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

export function dayLabel(date) {
  return DAY_LABELS[date.getDay()];
}

export function formatLongDate(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatShortDay(date) {
  return `${MONTH_LABELS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

export function formatTime12(time) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function getMonthGrid(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  const weeks = [];
  let cursor = gridStart;
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(days);
  }
  return weeks;
}

/**
 * A calendar day from the API, as the desk reads it: "Nov 12, 2026".
 *
 * The API stores a day the user named — a departure, a payment date — as
 * midnight UTC against a DATE column. `formatDate` reads that in the browser's
 * own zone, so anyone west of Greenwich sees the 11th for a flight on the
 * 12th. Formatting in UTC gives back exactly the day that was typed. Use this
 * for days; `formatTimestamp` stays right for moments.
 */
export function formatCalendarDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "YYYY-MM-DD" from an API day, for a date picker's value. Empty when absent. */
export function toDateInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

/** "2h ago", "Yesterday", or the date — relative to now, for a feed. */
export function timeAgo(value) {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return "—";
  const minutes = Math.floor((Date.now() - at.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(at);
}
