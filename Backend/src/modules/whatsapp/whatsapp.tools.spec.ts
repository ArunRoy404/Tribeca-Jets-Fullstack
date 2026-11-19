import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, NotFoundException } from '@nestjs/common';
import { Action, Module, Reach, resolveAccess } from '../../common/authorization/access.js';
import { DEFAULT_TIME_ZONE } from '../../common/dates/time-zone.js';
import { paginate, type AuthenticatedUser } from '../../common/types/api.types.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { WhatsappTools, type ToolContext } from './whatsapp.tools.js';

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

describe('WhatsappTools dispatcher', () => {
  let schedule: { findAll: ReturnType<typeof vi.fn> };
  let dashboard: { summary: ReturnType<typeof vi.fn> };
  let clients: { findAll: ReturnType<typeof vi.fn> };
  let auth: { updateProfile: ReturnType<typeof vi.fn> };
  let context: ToolContext;
  let tools: WhatsappTools;
  const companyTimeZone = vi.fn(async () => DEFAULT_TIME_ZONE);

  beforeEach(() => {
    schedule = { findAll: vi.fn().mockResolvedValue(paginate([flight], 1, 1, 25)) };
    dashboard = { summary: vi.fn().mockResolvedValue(structuredClone(summary)) };
    clients = { findAll: vi.fn().mockResolvedValue(paginate([client], 1, 1, 5)) };
    auth = { updateProfile: vi.fn().mockResolvedValue(undefined) };
    companyTimeZone.mockClear();
    context = { timeZone: 'Asia/Dhaka', companyTimeZone };
    tools = new WhatsappTools(schedule as never, dashboard as never, clients as never, auth as never);
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
  }

  it('returns an error for an unknown tool without calling any service', async () => {
    expect(await dispatch(user, 'approve_trip', '{}')).toEqual({ error: 'Unknown tool' });
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
    const args = { list_flights: windowArgs, dashboard_kpis: {}, find_client: { query: 'Alex' } };
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
    expect(specs.map((spec) => spec.name)).toEqual(['list_flights', 'dashboard_kpis', 'find_client', 'set_my_timezone']);
    expect(specs[0]?.parameters).toMatchObject({ type: 'object', required: ['from', 'to'], properties: { from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' } } });
    expect(specs[1]?.parameters).toMatchObject({ properties: { period: { enum: ['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'], default: 'WEEK' } } });
    expect(specs[2]?.parameters).toMatchObject({ required: ['query'], properties: { query: { type: 'string', minLength: 2, maxLength: 100 } } });
    expect(specs[3]?.parameters).toMatchObject({
      required: ['timeZone'], additionalProperties: false,
      properties: { timeZone: { anyOf: [{ type: 'string', maxLength: 64 }, { type: 'null' }] } },
    });
    expectNoServiceCalls();
  });
});
