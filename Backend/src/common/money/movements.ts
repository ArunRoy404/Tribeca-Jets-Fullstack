/**
 * A movement of money, as the Transactions ledger (#19) lists it — built by
 * the module that owns the money (Receivables, Operator Payments,
 * Commissions), in the one shape the ledger merges.
 *
 * Transactions stores nothing: every row here is read from its owner's table
 * through its owner's service, under its owner's row-level scope. That is why
 * the shape lives in `common/` rather than in the transactions module — each
 * owner builds it, and the ledger only merges.
 */

export const MovementKind = {
  /** Money in: a payment received on a client invoice. */
  CLIENT_PAYMENT: 'CLIENT_PAYMENT',
  /** Money out: a payment sent against an operator's bill. */
  OPERATOR_PAYMENT: 'OPERATOR_PAYMENT',
  /** Money out: a commission marked paid. */
  COMMISSION: 'COMMISSION',
} as const;
export type MovementKind = (typeof MovementKind)[keyof typeof MovementKind];
export const MOVEMENT_KINDS = Object.values(MovementKind) as [MovementKind, ...MovementKind[]];

export const MovementDirection = { IN: 'IN', OUT: 'OUT' } as const;
export type MovementDirection = (typeof MovementDirection)[keyof typeof MovementDirection];

export const DIRECTION_OF: Record<MovementKind, MovementDirection> = {
  CLIENT_PAYMENT: MovementDirection.IN,
  OPERATOR_PAYMENT: MovementDirection.OUT,
  COMMISSION: MovementDirection.OUT,
};

/** What a ledger query narrows by. Each owner applies it to its own table. */
export interface MovementFilter {
  /** Inclusive, by the day the money moved. */
  from?: Date;
  to?: Date;
  tripId?: string;
  search?: string;
  order: 'asc' | 'desc';
}

export interface Movement {
  /** `<kind>:<source row id>` — unique across the three sources. */
  id: string;
  kind: MovementKind;
  direction: MovementDirection;
  /** The day the money moved. */
  date: Date;
  /**
   * Whole currency. Null only for a paid commission whose value cannot be
   * known (a share of a profit nobody has entered) — shown as unknown, never
   * as zero, and in no total.
   */
  amount: number | null;
  method: string | null;
  /** The desk's reference on the movement itself — a wire confirmation. */
  reference: string | null;
  /** The bill the money settles: its id and printed number. */
  document: { id: string; number: string };
  /** Who paid or was paid. */
  counterparty: { type: 'CLIENT' | 'OPERATOR' | 'PAYEE'; id: string | null; name: string };
  trip: { id: string; reference: number } | null;
  broker: { id: string; firstName: string; lastName: string } | null;
  createdAt: Date;
}

/** One owner's slice of a page: its rows (already ordered and limited) and its total. */
export interface MovementSlice {
  rows: Movement[];
  total: number;
}

/** One owner's contribution to the ledger totals, in cents. */
export interface MovementTotals {
  count: number;
  cents: number;
  /** Rows whose amount cannot be known — in the count, never in the sum. */
  unvalued: number;
}

/** The `where` on a `@db.Date` column for a filter's date range. */
export function dayRange(filter: Pick<MovementFilter, 'from' | 'to'>): { gte?: Date; lte?: Date } | undefined {
  if (!filter.from && !filter.to) return undefined;
  return { ...(filter.from ? { gte: filter.from } : {}), ...(filter.to ? { lte: filter.to } : {}) };
}

/**
 * The ledger's order, applied identically by every owner's query and by the
 * merge: the day, then when it was typed in, then the id — so a page boundary
 * never splits a tie differently in two places.
 */
export function movementOrder(order: 'asc' | 'desc') {
  const sign = order === 'asc' ? 1 : -1;
  return (a: Movement, b: Movement): number => {
    const byDay = a.date.getTime() - b.date.getTime();
    if (byDay !== 0) return sign * byDay;
    const byEntry = a.createdAt.getTime() - b.createdAt.getTime();
    if (byEntry !== 0) return sign * byEntry;
    return sign * a.id.localeCompare(b.id);
  };
}
