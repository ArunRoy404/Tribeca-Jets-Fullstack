import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Action, canDo, Module } from '../../common/authorization/access.js';
import { BROKER_ROLES, isPartner } from '../../common/authorization/roles.js';
import { formatMomentIn, momentIn, nowIn, timeZoneSchema } from '../../common/dates/time-zone.js';
import { calendarDate } from '../../common/dto/dates.js';
import { MAX_PAGE_SIZE } from '../../common/dto/pagination.dto.js';
import { createPaymentSchema } from '../../common/dto/payments.js';
import { toCents } from '../../common/money/cents.js';
import { MovementDirection, MovementKind } from '../../common/money/movements.js';
import { formatDollars } from '../../common/money/settlement.js';
import type { AuthenticatedUser, Paginated } from '../../common/types/api.types.js';
import {
  AircraftCategory, AircraftStatus, ClientPriority, ClientStatus, CommissionRecipientType, CommissionStatus,
  EmptyLegStatus, FlightStatus, FollowUpMethod,
  InvoiceStatus, LeadSource, LeadStage, NoteSubjectType, NoteVisibility, OperatorStatus, PaymentMethod, PaymentTerms,
  QuoteStatus, ResponseSpeed, TaskPriority, TaskStatus, TripApprovalStatus, TripRequestStatus, TripStatus, TripType,
  UserRole, UserStatus,
} from '../../generated/prisma/enums.js';
import { AircraftService } from '../aircraft/aircraft.service.js';
import { queryAircraftSchema } from '../aircraft/dto/aircraft.dto.js';
import { AirportsService } from '../airports/airports.service.js';
import { createAirportSchema, queryAirportsSchema } from '../airports/dto/airport.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { ClientCreditsService } from '../client-credits/client-credits.service.js';
import { clientCreditSummarySchema } from '../client-credits/dto/client-credit.dto.js';
import { ClientsService } from '../clients/clients.service.js';
import { createClientSchema, FOLLOW_UP_WINDOWS, queryClientsSchema, updateClientSchema } from '../clients/dto/client.dto.js';
import { CommissionsService } from '../commissions/commissions.service.js';
import { queryCommissionsSchema } from '../commissions/dto/commission.dto.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { dashboardSummarySchema } from '../dashboard/dto/dashboard.dto.js';
import { queryEmptyLegsSchema } from '../empty-legs/dto/empty-leg.dto.js';
import { EmptyLegsService } from '../empty-legs/empty-legs.service.js';
import { FLIGHT_WINDOWS, queryFlightsSchema } from '../flight-tracking/dto/flight-tracking.dto.js';
import { FlightTrackingService } from '../flight-tracking/flight-tracking.service.js';
import { ItinerariesService } from '../itineraries/itineraries.service.js';
import { createNoteSchema, queryNotesSchema } from '../notes/dto/note.dto.js';
import { NotesService } from '../notes/notes.service.js';
import { queryPayablesSchema } from '../operator-payments/dto/operator-payment.dto.js';
import { PayableState } from '../operator-payments/operator-payments.amounts.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { queryOperatorsSchema } from '../operators/dto/operator.dto.js';
import { OperatorsService } from '../operators/operators.service.js';
import { queryQuotesSchema, sendQuoteSchema } from '../quotes/dto/quote.dto.js';
import { QuotesService } from '../quotes/quotes.service.js';
import { queryInvoicesSchema } from '../receivables/dto/receivable.dto.js';
import { InvoiceState, paymentProblem, TripPaymentState } from '../receivables/receivables.amounts.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { reportWindowSchema } from '../reports/dto/reports.dto.js';
import { ReportsService } from '../reports/reports.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { addDays, windowDays } from '../schedule/schedule.calendar.js';
import { createTaskSchema, queryTasksSchema } from '../tasks/dto/task.dto.js';
import { TasksService } from '../tasks/tasks.service.js';
import { queryTransactionsSchema } from '../transactions/dto/transaction.dto.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { queryTripRequestsSchema, REQUEST_WINDOWS } from '../trip-requests/dto/trip-request.dto.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { changeTripStatusSchema, queryTripsSchema, rejectTripSchema, updateTripSchema } from '../trips/dto/trip.dto.js';
import { approveBlockedBy, rejectBlockedBy } from '../trips/trips.approval.js';
import { TripsService } from '../trips/trips.service.js';
import { queryUsersSchema } from '../users/dto/user.dto.js';
import { UsersService } from '../users/users.service.js';
import { ACTION_ACCESS, canAssignTask, canCreate, canReassign, parseLeadRequest } from './whatsapp.actions.js';
import type { AiToolSpec } from './whatsapp.ai-client.js';
import type { WhatsappDocument } from './whatsapp.document.js';
import {
  clientAssignPayload, clientFollowUpPayload, leadClientPayload, noteCreatePayload, paymentPayload,
  quoteSendPayload, taskCreatePayload, tripAssignPayload, tripStatusPayload, WhatsappPending, type PendingAction,
} from './whatsapp.pending.js';

// A tool takes a date string, not the timestamp compatibility input accepted
// by calendarDate's preprocessor. Validate before asking the shared helper
// to produce the UTC Date; JSON Schema therefore documents required strings.
const flightDate = z.iso.date('Use a YYYY-MM-DD date').transform((value) => calendarDate.parse(value));
const flightsArgs = z.object({
  from: flightDate,
  to: flightDate,
  status: z.enum(TripStatus).optional(),
}).strict().superRefine((value, context) => {
  // Zod can run object refinements after a field check fails. Keep the
  // original date error rather than invoking date arithmetic on that input.
  if (!(value.from instanceof Date) || !(value.to instanceof Date)) return;
  if (value.from > value.to) context.addIssue({ code: 'custom', message: '`from` must be on or before `to`', path: ['to'] });
  if (windowDays(value.from, value.to) > 14) context.addIssue({ code: 'custom', message: 'Ask for at most 14 days at a time', path: ['to'] });
});

// Reuse the DTO's enum and WEEK default rather than keeping another default.
const dashboardArgs = dashboardSummarySchema.pick({ period: true });
const clientArgs = z.object({ query: z.string().trim().min(2).max(100) }).strict();
const toolSearch = z.string().trim().min(2).max(100);
const tripRequestsArgs = z.object({
  status: z.enum(TripRequestStatus).optional(),
  departure: z.enum(REQUEST_WINDOWS).optional(),
  search: toolSearch.optional(),
}).strict();
const listQuotesArgs = z.object({
  status: z.enum(QuoteStatus).optional(),
  expired: z.boolean().optional(),
  sort: z.enum(['NEWEST', 'EXPIRING']).default('NEWEST'),
  search: toolSearch.optional(),
}).strict().refine(({ status, expired }) => status === undefined || expired === undefined, {
  path: ['expired'], message: 'Use either status or expired.',
});
const followUpsArgs = z.object({ window: z.enum(FOLLOW_UP_WINDOWS).exclude(['SCHEDULED']) }).strict();
const pipelineArgs = z.object({ stage: z.enum(LeadStage).optional() }).strict();
const notesArgs = z.object({ clientId: z.uuid() }).strict();
const flightStatusArgs = z.object({
  window: z.enum(FLIGHT_WINDOWS).default('ACTIVE'),
  flightStatus: queryFlightsSchema.shape.flightStatus,
  search: toolSearch.optional(),
}).strict();
const emptyLegsArgs = z.object({ status: z.enum(EmptyLegStatus).default(EmptyLegStatus.AVAILABLE), search: toolSearch.optional() }).strict();
const operatorArgs = z.object({ query: toolSearch, status: z.enum(OperatorStatus).optional() }).strict();
const aircraftArgs = z.object({
  query: toolSearch.optional(), category: z.enum(AircraftCategory).optional(),
  minPassengers: z.number().int().min(1).max(200).optional(), status: z.enum(AircraftStatus).optional(),
}).strict().refine(
  ({ query, category, minPassengers, status }) =>
    query !== undefined || category !== undefined || minPassengers !== undefined || status !== undefined,
  { message: 'Give a search, category, minimum passenger count or status.' },
);
const billsArgs = { open: z.boolean().optional(), search: toolSearch.optional() };
const listInvoicesArgs = z.object({ ...billsArgs, state: queryInvoicesSchema.shape.state }).strict();
const listOperatorBillsArgs = z.object({ ...billsArgs, state: queryPayablesSchema.shape.state }).strict();
const commissionsArgs = z.object({
  status: z.enum(CommissionStatus).default(CommissionStatus.EARNED), search: toolSearch.optional(),
}).strict();

const moneyDate = z.iso.date('Use a YYYY-MM-DD date');
function checkMoneyWindow(maxDaysApart: number) {
  return ({ from, to }: { from?: string; to?: string }, context: z.RefinementCtx) => {
    // Zod can run refinements even after a date fails its field check.
    const start = moneyDate.safeParse(from);
    const end = moneyDate.safeParse(to);
    if (!start.success || !end.success) return;
    if (start.data > end.data) context.addIssue({ code: 'custom', message: '`from` must be on or before `to`', path: ['to'] });
    if (windowDays(calendarDate.parse(start.data), calendarDate.parse(end.data)) - 1 > maxDaysApart) {
      context.addIssue({ code: 'custom', message: `Dates must be at most ${maxDaysApart} days apart`, path: ['to'] });
    }
  };
}
const transactionsArgs = z.object({
  from: moneyDate.optional(), to: moneyDate.optional(), direction: z.enum(MovementDirection).optional(),
  kind: z.enum(MovementKind).optional(),
}).strict().superRefine(checkMoneyWindow(31));
const financialSummaryArgs = z.object({ from: moneyDate, to: moneyDate }).strict().superRefine(checkMoneyWindow(366));

