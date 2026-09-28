/**
 * Numbers printed on a financial document — "INV-2026-0042" on a client
 * invoice, "OP-2026-0045" on an operator payable: a prefix, the year the row
 * was created, and its database sequence.
 *
 * Both parts are fixed at creation, so the number somebody was sent never
 * changes. Shared since Operator Payments became the second caller.
 */
export function documentNumber(prefix: string, reference: number, createdAt: Date): string {
  return `${prefix}-${createdAt.getUTCFullYear()}-${String(reference).padStart(4, '0')}`;
}

/**
 * The sequence a search term names — "INV-2026-0042", "INV-42", "0042", "42"
 * for prefix "INV" — or null when it names none.
 */
export function referenceFromSearch(term: string, prefix: string): number | null {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^(?:${escaped}-?)?(?:\\d{4}-)?0*(\\d{1,9})$`, 'i').exec(term.trim());
  if (!match) return null;
  const reference = Number(match[1]);
  return reference > 0 ? reference : null;
}
