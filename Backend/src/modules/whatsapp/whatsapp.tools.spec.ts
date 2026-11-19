import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, NotFoundException } from '@nestjs/common';
import { Action, Module, Reach, resolveAccess } from '../../common/authorization/access.js';
import { DEFAULT_TIME_ZONE } from '../../common/dates/time-zone.js';
import { paginate, type AuthenticatedUser } from '../../common/types/api.types.js';
import { InvoiceStatus, PaymentMethod, TaskStatus, TripApprovalStatus, UserRole } from '../../generated/prisma/enums.js';
import { ONE_ACTION_REPLY, WhatsappTools, type ToolContext } from './whatsapp.tools.js';

const PHONE = '15551234567';
const TRIP_ID = '00000000-0000-4000-8000-000000000001';
const TASK_ID = '00000000-0000-4000-8000-000000000002';
const CLIENT_ID = '00000000-0000-4000-8000-000000000003';
const INVOICE_ID = '00000000-0000-4000-8000-000000000004';
const ORIGIN_ID = '00000000-0000-4000-8000-000000000005';
const DESTINATION_ID = '00000000-0000-4000-8000-000000000006';
const QUOTE_ID = '00000000-0000-4000-8000-000000000007';
const OTHER_QUOTE_ID = '00000000-0000-4000-8000-000000000008';
const user: AuthenticatedUser = {
  id: 'owner-id', email: 'owner@example.com', role: UserRole.SUPER_ADMIN,
  access: resolveAccess(UserRole.SUPER_ADMIN, null),
};
const windowArgs = { from: '2026-11-17', to: '2026-11-18' };
const client = {
  id: 'client-id', firstName: 'Alex', lastName: 'Vance', companyName: 'Vance Ltd',
  email: 'alex@example.com', phone: '+15550000000', status: 'LEAD', leadStage: 'NEW',
  assignedBroker: { firstName: 'Sam', lastName: 'Broker', email: 'sam@example.com' },
  homeAirport: { icao: 'KTEB', name: 'Teterboro' }, nextFollowUpAt: new Date('2026-11-18T10:00:00Z'),
  notes: 'PRIVATE NOTE', preferences: { catering: 'PRIVATE PREFERENCE' }, birthday: new Date('1980-01-01'),
};
const flight = {
  departureDate: new Date('2026-11-17T00:00:00Z'), departureTime: '10:30',
  originAirport: { icao: 'KTEB' }, destinationAirport: { icao: 'KMIA' },
  trip: {
    reference: 1048, status: 'CONFIRMED', client,
    aircraft: { tailNumber: 'N123AB', model: 'Test model', category: 'HEAVY_JET' }, aircraftDescription: null,
    clientPayment: { amount: 99999 }, fetRate: 0.075,
  },
};
const summary = {
  period: 'WEEK', from: '2026-11-16', to: '2026-11-23', previousFrom: '2026-11-09', previousTo: '2026-11-16',
  trips: { upcoming: 3, departing: { current: 2, previous: 1, change: 100 } },
  requests: { active: 4, awaitingSourcing: 2, pipelineValue: 12345.67 },
  money: {
    revenue: { current: 1000.01, previous: 800.02, change: 25, pricedCount: 2 },
    fet: { current: 75, previous: 0, change: null },
    profit: { current: 123.45, previous: 0, change: null, marginPercentage: null, tripCount: 1 },
  },
  receivables: { outstanding: 101.23, overdue: 45.67, overdueCount: 2, openCount: 3 },
  operatorPayments: { outstanding: 202.34, overdue: 56.78, overdueCount: 1, dueThisWeek: 2, dueThisWeekAmount: 305.99 },
  emptyLegs: { available: 3, matched: 2, openValue: 456.78 },
};
const trip = {
  id: TRIP_ID, reference: 1048, approvalStatus: TripApprovalStatus.PENDING,
  client, assignedBroker: client.assignedBroker, private: 'PRIVATE TRIP DETAIL',
  legs: [{ originAirport: { icao: 'KTEB' }, destinationAirport: { icao: 'KMIA' }, departureDate: new Date('2026-11-27') }],
};
const task = {
  id: TASK_ID, title: 'Call the broker', status: TaskStatus.TODO, priority: 'HIGH',
  assignee: client.assignedBroker, client, dueDate: new Date('2026-11-27'), deletedAt: null, notes: 'PRIVATE TASK NOTE',
};
const invoice = {
  id: INVOICE_ID, number: 'INV-2026-0042', status: InvoiceStatus.SENT,
  client, total: 13000, paid: 500, balance: 12500,
};
const quote = { id: QUOTE_ID, reference: 1042 };
const pdf = (filename: string) => ({ body: Buffer.from('%PDF PRIVATE BYTES'), contentType: 'application/pdf', filename });
const itineraryPdf = pdf('Itinerary-TJ-1048.pdf');
const quotePdf = pdf('Quote-Q-1042.pdf');
const invoicePdf = pdf('Invoice-INV-2026-0042.pdf');
const documentCases = [
  ['send_itinerary', { trip: 'TJ-1048' }, Module.ITINERARIES, trip, itineraryPdf],
  ['send_quote', { quote: 'Q-1042' }, Module.QUOTES, quote, quotePdf],
  ['send_invoice', { invoice: invoice.number }, Module.RECEIVABLES, invoice, invoicePdf],
] as const;
const leadArgs = { firstName: 'Jamie', lastName: 'Client', email: 'jamie@example.com' };
const paymentArgs = { invoice: invoice.number, amount: 12500, method: PaymentMethod.WIRE_TRANSFER, paidAt: '2026-11-27' };

