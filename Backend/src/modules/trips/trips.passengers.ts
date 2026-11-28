/** A past manifest is a suggestion, never a second passenger directory. */
export interface PastPassenger {
  id: string;
  fullName: string;
  dateOfBirth: Date | null;
  weightLb: number | null;
  lastTripReference: string;
}

/** Input is ordered by most recent trip first; the first occurrence wins. */
export function uniquePastPassengers(rows: PastPassenger[]): PastPassenger[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const fullName = row.fullName.trim();
    const key = JSON.stringify([fullName.toLowerCase(), row.dateOfBirth?.toISOString().slice(0, 10) ?? null]);
    if (seen.has(key)) return [];
    seen.add(key);
    // Explicit allowlist: passport numbers must never become suggestions.
    return [{ id: row.id, fullName, dateOfBirth: row.dateOfBirth, weightLb: row.weightLb, lastTripReference: row.lastTripReference }];
  });
}