const timeZoneArgs = z.object({ timeZone: timeZoneSchema.nullable() }).strict();
const tripReference = z.string().trim().regex(/^(?:TJ-)?\d{1,9}$/i, 'Use a trip reference such as TJ-1048')
  .transform((reference) => Number(reference.replace(/^TJ-/i, '')));
const tripArgs = z.object({ reference: tripReference }).strict();
const declineArgs = tripArgs.extend(rejectTripSchema.shape);
const taskArgs = z.object({ taskId: z.uuid() }).strict();
const openTasksArgs = z.object({ search: z.string().trim().min(2).max(100).optional() }).strict();
const leadArgs = leadClientPayload.extend({
  email: z.string().trim().pipe(createClientSchema.shape.email.unwrap()).optional(),
  phone: createClientSchema.shape.phone.unwrap().min(1).optional(),
  originIcao: createAirportSchema.shape.icao.optional(),
  destinationIcao: createAirportSchema.shape.icao.optional(),
  departureDate: z.iso.date().optional(),
  passengers: z.number().int().optional(),
}).strict().refine(({ email, phone }) => Boolean(email || phone), 'Give an email or phone number');
const invoiceArgs = z.object({
  invoice: z.string().trim().toUpperCase().regex(/^INV-\d{4}-\d{4,10}$/, 'Use the full invoice number, such as INV-2026-0042'),
}).strict();
const paymentArgs = paymentPayload.extend(invoiceArgs.shape).strict();
const tripLookupArgs = z.object({ trip: tripReference }).strict();
const quoteArgs = z.object({
  quote: z.string().trim().regex(/^(?:Q-?)?\d{1,9}$/i, 'Use a quote reference such as Q-1042')
    .transform((reference) => Number(reference.replace(/^Q-?/i, ''))),
}).strict();
const staffName = z.string().trim().min(1).max(201);
const createTaskArgs = createTaskSchema.pick({ title: true, description: true, clientId: true }).extend({
  dueDate: moneyDate.optional(),
  priority: z.enum(TaskPriority).optional(),
  assignee: staffName.optional(),
  trip: tripReference.optional(),
}).strict();
const followUpArgs = z.object({
  clientId: z.uuid(),
  date: moneyDate,
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 14:30').default('09:00'),
  method: z.enum(FollowUpMethod).optional(),
  note: updateClientSchema.shape.followUpNote.unwrap().unwrap().optional(),
}).strict();
const addNoteArgs = notesArgs.extend({ body: createNoteSchema.shape.body }).strict();
const tripStatusArgs = tripLookupArgs.extend(changeTripStatusSchema.shape).strict();
const reassignArgs = z.object({
  record: z.enum(['TRIP', 'CLIENT']),
  trip: tripReference.optional(),
  clientId: z.uuid().optional(),
  broker: staffName,
}).strict().refine(
  ({ record, trip, clientId }) =>
    record === 'TRIP' ? trip !== undefined && clientId === undefined : clientId !== undefined && trip === undefined,
  { message: 'For TRIP give only trip. For CLIENT give only clientId.' },
);
const markQuoteSentArgs = quoteArgs.extend({ validUntil: moneyDate.optional(), note: sendQuoteSchema.shape.note }).strict();

const person = z.object({ firstName: z.string(), lastName: z.string() });
const staffRow = person.extend({ id: z.uuid() });
const clientName = person.extend({ companyName: z.string().nullable() });
const nameOf = (row: z.infer<typeof person>) => [row.firstName, row.lastName].filter(Boolean).join(' ') || null;

/**
 * The list services deliberately return `unknown`. Read only these fields at
 * that boundary; validation fails closed if their response ever changes.
 */
const flightRow = z.object({
  departureDate: z.date(), departureTime: z.string().nullable(),
  originAirport: z.object({ icao: z.string() }),
  destinationAirport: z.object({ icao: z.string() }),
  trip: z.object({
    reference: z.number(), status: z.enum(TripStatus), client: clientName,
    aircraft: z.object({ tailNumber: z.string(), model: z.string() }).nullable(),
    aircraftDescription: z.string().nullable(),
  }),
});
const clientRow = clientName.extend({
  id: z.string(), email: z.string().nullable(), phone: z.string().nullable(),
  status: z.string(), leadStage: z.string(), assignedBroker: person.nullable(),
  homeAirport: z.object({ icao: z.string() }).nullable(), nextFollowUpAt: z.date().nullable(),
});
const airportCode = z.object({ icao: z.string() });
const airportRow = airportCode.extend({ id: z.uuid() });
const salesRouteRow = z.object({
  reference: z.number(), client: clientName, assignedBroker: person.nullable(),
  originAirport: airportCode.nullable(), destinationAirport: airportCode.nullable(), departureDate: z.date().nullable(),
});
const tripRequestRow = salesRouteRow.extend({
  passengers: z.number().nullable(), aircraftPreference: z.enum(AircraftCategory).nullable(), status: z.enum(TripRequestStatus),
});
const quoteListRow = salesRouteRow.extend({ status: z.enum(QuoteStatus), validUntil: z.date().nullable(), totalPrice: z.number() });
const salesClientRow = clientName.extend({ id: z.uuid(), assignedBroker: person.nullable(), nextFollowUpAt: z.date().nullable() });
const followUpRow = salesClientRow.extend({
  status: z.enum(ClientStatus), leadStage: z.enum(LeadStage),
  followUpMethod: z.enum(FollowUpMethod).nullable(), followUpNote: z.string().nullable(),
});
const leadRow = salesClientRow.extend({ leadSource: z.enum(LeadSource), priority: z.enum(ClientPriority) });
const noteRow = z.object({ createdAt: z.date(), createdBy: person.nullable(), visibility: z.enum(NoteVisibility), body: z.string() });
const tripRow = z.object({
  id: z.uuid(), reference: z.number(), client: clientName, assignedBroker: person.nullable(),
  status: z.enum(TripStatus), assignedBrokerId: z.uuid().nullable(),
  approvalStatus: z.enum(TripApprovalStatus),
  legs: z.array(z.object({ originAirport: airportCode, destinationAirport: airportCode, departureDate: z.date().nullable() })),
});
const operatorName = z.object({ name: z.string() });
const aircraftIdentity = z.object({ tailNumber: z.string(), model: z.string() });
const legRouteRow = z.object({
  originAirport: airportCode, destinationAirport: airportCode, departureDate: z.date().nullable(), departureTime: z.string().nullable(),
});
const tripDetailRow = tripRow.pick({ reference: true, client: true, assignedBroker: true, approvalStatus: true }).extend({
  status: z.enum(TripStatus), type: z.enum(TripType), operator: operatorName.nullable(), aircraft: aircraftIdentity.nullable(),
  legs: z.array(legRouteRow.extend({ sequence: z.number() })),
  passengerCount: z.number().nullable(), passengers: z.array(z.object({ fullName: z.string() })),
  totalPrice: z.number().nullable(), operatorCost: z.number().nullable().optional(),
  grossProfit: z.number().nullable().optional(), marginPercentage: z.number().nullable().optional(),
  clientPayment: z.object({
    state: z.enum(TripPaymentState), invoiced: z.number(), paid: z.number(), balance: z.number(), invoiceCount: z.number(),
  }).optional(),
});
const flightStatusRow = legRouteRow.extend({
  sequence: z.number(), legCount: z.number(), flightStatus: z.enum(FlightStatus).nullable(),
  estimatedArrival: z.string().nullable(), flightStatusAt: z.date().nullable(),
  trip: z.object({
    reference: z.number(), aircraft: aircraftIdentity.pick({ tailNumber: true }).nullable(), operator: operatorName.nullable(),
  }),
});
const emptyLegRow = legRouteRow.extend({
  departureDate: z.date(), aircraft: aircraftIdentity.nullable(), aircraftDescription: z.string().nullable(),
  operator: operatorName.nullable(), seats: z.number().nullable(), price: z.number().nullable(),
  status: z.enum(EmptyLegStatus), expiresAt: z.date().nullable(),
});
const operatorRow = operatorName.extend({
  status: z.enum(OperatorStatus), primaryContact: z.string().nullable(), contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(), generalPhone: z.string().nullable(), reliabilityRating: z.number().nullable(),
  safetyRating: z.number().nullable(), responseSpeed: z.enum(ResponseSpeed).nullable(), paymentTerms: z.enum(PaymentTerms).nullable(),
  fleetSize: z.number().optional(),
});
const aircraftRow = aircraftIdentity.extend({
  category: z.enum(AircraftCategory), status: z.enum(AircraftStatus), maxPassengers: z.number().nullable(),
  operator: operatorName.nullable(), homeBase: airportCode.nullable(),
});
const taskRow = z.object({
  id: z.uuid(), title: z.string(), status: z.enum(TaskStatus), priority: z.enum(TaskPriority),
  dueDate: z.date().nullable(), assignee: person.nullable(), client: clientName.nullable(),
});
const invoiceRow = z.object({
  id: z.uuid(), number: z.string(), client: clientName, status: z.enum(InvoiceStatus),
  total: z.number(), paid: z.number(), balance: z.number(),
});
const amountOnFile = z.number().nullish();
const tripReferenceRow = z.object({ reference: z.number() });
const billRow = z.object({
  number: z.string(), trip: tripReferenceRow, paid: amountOnFile, balance: amountOnFile, dueDate: z.date().nullable(),
});
const invoiceListRow = billRow.extend({ client: clientName, state: z.enum(InvoiceState), total: amountOnFile });
const operatorBillRow = billRow.extend({ operator: operatorName, state: z.enum(PayableState), amount: amountOnFile });
const creditSummaryRow = z.object({
  balance: amountOnFile, credited: amountOnFile, applied: amountOnFile, entries: z.number(), lastMovementAt: z.date().nullable(),
});
const commissionRow = z.object({
  recipientLabel: z.string().nullable(), recipientType: z.enum(CommissionRecipientType), trip: tripReferenceRow,
  status: z.enum(CommissionStatus), value: amountOnFile, paidAt: z.date().nullable(),
});
const transactionRow = z.object({
  date: z.date(), kind: z.enum(MovementKind), direction: z.enum(MovementDirection), amount: amountOnFile,
  counterparty: z.object({ name: z.string() }), reference: z.string().nullable(),
  document: z.object({ number: z.string() }), trip: tripReferenceRow.nullable(),
});
const financialSummaryRow = z.object({
  from: moneyDate, to: moneyDate, tripCount: z.number(), marginPercentage: z.number().nullish(),
  revenue: amountOnFile, profit: amountOnFile, fetCharged: amountOnFile, averageRevenue: amountOnFile, averageProfit: amountOnFile,
  collected: z.object({ cash: amountOnFile, fet: amountOnFile }),
  outstanding: z.object({ receivables: amountOnFile, payables: amountOnFile }),
});
const quoteRow = z.object({ id: z.uuid(), reference: z.number() });
const matchedClientRow = clientName.extend({ id: z.uuid(), email: z.string().nullable() });

