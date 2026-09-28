/**
 * The merge fields a template may use (scope §6.17: "templates should
 * auto-fill client/trip fields").
 *
 * One list, shipped to the screen by `GET /email-templates/fields`, so the
 * editor's chips, the save-time check and the send-time fill can never
 * disagree about what `{route}` means. A field is filled only from the record
 * it names — `{amount_due}` needs an invoice picked — and a field whose record
 * was not given, or whose value is not on file, is reported as missing rather
 * than filled with a stand-in.
 */
export const MERGE_SOURCES = ['client', 'operator', 'trip', 'quote', 'invoice', 'sender'] as const;
export type MergeSource = (typeof MERGE_SOURCES)[number];

export interface MergeField {
  key: string;
  label: string;
  source: MergeSource;
  description: string;
}

export const MERGE_FIELDS = [
  { key: 'client_name', label: 'Client name', source: 'client', description: 'The company, or the person when there is none.' },
  { key: 'client_first_name', label: 'Client first name', source: 'client', description: 'For "Dear Mark,".' },
  { key: 'operator_name', label: 'Operator name', source: 'operator', description: 'The operating company.' },
  { key: 'operator_contact', label: 'Operator contact', source: 'operator', description: 'Their named account manager.' },
  { key: 'trip_id', label: 'Trip number', source: 'trip', description: 'TJ-1048.' },
  {
    key: 'route',
    label: 'Route',
    source: 'trip',
    description: 'Every leg in order, KTEB → KMIA → KTEB. From the quote when no trip is picked.',
  },
  { key: 'origin', label: 'Origin', source: 'trip', description: 'The first departure airport.' },
  { key: 'destination', label: 'Destination', source: 'trip', description: 'The last arrival airport.' },
  {
    key: 'departure_date',
    label: 'Departure date',
    source: 'trip',
    description: 'The first leg’s date. From the quote when no trip is picked.',
  },
  { key: 'departure_time', label: 'Departure time', source: 'trip', description: 'The first leg’s local time.' },
  {
    key: 'aircraft',
    label: 'Aircraft',
    source: 'trip',
    description: 'The aircraft model. From the quote when no trip is picked.',
  },
  { key: 'tail_number', label: 'Tail number', source: 'trip', description: 'The booked airframe’s registration.' },
  { key: 'passenger_count', label: 'Passengers', source: 'trip', description: 'How many are flying.' },
  { key: 'quote_id', label: 'Quote number', source: 'quote', description: 'Q-42.' },
  { key: 'total_price', label: 'Quote total', source: 'quote', description: 'The offer, with FET and extras, as $85,463.00.' },
  { key: 'fet_amount', label: 'Quote FET', source: 'quote', description: 'The federal excise tax on the offer.' },
  { key: 'quote_valid_until', label: 'Quote valid until', source: 'quote', description: 'The day the offer lapses.' },
  { key: 'invoice_id', label: 'Invoice number', source: 'invoice', description: 'INV-2026-0042.' },
  { key: 'invoice_total', label: 'Invoice total', source: 'invoice', description: 'What the invoice bills, FET included.' },
  { key: 'amount_due', label: 'Amount due', source: 'invoice', description: 'What is still unpaid on it, today.' },
  { key: 'due_date', label: 'Invoice due date', source: 'invoice', description: 'When payment is due.' },
  { key: 'broker_name', label: 'Your name', source: 'sender', description: 'Whoever sends it.' },
  { key: 'broker_email', label: 'Your email', source: 'sender', description: 'Replies come to this address.' },
] as const satisfies readonly MergeField[];

export type MergeKey = (typeof MERGE_FIELDS)[number]['key'];

export const MERGE_KEYS: ReadonlySet<string> = new Set(MERGE_FIELDS.map((field) => field.key));

export function mergeField(key: string): MergeField | undefined {
  return MERGE_FIELDS.find((field) => field.key === key);
}