describe('WhatsappTools dispatcher', () => {
  let schedule: { findAll: ReturnType<typeof vi.fn> };
  let dashboard: { summary: ReturnType<typeof vi.fn> };
  let clients: { findAll: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  let auth: { updateProfile: ReturnType<typeof vi.fn> };
  const trips = { findAll: vi.fn(), approve: vi.fn(), reject: vi.fn() };
  const tasks = { findAll: vi.fn(), findOne: vi.fn(), update: vi.fn() };
  const airports = { findAll: vi.fn(), usable: vi.fn() };
  const receivables = { findAll: vi.fn(), recordPayment: vi.fn(), renderPdf: vi.fn() };
  const itineraries = { renderPdfForTrip: vi.fn() };
  const quotes = { findAll: vi.fn(), renderPdf: vi.fn() };
  const lookup = { send_itinerary: trips.findAll, send_quote: quotes.findAll, send_invoice: receivables.findAll };
  const render = { send_itinerary: itineraries.renderPdfForTrip, send_quote: quotes.renderPdf, send_invoice: receivables.renderPdf };
  const pending = { put: vi.fn() };
  let context: ToolContext;
  let tools: WhatsappTools;
  const companyTimeZone = vi.fn(async () => DEFAULT_TIME_ZONE);

  beforeEach(() => {
    schedule = { findAll: vi.fn().mockResolvedValue(paginate([flight], 1, 1, 25)) };
    dashboard = { summary: vi.fn().mockResolvedValue(structuredClone(summary)) };
    clients = { findAll: vi.fn().mockResolvedValue(paginate([client], 1, 1, 5)), create: vi.fn() };
    auth = { updateProfile: vi.fn().mockResolvedValue(undefined) };
    vi.clearAllMocks();
    trips.findAll.mockReset().mockResolvedValue(paginate([trip], 1, 1, 100));
    tasks.findAll.mockReset().mockResolvedValue(paginate([task], 1, 1, 10));
    tasks.findOne.mockReset().mockResolvedValue(task);
    airports.findAll.mockReset().mockImplementation(async ({ search }: { search: string }) => {
      const rows = [{ id: ORIGIN_ID, icao: 'KTEB' }, { id: DESTINATION_ID, icao: 'KMIA' }].filter((row) => row.icao === search);
      return paginate(rows, rows.length, 1, 100);
    });
    airports.usable.mockReset().mockImplementation(async (id: string) => ({ id, icao: id === ORIGIN_ID ? 'KTEB' : 'KMIA' }));
    receivables.findAll.mockReset().mockResolvedValue(paginate([invoice], 1, 1, 100));
    receivables.renderPdf.mockReset().mockResolvedValue(invoicePdf);
    itineraries.renderPdfForTrip.mockReset().mockResolvedValue(itineraryPdf);
    quotes.findAll.mockReset().mockResolvedValue(paginate([quote], 1, 1, 100));
    quotes.renderPdf.mockReset().mockResolvedValue(quotePdf);
    companyTimeZone.mockClear();
    context = { timeZone: 'Asia/Dhaka', companyTimeZone, phone: PHONE, documents: [] };
    tools = new WhatsappTools(schedule as never, dashboard as never, clients as never, auth as never,
      trips as never, tasks as never, airports as never, receivables as never, pending as never, itineraries as never, quotes as never);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function dispatch(actingUser: AuthenticatedUser, name: string, args: string) {
    return tools.dispatch(actingUser, name, args, context);
  }

  function expectNoServiceCalls() {
    expect(schedule.findAll).not.toHaveBeenCalled();
    expect(dashboard.summary).not.toHaveBeenCalled();
    expect(clients.findAll).not.toHaveBeenCalled();
    expect(auth.updateProfile).not.toHaveBeenCalled();
    expect(trips.findAll).not.toHaveBeenCalled();
    expect(tasks.findAll).not.toHaveBeenCalled();
    expect(tasks.findOne).not.toHaveBeenCalled();
    expect(airports.findAll).not.toHaveBeenCalled();
    expect(receivables.findAll).not.toHaveBeenCalled();
    expect(quotes.findAll).not.toHaveBeenCalled();
    for (const pdfRender of Object.values(render)) expect(pdfRender).not.toHaveBeenCalled();
    expect(pending.put).not.toHaveBeenCalled();
  }

  it('returns an error for an unknown tool without calling any service', async () => {
    expect(await dispatch(user, 'archive_trip', '{}')).toEqual({ error: 'Unknown tool' });
    expectNoServiceCalls();
  });

  it('refuses malformed JSON without calling any service', async () => {
    expect(await dispatch(user, 'find_client', '{')).toEqual({ error: 'Arguments must be valid JSON' });
    expectNoServiceCalls();
  });

  it.each([
    ['list_flights', { from: 'tomorrow', to: '2026-11-18' }, 'YYYY-MM-DD'],
    ['list_flights', { from: '2026-11-01', to: '2026-11-30' }, 'at most 14 days'],
    ['list_flights', { from: '2026-11-18', to: '2026-11-17' }, 'on or before'],
    ['list_flights', { from: '2026-02-30', to: '2026-03-01' }, 'YYYY-MM-DD'],
    ['find_client', { query: 'A' }, '2 characters'],
    ['find_client', { query: 'A'.repeat(101) }, '100 characters'],
    ['dashboard_kpis', { period: 'LAST_WEEK' }, 'Invalid option'],
  ])('names validation problems for %s %j', async (name, args, problem) => {
    expect(await dispatch(user, name, JSON.stringify(args))).toEqual({ error: expect.stringContaining(problem) });
    expectNoServiceCalls();
  });

  it.each([
    ['list_flights', Module.SCHEDULE, windowArgs],
    ['dashboard_kpis', Module.DASHBOARD, {}],
    ['find_client', Module.CLIENTS, { query: 'Alex' }],
  ] as const)('refuses %s without its required VIEW action, even for a Super Admin identity', async (name, module, args) => {
    const withoutView = { ...user, access: { [module]: { reach: Reach.ALL, actions: [Action.EDIT] } } };
    expect(await dispatch(withoutView, name, JSON.stringify(args))).toEqual({ error: 'Not permitted for this account' });
    expectNoServiceCalls();
  });

  it('requires a module permission for every tool except set_my_timezone', async () => {
    const args = {
      list_flights: windowArgs, dashboard_kpis: {}, find_client: { query: 'Alex' },
      list_pending_approvals: {}, list_open_tasks: {},
      send_itinerary: { trip: 'TJ-1048' }, send_quote: { quote: 'Q-1042' }, send_invoice: { invoice: invoice.number },
      approve_trip: { reference: 'TJ-1048' }, decline_trip: { reference: '1048' },
      create_lead: leadArgs, complete_task: { taskId: TASK_ID }, record_payment: paymentArgs,
    };
    for (const { name } of tools.specs().filter((spec) => spec.name !== 'set_my_timezone')) {
      const validArgs = args[name as keyof typeof args];
      expect(validArgs).toBeDefined();
      expect(await dispatch({ ...user, access: {} }, name, JSON.stringify(validArgs))).toEqual({
        error: 'Not permitted for this account',
      });
    }
    expectNoServiceCalls();
  });

  it('turns a Nest exception into a tool error with its message', async () => {
    clients.findAll.mockRejectedValue(new NotFoundException('Client not found'));
    expect(await dispatch(user, 'find_client', '{"query":"Alex"}')).toEqual({ error: 'Client not found' });
  });

  it('returns a generic error and logs no arguments or service error text', async () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    clients.findAll.mockRejectedValue(new Error('Alex PRIVATE SQL DETAILS'));
    expect(await dispatch(user, 'find_client', '{"query":"Alex"}')).toEqual({ error: 'The CRM could not answer that' });
    expect(log).toHaveBeenCalledExactlyOnceWith('CRM tool failed (Error)');
    expect(JSON.stringify(log.mock.calls)).not.toContain('Alex');
    expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE SQL DETAILS');
  });

  it('uses the acting user and explicit page/limit/dates/status, returning only compact flight facts', async () => {
    const result = await dispatch(user, 'list_flights', JSON.stringify({ ...windowArgs, status: 'CONFIRMED' }));
    expect(schedule.findAll).toHaveBeenCalledExactlyOnceWith(user, {
      from: new Date('2026-11-17T00:00:00Z'), to: new Date('2026-11-18T00:00:00Z'), status: 'CONFIRMED', page: 1, limit: 25,
    });
    expect(schedule.findAll.mock.calls[0]?.[0]).toBe(user);
    expect(result).toEqual({ total: 1, flights: [{
      reference: 'TJ-1048', departureDate: '2026-11-17', departureTime: '10:30', origin: 'KTEB', destination: 'KMIA',
      aircraft: { tail: 'N123AB', model: 'Test model' }, aircraftDescription: null, client: 'Alex Vance', status: 'CONFIRMED',
    }] });
  });

  it('accepts exactly 14 inclusive days and does not invent missing flight details', async () => {
    schedule.findAll.mockResolvedValue(paginate([{ ...flight, departureTime: null, trip: { ...flight.trip, aircraft: null, aircraftDescription: 'Desk description' } }], 30, 1, 25));
    expect(await dispatch(user, 'list_flights', '{"from":"2026-11-01","to":"2026-11-14"}')).toMatchObject({
      total: 30, flights: [{ departureTime: null, aircraft: null, aircraftDescription: 'Desk description' }],
    });
    expect(await dispatch(user, 'list_flights', '{"from":"2026-11-01","to":"2026-11-15"}')).toEqual({ error: expect.stringContaining('at most 14 days') });
    expect(schedule.findAll).toHaveBeenCalledTimes(1);
  });

  it('calls client search with the acting user and exact existing DTO defaults, and allowlists every client field', async () => {
    const result = await dispatch(user, 'find_client', '{"query":"Alex"}');
    expect(clients.findAll).toHaveBeenCalledExactlyOnceWith(user, {
      search: 'Alex', page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc', archived: false,
    });
    expect(clients.findAll.mock.calls[0]?.[0]).toBe(user);
    const expectedClient = {
      id: 'client-id', displayName: 'Alex Vance', company: 'Vance Ltd', email: 'alex@example.com', phone: '+15550000000',
      status: 'LEAD', leadStage: 'NEW', assignedBroker: 'Sam Broker', homeAirport: 'KTEB',
      nextFollowUpAt: 'Wed 18 Nov 2026, 16:00', timeZone: 'Asia/Dhaka',
    };
    expect(result).toEqual({ total: 1, clients: [expectedClient] });
    const rows = (result as { clients: Record<string, unknown>[] }).clients;
    expect(Object.keys(rows[0]!)).toEqual(Object.keys(expectedClient));
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
    expect(JSON.stringify(result)).not.toContain('birthday');
  });

  it('preserves null client contacts, broker, airport and follow-up', async () => {
    clients.findAll.mockResolvedValue(paginate([{ ...client, email: null, phone: null, assignedBroker: null, homeAirport: null, nextFollowUpAt: null }], 1, 1, 5));
    expect(await dispatch(user, 'find_client', '{"query":"Alex"}')).toMatchObject({
      clients: [{ email: null, phone: null, assignedBroker: null, homeAirport: null, nextFollowUpAt: null }],
    });
  });

  it('updates only the caller’s time zone, with no module permissions required', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T18:00:00Z'));
    const timeZone = new Intl.DateTimeFormat('en-US', { timeZone: 'US/Eastern' }).resolvedOptions().timeZone;
    expect(await dispatch({ ...user, access: {} }, 'set_my_timezone', '{"timeZone":"US/Eastern"}')).toEqual({
      timeZone, usingCompanyDefault: false, now: { date: '2026-11-19', weekday: 'Thu', time: '13:00' },
    });
    expect(auth.updateProfile).toHaveBeenCalledExactlyOnceWith(user.id, { timeZone }, {
      ipAddress: null, userAgent: 'WhatsApp assistant',
    });
    expect(context.timeZone).toBe(timeZone);
    expect(companyTimeZone).not.toHaveBeenCalled();
  });

  it('clears the preference and returns the company’s clock', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T18:00:00Z'));
    expect(await dispatch(user, 'set_my_timezone', '{"timeZone":null}')).toEqual({
      timeZone: DEFAULT_TIME_ZONE,
      usingCompanyDefault: true,
      now: { date: '2026-11-19', weekday: 'Thu', time: '13:00' },
    });
    expect(auth.updateProfile).toHaveBeenCalledExactlyOnceWith(user.id, { timeZone: null }, {
      ipAddress: null, userAgent: 'WhatsApp assistant',
    });
    expect(context.timeZone).toBe(DEFAULT_TIME_ZONE);
  });

  it.each([
    ['{"timeZone":"Mars/Olympus"}', 'Use a time zone name'],
    ['{"timeZone":"+06:00"}', 'Use a time zone name'],
    ['{"timeZone":"Asia/Dhaka","userId":"another-user"}', 'Unrecognized key'],
    ['{}', 'timeZone'],
  ])('refuses %s before updating the profile', async (args, error) => {
    expect(await dispatch(user, 'set_my_timezone', args)).toEqual({ error: expect.stringContaining(error) });
    expectNoServiceCalls();
  });

  it('uses the dashboard WEEK default and passes all headline values and comparisons through, including nulls', async () => {
    const result = await dispatch(user, 'dashboard_kpis', '{}');
    expect(dashboard.summary).toHaveBeenCalledExactlyOnceWith(user, { period: 'WEEK' });
    expect(dashboard.summary.mock.calls[0]?.[0]).toBe(user);
    expect(result).toEqual({
      period: summary.period, from: summary.from, to: summary.to, previousFrom: summary.previousFrom, previousTo: summary.previousTo,
      tiles: [
        { label: 'Upcoming trips', value: 3 },
        { label: 'Departing trips', value: 2, previous: 1, change: 100 },
        { label: 'Active requests', value: 4 },
        { label: 'Awaiting sourcing', value: 2 },
        { label: 'Pipeline value', value: 12345.67 },
        { label: 'Revenue', value: 1000.01, previous: 800.02, change: 25 },
        { label: 'FET', value: 75, previous: 0, change: null },
        { label: 'Gross profit', value: 123.45, previous: 0, change: null },
        { label: 'Profit margin percentage', value: null },
        { label: 'Receivables outstanding', value: 101.23 },
        { label: 'Receivables overdue', value: 45.67 },
        { label: 'Overdue receivables count', value: 2 },
        { label: 'Open receivables count', value: 3 },
        { label: 'Operator payments outstanding', value: 202.34 },
        { label: 'Operator payments overdue', value: 56.78 },
        { label: 'Overdue operator payments count', value: 1 },
        { label: 'Operator payments due this week', value: 2 },
        { label: 'Operator payments amount due this week', value: 305.99 },
        { label: 'Available empty legs', value: 3 },
        { label: 'Matched empty legs', value: 2 },
        { label: 'Empty legs open value', value: 456.78 },
      ],
    });
  });

  it('passes an explicit dashboard period and leaves unavailable sections absent', async () => {
    dashboard.summary.mockResolvedValue({ ...summary, period: 'YEAR', money: undefined, receivables: undefined, operatorPayments: undefined, emptyLegs: undefined });
    expect(await dispatch(user, 'dashboard_kpis', '{"period":"YEAR"}')).toMatchObject({ period: 'YEAR', tiles: [
      { label: 'Upcoming trips', value: 3 }, { label: 'Departing trips', value: 2, previous: 1, change: 100 },
      { label: 'Active requests', value: 4 }, { label: 'Awaiting sourcing', value: 2 }, { label: 'Pipeline value', value: 12345.67 },
    ] });
    expect(dashboard.summary).toHaveBeenCalledExactlyOnceWith(user, { period: 'YEAR' });
  });

  it('derives usable JSON schemas from the Zod arguments', () => {
    const specs = tools.specs();
    expect(specs.map((spec) => spec.name)).toEqual([
      'list_flights', 'dashboard_kpis', 'find_client', 'set_my_timezone', 'list_pending_approvals', 'list_open_tasks',
      'send_itinerary', 'send_quote', 'send_invoice',
      'approve_trip', 'decline_trip', 'create_lead', 'complete_task', 'record_payment',
    ]);
    expect(specs[0]?.parameters).toMatchObject({ type: 'object', required: ['from', 'to'], properties: { from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' } } });
    expect(specs[1]?.parameters).toMatchObject({ properties: { period: { enum: ['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'], default: 'WEEK' } } });
    expect(specs[2]?.parameters).toMatchObject({ required: ['query'], properties: { query: { type: 'string', minLength: 2, maxLength: 100 } } });
    expect(specs[3]?.parameters).toMatchObject({
      required: ['timeZone'], additionalProperties: false,
      properties: { timeZone: { anyOf: [{ type: 'string', maxLength: 64 }, { type: 'null' }] } },
    });
    expectNoServiceCalls();
  });

  it('lists scoped pending approvals and open tasks with only their allowed fields', async () => {
    expect(await dispatch(user, 'list_pending_approvals', '{}')).toEqual({
      total: 1,
      trips: [{ reference: 'TJ-1048', client: 'Alex Vance', origin: 'KTEB', destination: 'KMIA',
        departureDate: '2026-11-27', assignedBroker: 'Sam Broker' }],
    });
    expect(trips.findAll).toHaveBeenCalledExactlyOnceWith(user, expect.objectContaining({
      approvalStatus: TripApprovalStatus.PENDING, archived: false, page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc',
    }));
    expect(await dispatch(user, 'list_open_tasks', '{"search":"broker"}')).toEqual({
      total: 1,
      tasks: [{ id: TASK_ID, title: task.title, status: TaskStatus.TODO, priority: 'HIGH',
        dueDate: '2026-11-27', assignee: 'Sam Broker', client: 'Alex Vance' }],
    });
    expect(tasks.findAll).toHaveBeenCalledExactlyOnceWith(user, expect.objectContaining({
      view: 'OPEN', search: 'broker', archived: false, page: 1, limit: 10, sortBy: 'dueDate', sortOrder: 'asc',
    }));
  });

  it.each([
    ['approve_trip', { reference: 'TJ-1048' }, { kind: 'TRIP_APPROVE', tripId: TRIP_ID },
      'Approve trip TJ-1048 — Alex Vance, KTEB → KMIA, Fri 27 Nov.'],
    ['decline_trip', { reference: '1048', reason: ' Missing contract ' },
      { kind: 'TRIP_DECLINE', tripId: TRIP_ID, payload: { reason: 'Missing contract' } },
      'Decline trip TJ-1048 — Alex Vance, KTEB → KMIA, Fri 27 Nov. Reason: Missing contract.'],
    ['complete_task', { taskId: TASK_ID }, { kind: 'TASK_COMPLETE', taskId: TASK_ID },
      'Complete task "Call the broker", due Fri 27 Nov, for Alex Vance.'],
    ['record_payment', paymentArgs, { kind: 'PAYMENT_RECORD', invoiceId: INVOICE_ID,
      payload: { amount: 12500, method: PaymentMethod.WIRE_TRANSFER, paidAt: '2026-11-27' } },
      'Record $12,500.00 by wire on INV-2026-0042 — Alex Vance; balance after $0.00. Payment date: Fri 27 Nov.'],
  ] as const)('stores a frozen %s proposal and makes no CRM write', async (name, args, action, summary) => {
    expect(await dispatch(user, name, JSON.stringify(args))).toEqual({ proposed: true, summary });
    expect(pending.put).toHaveBeenCalledExactlyOnceWith(PHONE, expect.objectContaining({
      ...action, userId: user.id, summary, createdAt: expect.any(String),
    }));
    expect(trips.approve).not.toHaveBeenCalled();
    expect(trips.reject).not.toHaveBeenCalled();
    expect(tasks.update).not.toHaveBeenCalled();
    expect(receivables.recordPayment).not.toHaveBeenCalled();
  });

  it('stores a new lead with validated airport ids and calendar date, without creating any records', async () => {
    clients.findAll.mockResolvedValue(paginate([], 0, 1, 100));
    const args = { ...leadArgs, originIcao: 'kteb', destinationIcao: 'KMIA', departureDate: '2026-11-27', passengers: 4 };
    const summary = 'Create lead Jamie Client (jamie@example.com), with a trip request KTEB → KMIA on Fri 27 Nov for 4.';
    expect(await dispatch(user, 'create_lead', JSON.stringify(args))).toEqual({ proposed: true, summary });
    expect(airports.usable).toHaveBeenNthCalledWith(1, ORIGIN_ID, 'origin');
    expect(airports.usable).toHaveBeenNthCalledWith(2, DESTINATION_ID, 'destination');
    expect(pending.put).toHaveBeenCalledExactlyOnceWith(PHONE, expect.objectContaining({
      kind: 'LEAD_CREATE', userId: user.id, summary,
      lead: { type: 'new', client: leadArgs, request: {
        originAirportId: ORIGIN_ID, destinationAirportId: DESTINATION_ID, departureDate: '2026-11-27', passengers: 4,
      } },
    }));
    expect(clients.create).not.toHaveBeenCalled();
  });

  it('proposes a request on a case-insensitive existing client match with only request CREATE', async () => {
    clients.findAll.mockResolvedValue(paginate([{ ...client, id: CLIENT_ID, email: 'ALEX@example.com' }], 1, 1, 100));
    const actingUser = { ...user, access: { [Module.TRIP_REQUESTS]: { reach: Reach.ALL, actions: [Action.CREATE] } } };
    const args = { ...leadArgs, email: client.email, originIcao: 'KTEB', notes: 'Quiet cabin' };
    expect(await dispatch(actingUser, 'create_lead', JSON.stringify(args))).toEqual({
      proposed: true, summary: 'File a trip request for existing client Alex Vance (alex@example.com), KTEB → —. Notes: Quiet cabin',
    });
    expect(pending.put).toHaveBeenCalledExactlyOnceWith(PHONE, expect.objectContaining({
      lead: { type: 'existing', clientId: CLIENT_ID, request: { originAirportId: ORIGIN_ID, internalNotes: 'Quiet cabin' } },
    }));
    expect(clients.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...leadArgs, originIcao: 'ZZZZ' }, 'Unknown origin airport ZZZZ'],
    [{ firstName: 'Jamie', lastName: 'Client' }, 'Give an email or phone number'],
    [{ firstName: 'Jamie', email: leadArgs.email }, 'lastName'],
    [{ ...leadArgs, departureDate: '2026-02-30' }, 'Invalid ISO date'],
    [{ ...leadArgs, passengers: 0 }, 'Passengers must be a whole number'],
  ])('rejects an invalid lead without storing it', async (args, problem) => {
    clients.findAll.mockResolvedValue(paginate([], 0, 1, 100));
    expect(await dispatch(user, 'create_lead', JSON.stringify(args))).toEqual({ error: expect.stringContaining(problem) });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it('asks for trip details when a matching client email was given without any', async () => {
    clients.findAll.mockResolvedValue(paginate([{ ...client, id: CLIENT_ID }], 1, 1, 100));
    expect(await dispatch(user, 'create_lead', JSON.stringify({ ...leadArgs, email: client.email }))).toEqual({
      error: 'That email belongs to an existing client. Give a trip detail to file a request.',
    });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it.each([[], [trip, trip], [{ ...trip, reference: 9999 }]])('requires exactly one exact trip match from %j', async (...rows) => {
    trips.findAll.mockResolvedValue(paginate(rows, rows.length, 1, 100));
    expect(await dispatch(user, 'approve_trip', '{"reference":"1048"}')).toEqual({ error: 'No trip TJ-1048 you can see' });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it('checks later pages of trip search results for the exact trip', async () => {
    trips.findAll.mockResolvedValueOnce(paginate([{ ...trip, reference: 9999 }], 101, 1, 100))
      .mockResolvedValueOnce(paginate([trip], 101, 2, 100));
    expect(await dispatch(user, 'approve_trip', '{"reference":"1048"}')).toMatchObject({ proposed: true });
    expect(trips.findAll).toHaveBeenNthCalledWith(2, user, expect.objectContaining({ page: 2 }));
  });

  it.each(['approve_trip', 'decline_trip'])('refuses %s on an approved trip', async (name) => {
    trips.findAll.mockResolvedValue(paginate([{ ...trip, approvalStatus: TripApprovalStatus.APPROVED }], 1, 1, 100));
    expect(await dispatch(user, name, '{"reference":"TJ-1048"}')).toEqual({ error: expect.any(String) });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it.each([
    [{ amount: 12500.01 }, InvoiceStatus.SENT, 'still owed'],
    [{ amount: 1.001 }, InvoiceStatus.SENT, 'two decimal places'],
    [{ method: 'CASH' }, InvoiceStatus.SENT, 'Invalid option'],
    [{}, InvoiceStatus.DRAFT, 'Only sent invoices'],
    [{ invoice: 'INV-2025-0042' }, InvoiceStatus.SENT, 'No invoice INV-2025-0042'],
  ])('refuses an invalid payment without storing a proposal', async (args, status, problem) => {
    receivables.findAll.mockResolvedValue(paginate([{ ...invoice, status }], 1, 1, 100));
    expect(await dispatch(user, 'record_payment', JSON.stringify({ ...paymentArgs, ...args }))).toEqual({
      error: expect.stringContaining(problem),
    });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: TaskStatus.COMPLETED }, 'already completed'],
    [{ deletedAt: new Date('2026-11-24') }, 'archived'],
  ])('refuses a completed or archived task', async (patch, problem) => {
    tasks.findOne.mockResolvedValue({ ...task, ...patch });
    expect(await dispatch(user, 'complete_task', JSON.stringify({ taskId: TASK_ID }))).toEqual({
      error: expect.stringContaining(problem),
    });
    expect(pending.put).not.toHaveBeenCalled();
  });

  it('rejects a second proposal in the same reply without resolving its record', async () => {
    expect(await dispatch(user, 'approve_trip', '{"reference":"1048"}')).toMatchObject({ proposed: true });
    expect(await dispatch(user, 'complete_task', JSON.stringify({ taskId: TASK_ID }))).toEqual({ error: ONE_ACTION_REPLY });
    expect(tasks.findOne).not.toHaveBeenCalled();
    expect(pending.put).toHaveBeenCalledTimes(1);
  });

  it('omits proposal tools and refuses a fabricated proposal call without a webhook phone', async () => {
    delete context.phone;
    expect(tools.specs(false).some(({ name }) => name === 'approve_trip')).toBe(false);
    expect(await dispatch(user, 'approve_trip', '{"reference":"1048"}')).toEqual({ error: 'Not permitted for this account' });
    expectNoServiceCalls();
  });

  it.each(documentCases)('%s renders the resolved record and returns only the attachment marker', async (name, args, _module, row, file) => {
    delete context.phone;
    expect(tools.specs(false)).toContainEqual(expect.objectContaining({ name }));
    const result = await dispatch(user, name, JSON.stringify(args));
    expect(lookup[name]).toHaveBeenCalledExactlyOnceWith(user, expect.objectContaining({
      search: Object.values(args)[0], page: 1, limit: 100, archived: false,
    }));
    expect(render[name]).toHaveBeenCalledExactlyOnceWith(user, row.id);
    expect(context.documents).toEqual([file]);
    expect(result).toEqual({ attached: file.filename });
    expect(JSON.stringify(result)).toBe(JSON.stringify({ attached: file.filename }));
    expect(pending.put).not.toHaveBeenCalled();
  });

  it.each(documentCases)('%s refuses an unknown or duplicate match before rendering', async (name, args, _module, row) => {
    lookup[name].mockResolvedValueOnce(paginate([], 0, 1, 100));
    expect(await dispatch(user, name, JSON.stringify(args))).toEqual({ error: expect.stringMatching(/^No (trip|quote|invoice)/) });
    lookup[name].mockResolvedValueOnce(paginate([row, row], 2, 1, 100));
    expect(await dispatch(user, name, JSON.stringify(args))).toEqual({ error: expect.stringMatching(/^No (trip|quote|invoice)/) });
    expect(render[name]).not.toHaveBeenCalled();
    expect(context.documents).toEqual([]);
  });

  it.each(documentCases)('%s needs its own VIEW permission', async (name, args, module) => {
    const access = { ...user.access, [module]: { reach: Reach.ALL, actions: [] } };
    expect(await dispatch({ ...user, access }, name, JSON.stringify(args))).toEqual({ error: 'Not permitted for this account' });
    expectNoServiceCalls();
    expect(context.documents).toEqual([]);
  });

  it('requires TRIPS VIEW for the itinerary lookup', async () => {
    const access = { ...user.access, [Module.TRIPS]: { reach: Reach.ALL, actions: [] } };
    expect(await dispatch({ ...user, access }, 'send_itinerary', '{"trip":"TJ-1048"}')).toEqual({ error: 'Not permitted for this account' });
    expectNoServiceCalls();
    expect(context.documents).toEqual([]);
  });

  it('names the trip when no live itinerary is on file', async () => {
    itineraries.renderPdfForTrip.mockResolvedValueOnce(null);
    expect(await dispatch(user, 'send_itinerary', '{"trip":"1048"}')).toEqual({ error: 'No itinerary on file for TJ-1048' });
    expect(context.documents).toEqual([]);
  });

  it('checks later pages for the exact quote when a different record matches the search text', async () => {
    quotes.findAll.mockResolvedValueOnce(paginate([{ id: OTHER_QUOTE_ID, reference: 9999 }], 101, 1, 100))
      .mockResolvedValueOnce(paginate([quote], 101, 2, 100));
    expect(await dispatch(user, 'send_quote', '{"quote":"1042"}')).toEqual({ attached: quotePdf.filename });
    expect(quotes.findAll).toHaveBeenNthCalledWith(2, user, expect.objectContaining({ page: 2 }));
    expect(quotes.renderPdf).toHaveBeenCalledExactlyOnceWith(user, QUOTE_ID);
  });

  it('attaches each record once and refuses a fourth document before rendering it', async () => {
    for (const [name, args, , , file] of documentCases) {
      expect(await dispatch(user, name, JSON.stringify(args))).toEqual({ attached: file.filename });
    }
    expect(await dispatch(user, 'send_quote', '{"quote":"q1042"}')).toEqual({ attached: quotePdf.filename });
    quotes.findAll.mockResolvedValueOnce(paginate([{ id: OTHER_QUOTE_ID, reference: 1043 }], 1, 1, 100));
    expect(await dispatch(user, 'send_quote', '{"quote":"Q-1043"}')).toEqual({ error: 'Three documents per message — ask for the rest next' });
    expect(quotes.renderPdf).toHaveBeenCalledExactlyOnceWith(user, QUOTE_ID);
    expect(context.documents).toEqual([itineraryPdf, quotePdf, invoicePdf]);
  });
});