const isoDay = (date: Date | null | undefined) => date?.toISOString().slice(0, 10) ?? null;
const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const briefDay = (date: Date) => dayFormat.format(date).replace(',', '');
const displayName = (client: z.infer<typeof clientName>) => nameOf(client) || client.companyName || '—';
const tripLabel = (reference: number) => `TJ-${reference}`;
const formatPrice = (amount: number | null) => amount === null ? null : formatDollars(toCents(amount));
function formatAmounts(amounts: Record<string, number | null | undefined>) {
  return Object.fromEntries(Object.entries(amounts).flatMap(([field, amount]) =>
    amount === undefined ? [] : [[field, formatPrice(amount)] as const],
  ));
}

function openFilter(open: boolean | undefined, state: string | undefined) {
  if (open !== undefined) return String(open);
  return state === undefined ? 'true' : undefined;
}

function transactionWindow(from: string | undefined, to: string | undefined, timeZone: string) {
  if (from !== undefined && to !== undefined) return { from, to };
  // An inclusive seven-day window has six days between its endpoints.
  if (from !== undefined) return { from, to: isoDay(addDays(calendarDate.parse(from), 6)) };
  const last = to ?? nowIn(timeZone).date;
  return { from: isoDay(addDays(calendarDate.parse(last), -6)), to: last };
}

const paymentLabels: Record<PaymentMethod, string> = {
  WIRE_TRANSFER: 'wire', ACH: 'ACH', CHECK: 'check', ZELLE: 'Zelle', CREDIT_CARD: 'credit card', OTHER: 'other',
};
const followUpLabels: Record<FollowUpMethod, string> = {
  CALL: 'phone', EMAIL: 'email', WHATSAPP: 'WhatsApp', SMS: 'SMS',
};
const staffRoles = Object.values(UserRole).filter((role) => !isPartner(role));

/** A search can match a name as well as a reference. Check every page for an exact match. */
async function exactMatches<T>(
  read: (page: number) => Promise<Paginated<unknown>>, schema: z.ZodType<T>, matches: (row: T) => boolean,
  maxMatches = 2,
): Promise<T[]> {
  const found: T[] = [];
  for (let page = 1; ; page++) {
    const result = await read(page);
    for (const item of result.items) {
      const row = schema.parse(item);
      if (matches(row)) found.push(row);
      if (found.length === maxMatches) return found;
    }
    if (!result.meta.hasNext) return found;
  }
}

function tripDetails(row: z.infer<typeof tripRow>): string {
  const leg = row.legs[0];
  return `${displayName(row.client)}, ${leg?.originAirport.icao ?? '—'} → ${leg?.destinationAirport.icao ?? '—'}, ${leg?.departureDate ? briefDay(leg.departureDate) : '—'}`;
}

export const ONE_ACTION_REPLY = 'One action at a time — confirm or cancel the first';
export const NOT_PERMITTED = 'Not permitted for this account';

type Proposal = { proposed: true; summary: string };
type ActionDraft<T = PendingAction> = T extends PendingAction ? Omit<T, 'userId' | 'summary' | 'createdAt'> : never;
export function isProposal(result: unknown): result is Proposal {
  return typeof result === 'object' && result !== null &&
    'proposed' in result && result.proposed === true && 'summary' in result && typeof result.summary === 'string';
}

export interface ToolContext {
  timeZone: string;
  companyTimeZone(): Promise<string>;
  documents: WhatsappDocument[];
  attachedNames?: Map<string, string>;
  /** Only the gated webhook gives the dispatcher a phone for proposals. */
  phone?: string;
  proposed?: boolean;
  replyPrefix?: string;
}

async function attachDocument(context: ToolContext, key: string, render: () => Promise<WhatsappDocument>) {
  const attached = context.attachedNames?.get(key);
  if (attached !== undefined) return { attached };
  if (context.documents.length >= 3) return { error: 'Three documents per message — ask for the rest next' };

  const file = await render();
  context.documents.push(file);
  (context.attachedNames ??= new Map()).set(key, file.filename);
  return { attached: file.filename };
}

interface ToolDefinition<S extends z.ZodType> {
  name: string;
  description: string;
  schema: S;
  permission: { module: Module; action: Action } | 'own-account' | ((user: AuthenticatedUser) => boolean);
  proposal?: true;
  run(user: AuthenticatedUser, args: z.output<S>, context: ToolContext): Promise<unknown>;
}

/** Validation and capability travel with the tool, so no dispatch can skip them. */
function defineTool<S extends z.ZodType>(definition: ToolDefinition<S>) {
  return {
    ...definition,
    async dispatch(user: AuthenticatedUser, raw: unknown, context: ToolContext): Promise<unknown> {
      const args = definition.schema.safeParse(raw);
      if (!args.success) return { error: args.error.message };
      // Like PATCH /auth/me, the own-account tool can edit only the caller's row.
      const permission = definition.permission;
      const allowed = typeof permission === 'function' ? permission(user)
        : permission === 'own-account' || canDo(user.access, permission.module, permission.action);
      if (!allowed) {
        return { error: NOT_PERMITTED };
      }
      return definition.run(user, args.data, context);
    },
  };
}

/**
 * The webhook has no AccessGuard. This dispatcher makes its capability check
 * on every tool call, then lets the owning service apply reach and field rules.
 */
@Injectable()
export class WhatsappTools {
  private readonly logger = new Logger(WhatsappTools.name);
  private readonly definitions;

