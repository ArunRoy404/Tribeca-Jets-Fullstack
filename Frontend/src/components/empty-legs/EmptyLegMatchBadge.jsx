"use client";

import { Badge } from "@/components/ui/badge";

/**
 * #10b's match count, in one place for the table, the cards and the
 * dashboard: every trip request on the route, and how many of those asked for
 * a day within three days of this leg. Zero reads as "No matches", never as
 * a green badge.
 */
export default function EmptyLegMatchBadge({ count = 0, dateCount = 0, className }) {
  if (!count) {
    return (
      <Badge tone="outline" size="sm" className={className}>
        No matches
      </Badge>
    );
  }
  return (
    <Badge tone="success" size="sm" className={className}>
      {count} {count === 1 ? "match" : "matches"}
      {dateCount > 0 ? ` · ${dateCount} on date` : ""}
    </Badge>
  );
}
