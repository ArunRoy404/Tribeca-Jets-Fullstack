/**
 * Times of day, in one place.
 *
 * The wire format is "HH:MM", 24-hour — what the API stores and what
 * `new Date(\`${date}T${time}\`)` can read. Display uses the same clock.
 */

/**
 * Any reasonable way of writing a time → "HH:MM", or null when it is not one.
 * Accepts "18:30", "6:30" and typed input with a meridiem, such as "6:30 pm".
 */
export function parseTime(input) {
  if (input === null || input === undefined) return null;
  const text = String(input).trim().toLowerCase();
  if (!text) return null;
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);
  const meridiem = match[3];
  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "am" && hours === 12) hours = 0;
    if (meridiem === "pm" && hours !== 12) hours += 12;
  } else if (hours > 23 || match[2] === undefined) {
    // A bare "18" is ambiguous enough to refuse; "18:00" is not.
    return null;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** A time of day on the 24-hour clock, or a dash. */
export function formatTime(value) {
  return parseTime(value) ?? "—";
}
