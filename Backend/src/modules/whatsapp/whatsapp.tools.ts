import { HttpException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Action, canDo, Module } from '../../common/authorization/access.js';
import { calendarDate } from '../../common/dto/dates.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TripStatus } from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';
import { queryClientsSchema } from '../clients/dto/client.dto.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { dashboardSummarySchema } from '../dashboard/dto/dashboard.dto.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { windowDays } from '../schedule/schedule.calendar.js';
import type { AiToolSpec } from './whatsapp.ai-client.js';

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

const person = z.object({ firstName: z.string(), lastName: z.string() });
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

interface ToolDefinition<S extends z.ZodType> {
  name: string;
  description: string;
  schema: S;
  permission: { module: Module; action: Action };
  run(user: AuthenticatedUser, args: z.output<S>): Promise<unknown>;
}

/** Validation and capability travel with the tool, so no dispatch can skip them. */
function defineTool<S extends z.ZodType>(definition: ToolDefinition<S>) {
  return {
    ...definition,
    async dispatch(user: AuthenticatedUser, raw: unknown): Promise<unknown> {
      const args = definition.schema.safeParse(raw);
      if (!args.success) return { error: args.error.message };
      const { module, action } = definition.permission;
      if (!canDo(user.access, module, action)) return { error: 'Not permitted for this account' };
      return definition.run(user, args.data);
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

  constructor(schedule: ScheduleService, dashboard: DashboardService, clients: ClientsService) {
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
        description: 'Find up to five live clients by name, company, email or phone using a search string of 2–100 characters. The search matches one field at a time, so send a single name (the surname is best), a company, an email or a phone — never a full name. If a surname finds nobody, try the first name. Returns only contact, assignment and follow-up details. Total may exceed the returned clients; narrow the search when it does.',
        schema: clientArgs,
        permission: { module: Module.CLIENTS, action: Action.VIEW },
        async run(user, args) {
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
                nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
              };
            }),
          };
        },
      }),
    ];
  }

  specs(): AiToolSpec[] {
    return this.definitions.map(({ name, description, schema }) => ({
      name, description, parameters: z.toJSONSchema(schema, { io: 'input' }),
    }));
  }

  async dispatch(user: AuthenticatedUser, name: string, argumentsJson: string): Promise<unknown> {
    const tool = this.definitions.find((definition) => definition.name === name);
    if (!tool) return { error: 'Unknown tool' };
    let raw: unknown;
    try {
      raw = JSON.parse(argumentsJson);
    } catch {
      return { error: 'Arguments must be valid JSON' };
    }
    try {
      return await tool.dispatch(user, raw);
    } catch (error: unknown) {
      if (error instanceof HttpException) return { error: error.message };
      // Even error messages can echo SQL or client data. Record the class
      // only, never the arguments, service row, or provider response.
      this.logger.error(`CRM tool failed (${error instanceof Error ? error.name : 'UnknownError'})`);
      return { error: 'The CRM could not answer that' };
    }
  }
}