  constructor(
    schedule: ScheduleService, dashboard: DashboardService, clients: ClientsService, auth: AuthService,
    trips: TripsService, tasks: TasksService, airports: AirportsService, receivables: ReceivablesService,
    pending: WhatsappPending, itineraries: ItinerariesService, quotes: QuotesService,
    tripRequests: TripRequestsService, notes: NotesService,
    flightTracking: FlightTrackingService, emptyLegs: EmptyLegsService, operators: OperatorsService, aircraft: AircraftService,
    operatorPayments: OperatorPaymentsService, clientCredits: ClientCreditsService, commissions: CommissionsService,
    transactions: TransactionsService, reports: ReportsService,
    users: UsersService,
  ) {
    const resolveTrip = async (user: AuthenticatedUser, reference: number) => {
      const label = tripLabel(reference);
      const [trip, duplicate] = await exactMatches(
        (page) => trips.findAll(user, queryTripsSchema.parse({ search: label, page, limit: MAX_PAGE_SIZE })),
        tripRow, (row) => row.reference === reference,
      );
      if (!trip || duplicate) throw new BadRequestException(`No trip ${label} you can see`);
      return trip;
    };
    const resolveInvoice = async (user: AuthenticatedUser, invoice: string) => {
      const [row, duplicate] = await exactMatches(
        (page) => receivables.findAll(user, queryInvoicesSchema.parse({ search: invoice, page, limit: MAX_PAGE_SIZE })),
        invoiceRow, (item) => item.number === invoice,
      );
      if (!row || duplicate) throw new BadRequestException(`No invoice ${invoice} you can see`);
      return row;
    };
    const resolveQuote = async (user: AuthenticatedUser, reference: number) => {
      const label = `Q-${reference}`;
      const [quote, duplicate] = await exactMatches(
        (page) => quotes.findAll(user, queryQuotesSchema.parse({ search: label, page, limit: MAX_PAGE_SIZE })),
        quoteRow, (row) => row.reference === reference,
      );
      if (!quote || duplicate) throw new BadRequestException(`No quote ${label} you can see`);
      return quote;
    };
    const resolveLiveClient = async (user: AuthenticatedUser, id: string) => {
      const client = await clients.findOne(user, id);
      if (client.deletedAt) throw new BadRequestException('That client has been archived.');
      return client;
    };
    const resolveLiveSubject = async (user: AuthenticatedUser, id: string) => {
      const client = await clients.subjectRef(user, id);
      if (client.archived) throw new BadRequestException('That client has been archived.');
      return client;
    };
    const resolveStaff = async (user: AuthenticatedUser, name: string, brokersOnly = false) => {
      const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
      const query = normalizeName(name);
      const me = !brokersOnly && query === 'me';
      const fullName = (row: z.infer<typeof staffRow>) => `${row.firstName} ${row.lastName}`.trim();
      const matchesFullName = (row: z.infer<typeof staffRow>) => normalizeName(fullName(row)) === query;
      // The directory searches one column at a time. Search by a single
      // token, then compare exact names across all returned pages.
      const search = me ? user.email : query.split(' ')[0];
      const candidates = await exactMatches(
        (page) => users.findAll(user, queryUsersSchema.parse({
          search, page, limit: MAX_PAGE_SIZE, status: UserStatus.ACTIVE,
          role: (brokersOnly ? BROKER_ROLES : staffRoles).join(','),
        })),
        staffRow, (row) => me ? row.id === user.id : matchesFullName(row) || normalizeName(row.firstName) === query,
        me ? 1 : Infinity,
      );
      const fullMatches = candidates.filter(matchesFullName);
      const matches = fullMatches.length ? fullMatches : candidates;
      const [match] = matches;
      if (!match) throw new BadRequestException(`No active staff member named ${name}`);
      if (matches.length > 1) throw new BadRequestException(`More than one active staff member matches ${name}: ${matches.map(fullName).join(', ')}`);
      return { id: match.id, name: fullName(match) };
    };
    const resolveAirport = async (icao: string, label: string) => {
      const [airport, duplicate] = await exactMatches(
        (page) => airports.findAll(queryAirportsSchema.parse({ search: icao, page, limit: MAX_PAGE_SIZE })),
        airportRow, (row) => row.icao === icao,
      );
      if (!airport || duplicate) throw new BadRequestException(`Unknown ${label} airport ${icao}`);
      return airports.usable(airport.id, label);
    };
    const propose = async (
      user: AuthenticatedUser, context: ToolContext, summary: string,
      action: ActionDraft,
    ): Promise<Proposal | { error: string }> => {
      if (!context.phone) return { error: NOT_PERMITTED };
      if (context.proposed) return { error: ONE_ACTION_REPLY };
      // A truncated summary would hide something the caller is confirming.
      if (summary.length + (context.replyPrefix?.length ?? 0) > 3300) {
        return { error: 'That proposal is too long to show in WhatsApp. Ask for shorter details before proposing it.' };
      }
      context.proposed = true;
      try {
        await pending.put(context.phone, { ...action, userId: user.id, summary, createdAt: new Date().toISOString() });
      } catch (error: unknown) {
        context.proposed = false;
        throw error;
      }
      return { proposed: true, summary };
    };
    const proposeLine = (user: AuthenticatedUser, context: ToolContext, summary: string, action: ActionDraft) =>
      propose(user, context, summary.replace(/[\r\n\u2028\u2029]+/g, ' '), action);
    this.definitions = [
      defineTool({
        name: 'list_flights',
        description: 'List up to 25 flight legs departing in an inclusive date window of at most 14 days. Dates are YYYY-MM-DD. Cancelled trips are excluded unless status is CANCELLED. Total may exceed the returned legs; ask for a narrower window when it does.',
        schema: flightsArgs,
        // Schedule GET is open for pickers. The bot is a screen and needs VIEW.
        permission: { module: Module.SCHEDULE, action: Action.VIEW },
        async run(user, args) {
          const page = await schedule.findAll(user, { ...args, page: 1, limit: 25 });
          return {
            total: page.meta.total,
            flights: page.items.map((item) => {
              const row = flightRow.parse(item);
              return {
                reference: `TJ-${row.trip.reference}`,
                departureDate: row.departureDate.toISOString().slice(0, 10),
                departureTime: row.departureTime,
                origin: row.originAirport.icao,
                destination: row.destinationAirport.icao,
                aircraft: row.trip.aircraft
                  ? { tail: row.trip.aircraft.tailNumber, model: row.trip.aircraft.model }
                  : null,
                aircraftDescription: row.trip.aircraftDescription,
                client: nameOf(row.trip.client) || row.trip.client.companyName,
                status: row.trip.status,
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'dashboard_kpis',
        description: 'Read the desk headline figures for TODAY, WEEK, MONTH, QUARTER or YEAR (year to date). Default WEEK. Comparison fields are computed by the CRM; null means no comparison is on file. Some current counts have no comparison.',
        schema: dashboardArgs,
        permission: { module: Module.DASHBOARD, action: Action.VIEW },
        async run(user, { period }) {
          const summary = await dashboard.summary(user, { period });
          // Every figure is the service's own. Only tiles with comparisons
          // carry them; an absent comparison is never invented as zero.
          const tiles: { label: string; value: number | null; previous?: number; change?: number | null }[] = [
            { label: 'Upcoming trips', value: summary.trips.upcoming },
            { label: 'Departing trips', value: summary.trips.departing.current, previous: summary.trips.departing.previous, change: summary.trips.departing.change },
            { label: 'Active requests', value: summary.requests.active },
            { label: 'Awaiting sourcing', value: summary.requests.awaitingSourcing },
            { label: 'Pipeline value', value: summary.requests.pipelineValue },
          ];
          if (summary.money) {
            for (const [label, figure] of [
              ['Revenue', summary.money.revenue], ['FET', summary.money.fet], ['Gross profit', summary.money.profit],
            ] as const) tiles.push({ label, value: figure.current, previous: figure.previous, change: figure.change });
            tiles.push({ label: 'Profit margin percentage', value: summary.money.profit.marginPercentage });
          }
          if (summary.receivables) {
            tiles.push(
              { label: 'Receivables outstanding', value: summary.receivables.outstanding },
              { label: 'Receivables overdue', value: summary.receivables.overdue },
              { label: 'Overdue receivables count', value: summary.receivables.overdueCount },
              { label: 'Open receivables count', value: summary.receivables.openCount },
            );
          }
          if (summary.operatorPayments) {
            tiles.push(
              { label: 'Operator payments outstanding', value: summary.operatorPayments.outstanding },
              { label: 'Operator payments overdue', value: summary.operatorPayments.overdue },
              { label: 'Overdue operator payments count', value: summary.operatorPayments.overdueCount },
              { label: 'Operator payments due this week', value: summary.operatorPayments.dueThisWeek },
              { label: 'Operator payments amount due this week', value: summary.operatorPayments.dueThisWeekAmount },
            );
          }
          if (summary.emptyLegs) {
            tiles.push(
              { label: 'Available empty legs', value: summary.emptyLegs.available },
              { label: 'Matched empty legs', value: summary.emptyLegs.matched },
              { label: 'Empty legs open value', value: summary.emptyLegs.openValue },
            );
          }
          return { period: summary.period, from: summary.from, to: summary.to, previousFrom: summary.previousFrom, previousTo: summary.previousTo, tiles };
        },
      }),
      defineTool({
        name: 'find_client',
        // The clients search matches the whole string against one column at a
        // time, so "Elena Rostova" matches nobody; the model must send one name.
        description: 'Find up to five live clients by name, company, email or phone using a search string of 2–100 characters. The search matches one field at a time, so send a single name (the surname is best), a company, an email or a phone — never a full name. If a surname finds nobody, try the first name. Returns only contact, assignment and follow-up details. Total may exceed the returned clients; narrow the search when it does. Use the client id with client_notes to read their notes.',
        schema: clientArgs,
        permission: { module: Module.CLIENTS, action: Action.VIEW },
        async run(user, args, { timeZone }) {
          const page = await clients.findAll(user, queryClientsSchema.parse({ search: args.query, page: 1, limit: 5 }));
          return {
            total: page.meta.total,
            clients: page.items.map((item) => {
              const row = clientRow.parse(item);
              return {
                id: row.id, displayName: nameOf(row) || row.companyName,
                company: row.companyName, email: row.email, phone: row.phone,
                status: row.status, leadStage: row.leadStage,
                assignedBroker: row.assignedBroker ? nameOf(row.assignedBroker) : null,
                homeAirport: row.homeAirport?.icao ?? null,
                nextFollowUpAt: formatMomentIn(row.nextFollowUpAt, timeZone),
                timeZone,
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'set_my_timezone',
        description: 'Set the Super Admin’s own time zone whenever they say where they are or ask for another zone ("I\'m in London", "use Dubai time"). Send the IANA name for the place they named (London → Europe/London), or null when they ask to use the company time. Do not call it otherwise.',
        schema: timeZoneArgs,
        permission: 'own-account',
        async run(user, { timeZone }, context) {
          const effective = timeZone ?? await context.companyTimeZone();
          await auth.updateProfile(user.id, { timeZone }, { ipAddress: null, userAgent: 'WhatsApp assistant' });
          // Later calls in this reply use the same clock as the confirmation.
          context.timeZone = effective;
          return { timeZone: effective, usingCompanyDefault: timeZone === null, now: nowIn(effective) };
        },
      }),
      defineTool({
        name: 'list_pending_approvals',
        description: 'List up to ten live trips awaiting approval, newest first. Returns the trip reference, client, first leg and assigned broker.',
        schema: z.strictObject({}),
        permission: { module: Module.TRIPS, action: Action.VIEW },
        async run(user) {
          const page = await trips.findAll(user, queryTripsSchema.parse({ approvalStatus: TripApprovalStatus.PENDING }));
          return {
            total: page.meta.total,
            trips: page.items.map((item) => {
              const row = tripRow.parse(item);
              const leg = row.legs[0];
              return {
                reference: tripLabel(row.reference), client: displayName(row.client),
                origin: leg?.originAirport.icao ?? null, destination: leg?.destinationAirport.icao ?? null,
                departureDate: isoDay(leg?.departureDate),
                assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_open_tasks',
        description: 'List up to ten non-completed tasks, soonest due first. Optional search of 2–100 characters. Use the returned id to propose completing a task.',
        schema: openTasksArgs,
        permission: { module: Module.TASKS, action: Action.VIEW },
        async run(user, { search }) {
          const page = await tasks.findAll(user, queryTasksSchema.parse({ view: 'OPEN', search }));
          return {
            total: page.meta.total,
            tasks: page.items.map((item) => {
              const row = taskRow.parse(item);
              return {
                id: row.id, title: row.title, status: row.status, priority: row.priority,
                dueDate: isoDay(row.dueDate), assignee: row.assignee && nameOf(row.assignee),
                client: row.client && displayName(row.client),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_trip_requests',
        description: 'List up to ten live trip requests with their client, route, departure date, passengers, aircraft preference, status and assigned broker. Defaults to open requests. Filter by status or the CRM’s departure window, or search by reference, client or route using 2–100 characters.',
        schema: tripRequestsArgs,
        permission: { module: Module.TRIP_REQUESTS, action: Action.VIEW },
        async run(user, { status, departure, search }) {
          const page = await tripRequests.findAll(user, queryTripRequestsSchema.parse({
            status, departure, search, openOnly: String(status === undefined), limit: 10,
          }));
          return {
            total: page.meta.total,
            requests: page.items.map((item) => {
              const row = tripRequestRow.parse(item);
              return {
                reference: `TR-${row.reference}`, client: displayName(row.client),
                origin: row.originAirport?.icao ?? null, destination: row.destinationAirport?.icao ?? null,
                departureDate: isoDay(row.departureDate), passengers: row.passengers,
                aircraftPreference: row.aircraftPreference, status: row.status,
                assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_quotes',
        description: 'List up to ten live quotes with their client, route, departure date, status, valid-until date, client offer total and assigned broker. Defaults to open quotes, newest first. Use sort EXPIRING for the earliest valid-until dates. Use either status or expired. Optional search of 2–100 characters.',
        schema: listQuotesArgs,
        permission: { module: Module.QUOTES, action: Action.VIEW },
        async run(user, { status, expired, sort, search }) {
          const page = await quotes.findAll(user, queryQuotesSchema.parse({
            status, expired: expired === undefined ? undefined : String(expired), search,
            openOnly: String(status === undefined && expired === undefined), limit: 10,
            ...(sort === 'EXPIRING' ? { sortBy: 'validUntil', sortOrder: 'asc' } : {}),
          }));
          return {
            total: page.meta.total,
            quotes: page.items.map((item) => {
              const row = quoteListRow.parse(item);
              return {
                reference: `Q-${row.reference}`, client: displayName(row.client),
                origin: row.originAirport?.icao ?? null, destination: row.destinationAirport?.icao ?? null,
                departureDate: isoDay(row.departureDate), status: row.status, validUntil: isoDay(row.validUntil),
                // Formatted here: the model reads 35935.1 back as "35,935.1".
                totalPrice: formatDollars(toCents(row.totalPrice)), assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'client_follow_ups',
        description: 'List up to ten client follow-ups in the CRM’s OVERDUE, TODAY or UPCOMING window, soonest first. Returns the client, lead stage, follow-up time in your time zone, method, note and assigned broker. The returned client id can be used with client_notes.',
        schema: followUpsArgs,
        permission: { module: Module.CLIENTS, action: Action.VIEW },
        async run(user, { window }, { timeZone }) {
          const page = await clients.findAll(user, queryClientsSchema.parse({
            followUp: window, sortBy: 'nextFollowUpAt', sortOrder: 'asc', limit: 10,
          }));
          return {
            window, total: page.meta.total,
            followUps: page.items.map((item) => {
              const row = followUpRow.parse(item);
              return {
                id: row.id, displayName: displayName(row), status: row.status, leadStage: row.leadStage,
                nextFollowUpAt: formatMomentIn(row.nextFollowUpAt, timeZone),
                followUpMethod: row.followUpMethod, followUpNote: row.followUpNote,
                assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'lead_pipeline',
        description: 'Count live leads in every pipeline stage when no stage is given. Give a stage to list up to ten leads in it, newest first, with their name, company, source, priority, next follow-up and assigned broker. Use a returned client id with client_notes.',
        schema: pipelineArgs,
        permission: { module: Module.LEADS_AGENTS, action: Action.VIEW },
        async run(user, { stage }, { timeZone }) {
          if (!canDo(user.access, Module.CLIENTS, Action.VIEW)) return { error: NOT_PERMITTED };
          if (stage === undefined) {
            const stages = await Promise.all(Object.values(LeadStage).map(async (leadStage) => {
              const { meta } = await clients.findAll(user, queryClientsSchema.parse({ status: ClientStatus.LEAD, leadStage, limit: 1 }));
              return { stage: leadStage, count: meta.total };
            }));
            return { stages };
          }
          const page = await clients.findAll(user, queryClientsSchema.parse({ status: ClientStatus.LEAD, leadStage: stage, limit: 10 }));
          return {
            total: page.meta.total,
            leads: page.items.map((item) => {
              const row = leadRow.parse(item);
              return {
                id: row.id, displayName: displayName(row), company: row.companyName,
                leadSource: row.leadSource, priority: row.priority, nextFollowUpAt: formatMomentIn(row.nextFollowUpAt, timeZone),
                assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'client_notes',
        description: 'List up to ten live notes for one client, newest first, with date in your time zone, author, visibility and body up to 500 characters. Use the client id from find_client, client_follow_ups or lead_pipeline. A Client not found error means there is no client you can see with that id.',
        schema: notesArgs,
        permission: { module: Module.CLIENTS, action: Action.VIEW },
        async run(user, { clientId }, { timeZone }) {
          const page = await notes.findAll(user, queryNotesSchema.parse({ subjectType: NoteSubjectType.CLIENT, subjectId: clientId, limit: 10 }));
          return {
            total: page.meta.total,
            notes: page.items.map((item) => {
              const row = noteRow.parse(item);
              const characters = Array.from(row.body);
              return {
                date: formatMomentIn(row.createdAt, timeZone), author: row.createdBy && nameOf(row.createdBy),
                visibility: row.visibility,
                body: characters.length > 500 ? `${characters.slice(0, 499).join('')}…` : row.body,
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'trip_details',
        description: 'Read one trip by reference, such as TJ-1048 or 1048. Returns the trip and approval status, client, assignment, aircraft, operator, legs, passenger count and names, price and any permitted payment or margin figures. Use list_flight_status to see whether a leg has departed, is delayed or has landed.',
        schema: tripLookupArgs,
        permission: { module: Module.TRIPS, action: Action.VIEW },
        async run(user, { trip: reference }) {
          const trip = await resolveTrip(user, reference);
          const row = tripDetailRow.parse(await trips.findOne(user, trip.id));
          const { operatorCost, grossProfit, marginPercentage, clientPayment } = row;
          return {
            reference: tripLabel(row.reference), status: row.status, approvalStatus: row.approvalStatus, type: row.type,
            client: displayName(row.client), assignedBroker: row.assignedBroker && nameOf(row.assignedBroker),
            operator: row.operator?.name ?? null,
            aircraft: row.aircraft && { tail: row.aircraft.tailNumber, model: row.aircraft.model },
            legs: row.legs.map((leg) => ({
              sequence: leg.sequence, origin: leg.originAirport.icao, destination: leg.destinationAirport.icao,
              departureDate: isoDay(leg.departureDate), departureTimeLocal: leg.departureTime,
            })),
            passengerCount: row.passengerCount, passengers: row.passengers.map((passenger) => passenger.fullName),
            totalPrice: formatPrice(row.totalPrice),
            ...(operatorCost === undefined ? {} : { operatorCost: formatPrice(operatorCost) }),
            ...(grossProfit === undefined ? {} : { grossProfit: formatPrice(grossProfit) }),
            ...(marginPercentage === undefined ? {} : { marginPercentage: marginPercentage === null ? null : `${marginPercentage}%` }),
            ...(clientPayment === undefined ? {} : { clientPayment: {
              state: clientPayment.state, invoiced: formatDollars(toCents(clientPayment.invoiced)),
              paid: formatDollars(toCents(clientPayment.paid)), balance: formatDollars(toCents(clientPayment.balance)),
              invoiceCount: clientPayment.invoiceCount,
            } }),
          };
        },
      }),
      defineTool({
        name: 'list_flight_status',
        description: 'List up to ten flight legs and their reported status, local departure and estimated arrival times, status-update time, aircraft tail and operator. The ACTIVE window includes upcoming flights and those still reported in flight or delayed. Use TODAY or PAST for another window, NONE for an unreported status, or search by trip reference, client, aircraft or operator.',
        schema: flightStatusArgs,
        permission: { module: Module.FLIGHT_TRACKING, action: Action.VIEW },
        async run(user, { window, flightStatus, search }, { timeZone }) {
          const page = await flightTracking.findAll(user, queryFlightsSchema.parse({
            window, flightStatus, search, on: nowIn(timeZone).date, limit: 10,
          }));
          return {
            total: page.meta.total,
            flights: page.items.map((item) => {
              const row = flightStatusRow.parse(item);
              return {
                reference: tripLabel(row.trip.reference), sequence: row.sequence, legCount: row.legCount,
                origin: row.originAirport.icao, destination: row.destinationAirport.icao,
                departureDate: isoDay(row.departureDate), departureTimeLocal: row.departureTime,
                flightStatus: row.flightStatus, estimatedArrivalLocal: row.estimatedArrival,
                flightStatusAt: formatMomentIn(row.flightStatusAt, timeZone),
                tailNumber: row.trip.aircraft?.tailNumber ?? null, operator: row.trip.operator?.name ?? null,
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_empty_legs',
        description: 'List up to ten live empty legs, defaulting to AVAILABLE. Returns route, local departure time, aircraft, operator, seats on file, asking price, status and offer expiry. Use a status or search by route, tail or operator to narrow the list.',
        schema: emptyLegsArgs,
        permission: { module: Module.EMPTY_LEGS, action: Action.VIEW },
        async run(user, { status, search }, { timeZone }) {
          const page = await emptyLegs.findAll(user, queryEmptyLegsSchema.parse({ status, search, limit: 10 }));
          return {
            total: page.meta.total,
            emptyLegs: page.items.map((item) => {
              const row = emptyLegRow.parse(item);
              return {
                origin: row.originAirport.icao, destination: row.destinationAirport.icao,
                departureDate: isoDay(row.departureDate), departureTimeLocal: row.departureTime,
                aircraft: row.aircraft ? { tail: row.aircraft.tailNumber, model: row.aircraft.model } : row.aircraftDescription,
                operator: row.operator?.name ?? null, ...(row.seats === null ? {} : { seats: row.seats }),
                price: formatPrice(row.price), status: row.status, expiresAt: formatMomentIn(row.expiresAt, timeZone),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'find_operator',
        description: 'Find up to five live operators by name, home base, contact or email using a search of 2–100 characters. Optionally filter by status. Returns contacts, ratings on file, response speed, payment terms and fleet size when provided.',
        schema: operatorArgs,
        permission: { module: Module.OPERATORS, action: Action.VIEW },
        async run(user, { query, status }) {
          const page = await operators.findAll(user, queryOperatorsSchema.parse({ search: query, status, limit: 5 }));
          return {
            total: page.meta.total,
            operators: page.items.map((item) => {
              const row = operatorRow.parse(item);
              return {
                name: row.name, status: row.status, primaryContact: row.primaryContact, contactEmail: row.contactEmail,
                contactPhone: row.contactPhone, generalPhone: row.generalPhone, reliabilityRating: row.reliabilityRating,
                safetyRating: row.safetyRating, responseSpeed: row.responseSpeed, paymentTerms: row.paymentTerms,
                ...(row.fleetSize === undefined ? {} : { fleetSize: row.fleetSize }),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'find_aircraft',
        description: 'Find up to ten live aircraft by tail, model, operator or home base, or by category, minimum passenger count or status. Give at least one filter. Use minPassengers for the seats needed, such as 9. Returns tail, model, category, status, capacity, operator and home base ICAO.',
        schema: aircraftArgs,
        permission: { module: Module.AIRCRAFT, action: Action.VIEW },
        async run(_user, { query, category, minPassengers, status }) {
          const page = await aircraft.findAll(queryAircraftSchema.parse({ search: query, category, minPassengers, status, limit: 10 }));
          return {
            total: page.meta.total,
            aircraft: page.items.map((item) => {
              const row = aircraftRow.parse(item);
              return {
                tailNumber: row.tailNumber, model: row.model, category: row.category, status: row.status,
                maxPassengers: row.maxPassengers, operator: row.operator?.name ?? null, homeBase: row.homeBase?.icao ?? null,
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_invoices',
        description: 'List up to ten live invoices with client, trip reference, state, total, paid, balance and due date. Open means still owed by the client: DUE, PARTIALLY_PAID or OVERDUE. Default to open if neither state nor open is given. If open is true and a state is given, both must hold. False disables the open filter. Optional search of 2–100 characters.',
        schema: listInvoicesArgs,
        permission: { module: Module.RECEIVABLES, action: Action.VIEW },
        async run(user, { state, open, search }) {
          const page = await receivables.findAll(user, queryInvoicesSchema.parse({ state, open: openFilter(open, state), search, limit: 10 }));
          return {
            total: page.meta.total,
            invoices: page.items.map((item) => {
              const row = invoiceListRow.parse(item);
              return {
                number: row.number, client: displayName(row.client), tripReference: tripLabel(row.trip.reference),
                state: row.state, ...formatAmounts({ total: row.total, paid: row.paid, balance: row.balance }),
                dueDate: isoDay(row.dueDate),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'list_operator_bills',
        description: 'List up to ten live operator bills with operator, trip reference, state, amount, paid, balance and due date. Open means still owed to the operator: DUE, PARTIALLY_PAID or OVERDUE. Default to open if neither state nor open is given. If open is true and a state is given, both must hold. False disables the open filter. Optional search of 2–100 characters.',
        schema: listOperatorBillsArgs,
        permission: { module: Module.OPERATOR_PAYMENTS, action: Action.VIEW },
        async run(user, { state, open, search }) {
          const page = await operatorPayments.findAll(user, queryPayablesSchema.parse({ state, open: openFilter(open, state), search, limit: 10 }));
          return {
            total: page.meta.total,
            bills: page.items.map((item) => {
              const row = operatorBillRow.parse(item);
              return {
                number: row.number, operator: row.operator.name, tripReference: tripLabel(row.trip.reference),
                state: row.state, ...formatAmounts({ amount: row.amount, paid: row.paid, balance: row.balance }),
                dueDate: isoDay(row.dueDate),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'client_credit',
        description: 'Read one client’s credit balance, total credited, total applied, entry count and last movement day. Get the client id from find_client first. A Client not found error means there is no client you can see with that id.',
        schema: clientCreditSummarySchema,
        permission: { module: Module.CLIENTS, action: Action.VIEW },
        async run(user, { clientId }) {
          const row = creditSummaryRow.parse(await clientCredits.summary(user, clientId));
          return {
            ...formatAmounts({ balance: row.balance, credited: row.credited, applied: row.applied }),
            entries: row.entries, lastMovementAt: isoDay(row.lastMovementAt),
          };
        },
      }),
      defineTool({
        name: 'list_commissions',
        description: 'List up to ten live commissions with the recipient name or company, recipient type, trip reference, status, amount and payment day. Default to EARNED commissions, which are owed and unpaid. Optional search of 2–100 characters.',
        schema: commissionsArgs,
        permission: { module: Module.COMMISSIONS, action: Action.VIEW },
        async run(user, { status, search }) {
          const page = await commissions.findAll(user, queryCommissionsSchema.parse({ status, search, limit: 10 }));
          return {
            total: page.meta.total,
            commissions: page.items.map((item) => {
              const row = commissionRow.parse(item);
              return {
                recipient: row.recipientLabel, recipientType: row.recipientType, tripReference: tripLabel(row.trip.reference),
                status: row.status, ...formatAmounts({ amount: row.value }), paidAt: isoDay(row.paidAt),
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'recent_transactions',
        description: 'List up to ten money movements, newest payment day first, with kind, direction, amount, counterparty and ledger references. Dates are inclusive YYYY-MM-DD, at most 31 days apart. The default is seven days ending today in your time zone. Give one date to start or end a seven-day window. Optionally filter by kind or direction.',
        schema: transactionsArgs,
        permission: { module: Module.TRANSACTIONS, action: Action.VIEW },
        async run(user, { from, to, direction, kind }, { timeZone }) {
          const page = await transactions.findAll(user, queryTransactionsSchema.parse({
            ...transactionWindow(from, to, timeZone), direction, kind, sortBy: 'date', sortOrder: 'desc', limit: 10,
          }));
          return {
            total: page.meta.total,
            transactions: page.items.map((item) => {
              const row = transactionRow.parse(item);
              return {
                date: isoDay(row.date), kind: row.kind, direction: row.direction, ...formatAmounts({ amount: row.amount }),
                counterparty: row.counterparty.name, reference: row.reference,
                document: { number: row.document.number }, trip: row.trip && { reference: tripLabel(row.trip.reference) },
              };
            }),
          };
        },
      }),
      defineTool({
        name: 'financial_summary',
        description: 'Read one financial summary for from and to, inclusive YYYY-MM-DD dates at most 366 days apart. Work out relative periods from the Now line. Revenue, profit, margin, FET charged, trip count and averages count by trip departure day. Cash and FET collected count by payment day in the window. Outstanding receivables and payables are as of today.',
        schema: financialSummaryArgs,
        permission: { module: Module.REPORTS, action: Action.VIEW },
        async run(user, args) {
          const row = financialSummaryRow.parse(await reports.summary(user, reportWindowSchema.parse(args)));
          return {
            from: row.from, to: row.to, tripCount: row.tripCount,
            ...formatAmounts({
              revenue: row.revenue, profit: row.profit, fetCharged: row.fetCharged,
              averageRevenue: row.averageRevenue, averageProfit: row.averageProfit,
            }),
            ...(row.marginPercentage === undefined ? {} : { marginPercentage: row.marginPercentage === null ? null : `${row.marginPercentage}%` }),
            collected: formatAmounts({ cash: row.collected.cash, fet: row.collected.fet }),
            outstanding: formatAmounts({ receivables: row.outstanding.receivables, payables: row.outstanding.payables }),
          };
        },
      }),
      defineTool({
        name: 'send_itinerary',
        description: 'Send the itinerary PDF to the Super Admin’s WhatsApp. Give a trip reference such as TJ-1048. Say in one short line what was attached and never repeat the document’s contents.',
        schema: tripLookupArgs,
        permission: { module: Module.ITINERARIES, action: Action.VIEW },
        async run(user, { trip: reference }, context) {
          if (!canDo(user.access, Module.TRIPS, Action.VIEW)) return { error: NOT_PERMITTED };
          const trip = await resolveTrip(user, reference);
          return attachDocument(context, `itinerary:${trip.id}`, async () => {
            const file = await itineraries.renderPdfForTrip(user, trip.id);
            if (!file) throw new BadRequestException(`No itinerary on file for ${tripLabel(trip.reference)}`);
            return file;
          });
        },
      }),
      defineTool({
        name: 'send_quote',
        description: 'Send the quote PDF to the Super Admin’s WhatsApp. Give a quote reference such as Q-1042. Say in one short line what was attached and never repeat the document’s contents.',
        schema: quoteArgs,
        permission: { module: Module.QUOTES, action: Action.VIEW },
        async run(user, { quote: reference }, context) {
          const quote = await resolveQuote(user, reference);
          return attachDocument(context, `quote:${quote.id}`, () => quotes.renderPdf(user, quote.id));
        },
      }),
      defineTool({
        name: 'send_invoice',
        description: 'Send the invoice PDF to the Super Admin’s WhatsApp. Give the full invoice number such as INV-2026-0042. Say in one short line what was attached and never repeat the document’s contents.',
        schema: invoiceArgs,
        permission: { module: Module.RECEIVABLES, action: Action.VIEW },
        async run(user, { invoice }, context) {
          const row = await resolveInvoice(user, invoice);
          return attachDocument(context, `invoice:${row.id}`, () => receivables.renderPdf(user, row.id));
        },
      }),
      defineTool({
        name: 'approve_trip',
        description: 'Only proposes approving one trip. Use its reference, such as TJ-1048. Nothing changes until the Super Admin replies CONFIRM.',
        schema: tripArgs,
        permission: ACTION_ACCESS.TRIP_APPROVE,
        proposal: true,
        async run(user, { reference }, context) {
          const trip = await resolveTrip(user, reference);
          const problem = approveBlockedBy(trip.approvalStatus);
          if (problem) return { error: problem };
          const summary = `Approve trip ${tripLabel(reference)} — ${tripDetails(trip)}.`;
          return propose(user, context, summary, { kind: 'TRIP_APPROVE', tripId: trip.id });
        },
      }),
      defineTool({
        name: 'decline_trip',
        description: 'Only proposes declining one pending trip with an optional reason. Nothing changes until the Super Admin replies CONFIRM.',
        schema: declineArgs,
        permission: ACTION_ACCESS.TRIP_DECLINE,
        proposal: true,
        async run(user, { reference, reason }, context) {
          const trip = await resolveTrip(user, reference);
          const problem = rejectBlockedBy(trip.approvalStatus);
          if (problem) return { error: problem };
          const summary = `Decline trip ${tripLabel(reference)} — ${tripDetails(trip)}. Reason: ${reason || 'no reason given'}.`;
          return propose(user, context, summary, { kind: 'TRIP_DECLINE', tripId: trip.id, payload: { reason } });
        },
      }),
      defineTool({
        name: 'create_lead',
        description: 'Only proposes a lead with first and last names and an email or phone, optionally with a trip request. For a matching client email only proposes a trip request. Use ICAO airport codes and a YYYY-MM-DD departure date. Nothing changes until the Super Admin replies CONFIRM.',
        schema: leadArgs,
        permission: (user) => canCreate(user, Module.CLIENTS) || canCreate(user, Module.TRIP_REQUESTS),
        proposal: true,
        async run(user, { originIcao, destinationIcao, departureDate, passengers, ...contact }, context) {
          const client = createClientSchema.parse(contact);
          const { email } = client;
          const [matched, duplicate] = email ? await exactMatches(
            (page) => clients.findAll(user, queryClientsSchema.parse({ search: email, page, limit: MAX_PAGE_SIZE })),
            matchedClientRow, (row) => row.email?.toLowerCase() === email,
          ) : [];
          if (duplicate) return { error: 'More than one live client matches that email.' };
          const hasTrip = Boolean(originIcao || destinationIcao || departureDate || passengers !== undefined);
          if ((!matched && !canCreate(user, Module.CLIENTS)) ||
              ((hasTrip || matched) && !canCreate(user, Module.TRIP_REQUESTS))) return { error: NOT_PERMITTED };
          if (matched && !hasTrip) return { error: 'That email belongs to an existing client. Give a trip detail to file a request.' };
          const origin = originIcao ? await resolveAirport(originIcao, 'origin') : undefined;
          const destination = destinationIcao ? await resolveAirport(destinationIcao, 'destination') : undefined;
          const request = hasTrip ? {
            originAirportId: origin?.id, destinationAirportId: destination?.id, departureDate, passengers,
            ...(matched ? { internalNotes: client.notes } : {}),
          } : undefined;
          const validated = request && parseLeadRequest(request, matched?.id);
          const route = `${origin?.icao ?? '—'} → ${destination?.icao ?? '—'}`;
          const trip = `${route}${validated?.departureDate ? ` on ${briefDay(validated.departureDate)}` : ''}${validated?.passengers === undefined ? '' : ` for ${validated.passengers}`}`;
          const notes = matched ? validated?.internalNotes : client.notes;
          if (matched && request) {
            const summary = `File a trip request for existing client ${displayName(matched)} (${email ?? '—'}), ${trip}.${notes ? ` Notes: ${notes}` : ''}`;
            return propose(user, context, summary, {
              kind: 'LEAD_CREATE', lead: { type: 'existing', clientId: matched.id, request: { ...request, internalNotes: notes } },
            });
          }
          const contacts = [client.email, client.phone].filter(Boolean).join(' / ');
          const company = client.companyName ? `, company ${client.companyName}` : '';
          const summary = `Create lead ${displayName({ ...client, companyName: client.companyName ?? null })} (${contacts})${company}${request ? `, with a trip request ${trip}` : ''}.${notes ? ` Notes: ${notes}` : ''}`;
          return propose(user, context, summary, {
            kind: 'LEAD_CREATE', lead: { type: 'new', client: leadClientPayload.parse(client), request },
          });
        },
      }),
      defineTool({
        name: 'complete_task',
        description: 'Only proposes completing one task. Use its UUID from list_open_tasks. Nothing changes until the Super Admin replies CONFIRM.',
        schema: taskArgs,
        permission: ACTION_ACCESS.TASK_COMPLETE,
        proposal: true,
        async run(user, { taskId }, context) {
          const task = taskRow.extend({ deletedAt: z.date().nullable() }).parse(await tasks.findOne(user, taskId));
          if (task.deletedAt) return { error: 'That task has been archived.' };
          if (task.status === TaskStatus.COMPLETED) return { error: 'That task is already completed.' };
          const due = task.dueDate ? `, due ${briefDay(task.dueDate)}` : '';
          const client = task.client ? `, for ${displayName(task.client)}` : '';
          return propose(user, context, `Complete task "${task.title}"${due}${client}.`, { kind: 'TASK_COMPLETE', taskId: task.id });
        },
      }),
      defineTool({
        name: 'record_payment',
        description: 'Only proposes recording a payment. Use the full invoice number, amount, and the supplied method. Include the YYYY-MM-DD payment date or payment reference when given. Nothing changes until the Super Admin replies CONFIRM.',
        schema: paymentArgs,
        permission: ACTION_ACCESS.PAYMENT_RECORD,
        proposal: true,
        async run(user, { invoice, ...payment }, context) {
          // "Today" is the asker's day, not UTC's: at 21:00 in New York the
          // UTC date is already tomorrow. Frozen here and shown in the summary.
          const payload = { ...payment, paidAt: payment.paidAt ?? nowIn(context.timeZone).date };
          const parsed = createPaymentSchema.safeParse(payload);
          if (!parsed.success) return { error: parsed.error.message };
          const row = await resolveInvoice(user, invoice);
          if (row.status !== InvoiceStatus.SENT) return { error: 'Only sent invoices can take payments.' };
          const amount = toCents(parsed.data.amount);
          const problem = paymentProblem(toCents(row.total), toCents(row.paid), amount);
          if (problem) return { error: problem };
          const balance = formatDollars(toCents(row.balance) - amount);
          const dated = ` Payment date: ${briefDay(calendarDate.parse(payload.paidAt))}.`;
          const reference = payload.reference ? ` Reference: ${payload.reference}.` : '';
          const summary = `Record ${formatDollars(amount)} by ${paymentLabels[payload.method]} on ${row.number} — ${displayName(row.client)}; balance after ${balance}.${dated}${reference}`;
          return propose(user, context, summary, { kind: 'PAYMENT_RECORD', invoiceId: row.id, payload });
        },
      }),
      defineTool({
        name: 'create_task',
        description: 'Propose creating a task. Optional due date (YYYY-MM-DD), priority, staff assignee by name or "me", client id from find_client, trip reference and description. Omit the assignee to leave it unassigned. Nothing changes until CONFIRM.',
        schema: createTaskArgs,
        permission: ACTION_ACCESS.TASK_CREATE,
        proposal: true,
        async run(user, { assignee: name, trip: reference, ...input }, context) {
          const assignee = name ? await resolveStaff(user, name) : undefined;
          if (!canAssignTask(user, assignee?.id)) return { error: NOT_PERMITTED };
          const trip = reference === undefined ? undefined : await resolveTrip(user, reference);
          const client = input.clientId ? await resolveLiveSubject(user, input.clientId) : undefined;
          const payload = taskCreatePayload.parse({
            ...input, ...(assignee && { assigneeId: assignee.id }), ...(trip && { tripId: trip.id }),
          });
          const due = payload.dueDate ? `, due ${briefDay(payload.dueDate)}` : '';
          const links = [trip && tripLabel(trip.reference), client?.label].filter(Boolean).join(' and ');
          const summary = `Create task "${payload.title}"${assignee ? `, assigned to ${assignee.name}` : ', unassigned'}${due}${links ? `, linked to ${links}` : ''}`;
          return proposeLine(user, context, summary, { kind: 'TASK_CREATE', payload });
        },
      }),
      defineTool({
        name: 'client_follow_up',
        description: 'Propose scheduling a client follow-up. Use a client id from find_client, a YYYY-MM-DD date and optionally a local 24-hour HH:MM time (default 09:00), method and note. This replaces an existing follow-up. Nothing changes until CONFIRM.',
        schema: followUpArgs,
        permission: ACTION_ACCESS.CLIENT_FOLLOW_UP,
        proposal: true,
        async run(user, { clientId, date, time, method, note }, context) {
          const client = await resolveLiveClient(user, clientId);
          const { timeZone } = context;
          const moment = momentIn(date, time, timeZone);
          if (!moment) return { error: `${date} at ${time} is skipped in ${timeZone}` };
          const payload = clientFollowUpPayload.parse({
            nextFollowUpAt: moment,
            ...(method !== undefined && { followUpMethod: method }),
            ...(note !== undefined && { followUpNote: note }),
          });
          const previous = formatMomentIn(client.nextFollowUpAt, timeZone);
          const summary = `Follow up with ${displayName(client)} on ${briefDay(calendarDate.parse(date))}, ${time} (${timeZone})${method ? ` by ${followUpLabels[method]}` : ''}${previous ? ` (replaces ${previous} in ${timeZone})` : ''}`;
          return proposeLine(user, context, summary, { kind: 'CLIENT_FOLLOW_UP', clientId: client.id, payload });
        },
      }),
      defineTool({
        name: 'add_client_note',
        description: 'Propose an internal note for a client. Use the client id from find_client and the note body. The note is visible only to staff. Nothing changes until CONFIRM.',
        schema: addNoteArgs,
        permission: ACTION_ACCESS.NOTE_CREATE,
        proposal: true,
        async run(user, { clientId, body }, context) {
          const client = await resolveLiveSubject(user, clientId);
          const payload = noteCreatePayload.parse({
            subjectType: NoteSubjectType.CLIENT, subjectId: client.id, visibility: NoteVisibility.INTERNAL, body,
          });
          const excerpt = Array.from(payload.body).slice(0, 80).join('');
          return proposeLine(user, context, `Add an internal note for ${client.label}: "${excerpt}"`, { kind: 'NOTE_CREATE', payload });
        },
      }),
      defineTool({
        name: 'change_trip_status',
        description: 'Propose changing a trip status by trip reference, with an optional note. Nothing changes until CONFIRM.',
        schema: tripStatusArgs,
        permission: ACTION_ACCESS.TRIP_STATUS,
        proposal: true,
        async run(user, { trip: reference, ...input }, context) {
          const trip = await resolveTrip(user, reference);
          const payload = tripStatusPayload.parse(input);
          const cancellation = payload.status === TripStatus.CANCELLED ? ' — this cancels the trip' : '';
          const summary = `Move ${tripLabel(trip.reference)} from ${trip.status} to ${payload.status}${cancellation}`;
          return proposeLine(user, context, summary, { kind: 'TRIP_STATUS', tripId: trip.id, payload });
        },
      }),
      defineTool({
        name: 'reassign',
        description: 'Propose reassigning a TRIP or CLIENT to a broker by name. For TRIP give its trip reference. For CLIENT give the client id from find_client. Nothing changes until CONFIRM.',
        schema: reassignArgs,
        permission: (user) => canReassign(user, 'TRIP_ASSIGN') || canReassign(user, 'CLIENT_ASSIGN'),
        proposal: true,
        async run(user, args, context) {
          const kind = args.record === 'TRIP' ? 'TRIP_ASSIGN' : 'CLIENT_ASSIGN';
          if (!canReassign(user, kind)) return { error: NOT_PERMITTED };
          const record = args.record === 'TRIP' ? await resolveTrip(user, args.trip!) : await resolveLiveClient(user, args.clientId!);
          const broker = await resolveStaff(user, args.broker, true);
          if (record.assignedBrokerId === broker.id) return { error: `${broker.name} is already assigned to that record` };
          const previous = record.assignedBroker ? nameOf(record.assignedBroker) : null;
          const label = 'reference' in record ? tripLabel(record.reference) : displayName(record);
          const summary = `Reassign ${label} from ${previous ?? 'unassigned'} to ${broker.name}`;
          if (kind === 'TRIP_ASSIGN') {
            const payload = tripAssignPayload.parse(updateTripSchema.parse({ assignedBrokerId: broker.id }));
            const notification = broker.id === user.id ? '' : ` — ${broker.name} gets a task and an email about it`;
            return proposeLine(user, context, summary + notification, { kind, tripId: record.id, payload });
          }
          const payload = clientAssignPayload.parse(updateClientSchema.parse({ assignedBrokerId: broker.id }));
          return proposeLine(user, context, summary, { kind, clientId: record.id, payload });
        },
      }),
      defineTool({
        name: 'mark_quote_sent',
        description: 'Propose marking a quote as sent by its reference, with an optional YYYY-MM-DD validity date and note. This records it as sent; no email is sent. Nothing changes until CONFIRM.',
        schema: markQuoteSentArgs,
        permission: ACTION_ACCESS.QUOTE_SEND,
        proposal: true,
        async run(user, { quote: reference, ...input }, context) {
          const quote = await resolveQuote(user, reference);
          const payload = quoteSendPayload.parse(input);
          const validity = payload.validUntil ? `, valid until ${briefDay(payload.validUntil)}` : '';
          const summary = `Mark quote Q-${quote.reference} as sent${validity} — records it as sent; no email is sent`;
          return proposeLine(user, context, summary, { kind: 'QUOTE_SEND', quoteId: quote.id, payload });
        },
      }),
    ];
  }

  specs(allowProposals = true): AiToolSpec[] {
    return this.definitions.filter((tool) => allowProposals || !tool.proposal).map(({ name, description, schema }) => ({
      name, description, parameters: z.toJSONSchema(schema, { io: 'input' }),
    }));
  }

  async dispatch(user: AuthenticatedUser, name: string, argumentsJson: string, context: ToolContext): Promise<unknown> {
    const tool = this.definitions.find((definition) => definition.name === name);
    if (!tool) return { error: 'Unknown tool' };
    if (tool.proposal && !context.phone) return { error: NOT_PERMITTED };
    if (tool.proposal && context.proposed) return { error: ONE_ACTION_REPLY };
    let raw: unknown;
    try {
      raw = JSON.parse(argumentsJson);
    } catch {
      return { error: 'Arguments must be valid JSON' };
    }
    try {
      return await tool.dispatch(user, raw, context);
    } catch (error: unknown) {
      if (error instanceof HttpException) return { error: error.message };
      // Even error messages can echo SQL or client data. Record the class
      // only, never the arguments, service row, or provider response.
      this.logger.error(`CRM tool failed (${error instanceof Error ? error.name : 'UnknownError'})`);
      return { error: 'The CRM could not answer that' };
    }
  }
}
