import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import {
  equalsAny,
  orderByField,
  searchAcross,
} from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import {
  Permission,
  Scope,
  scopeFor,
} from '../../common/authorization/permissions.js';
import { InvoiceStatus, TripStatus, TripType } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { priceQuote } from '../quotes/quotes.pricing.js';
import { fromCents, toCents } from '../../common/money/cents.js';
import { QuotesService } from '../quotes/quotes.service.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { TripPaymentState, todayUtc, tripPayment } from '../receivables/receivables.amounts.js';
import {
  ACTIVE_STATUSES,
  REVENUE_STATUSES,
  allowedNextStatuses,
  canMove,
  isEditable,
  legProblem,
} from './trips.lifecycle.js';
import type {
  BookQuoteInput,
  ChangeTripStatusInput,
  CreateTripInput,
  LegInput,
  PassengerInput,
  QueryTripsInput,
  TripWindow,
  UpdateTripInput,
} from './dto/trip.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true, country: true },
} satisfies Prisma.AirportDefaultArgs;

/** The client as a row, so a rename shows everywhere the next time it is read. */
const CLIENT_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    companyName: true,
    email: true,
    phone: true,
    type: true,
    status: true,
  },
} satisfies Prisma.ClientDefaultArgs;

const LEG_SELECT = {
  where: { deletedAt: null },
  orderBy: { sequence: 'asc' },
  select: {
    id: true,
    sequence: true,
    originAirportId: true,
    originAirport: AIRPORT_SELECT,
    destinationAirportId: true,
    destinationAirport: AIRPORT_SELECT,
    departureDate: true,
    departureTime: true,
  },
} satisfies Prisma.Trip$legsArgs;

const PASSENGER_SELECT = {
  where: { deletedAt: null },
  orderBy: { sequence: 'asc' },
  select: {
    id: true,
    sequence: true,
    fullName: true,
    dateOfBirth: true,
    passportNumber: true,
  },
} satisfies Prisma.Trip$passengersArgs;

/**
 * The trip's live invoices, with exactly what its billing position is worked
 * out from (Receivables, #16). Read here as the trip's own relation and
 * summarised by the receivables module's pure arithmetic — the figures are
 * never returned raw, and never stored on the trip.
 */
const INVOICE_SELECT = {
  where: { deletedAt: null },
  select: {
    amount: true,
    fetAmount: true,
    status: true,
    dueDate: true,
    payments: { where: { deletedAt: null }, select: { amount: true } },
  },
} satisfies Prisma.Trip$invoicesArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const TRIP_LIST_SELECT = {
  id: true,
  reference: true,
  clientId: true,
  client: CLIENT_SELECT,
  assignedBrokerId: true,
  assignedBroker: ACTOR_SELECT,
  tripRequestId: true,
  quoteId: true,
  operatorId: true,
  operator: { select: { id: true, name: true } },
  aircraftId: true,
  aircraft: {
    select: {
      id: true,
      tailNumber: true,
      model: true,
      category: true,
      exteriorImageUrl: true,
      interiorImageUrl: true,
    },
  },
  aircraftDescription: true,
  type: true,
  status: true,
  operatorConfirmedAt: true,
  passengerCount: true,
  departureDate: true,
  basePrice: true,
  fetEnabled: true,
  fetRate: true,
  operatorCost: true,
  lineItems: true,
  legs: LEG_SELECT,
  invoices: INVOICE_SELECT,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.TripSelect;

const TRIP_DETAIL_SELECT = {
  ...TRIP_LIST_SELECT,
  quote: { select: { id: true, reference: true, status: true } },
  tripRequest: { select: { id: true, reference: true, status: true } },
  passengers: PASSENGER_SELECT,
  internalNotes: true,
  clientNotes: true,
  documentUrls: true,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.TripSelect;

type ListRow = Prisma.TripGetPayload<{ select: typeof TRIP_LIST_SELECT }>;

/** Departure relative to today, on the first leg's day. */
function departureFilter(window: TripWindow | undefined): Prisma.TripWhereInput {
  if (!window) return {};
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const tomorrow = new Date(start);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  switch (window) {
    case 'PAST':
      return { departureDate: { lt: start } };
    case 'TODAY':
      return { departureDate: { gte: start, lt: tomorrow } };
    case 'UPCOMING':
      return { departureDate: { gte: tomorrow } };
    default:
      return {};
  }
}

const toNumber = (value: Prisma.Decimal | number | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

/**
 * Trips (#11) — the booked flight, and the module almost everything after it
 * reads from.
 *
 * Money follows the quotes module exactly: only what a person typed is stored,
 * and FET, total, profit and margin are computed on every read by the same
 * `priceQuote()`. A trip with no price yet has every computed figure null —
 * never zero. Operator cost, profit and margin are absent for a caller without
 * VIEW_FINANCIALS, as on a quote.
 */
@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly quotes: QuotesService,
    private readonly requests: TripRequestsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  /**
   * Row-level visibility — the same rule as trip requests and quotes: a
   * broker sees the trips assigned to them and the unassigned ones, because
   * a booking that arrived before anyone owned it must not disappear.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.TripWhereInput {
    if (scopeFor(user.role, Permission.VIEW_TRIPS) === Scope.ALL) return {};
    return { OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }] };
  }

  private seesFinancials(user: AuthenticatedUser): boolean {
    return scopeFor(user.role, Permission.VIEW_FINANCIALS) !== Scope.NONE;
  }

  /** Whether the caller may read what the client has been billed and paid. */
  private seesReceivables(user: AuthenticatedUser): boolean {
    return scopeFor(user.role, Permission.VIEW_RECEIVABLES) !== Scope.NONE;
  }

  /** Reassigning a trip is an administrator's call, like a client's. */
  private assertMayReassign(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.MANAGE_TRIPS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only an administrator or senior broker can reassign a trip.',
      );
    }
  }

  private assertMayArchive(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.DELETE_TRIPS) !== Scope.ALL) {
      throw new ForbiddenException(
        'Only an administrator can archive a trip. Cancel it instead.',
      );
    }
  }

  // ---- Shaping ----------------------------------------------------------

  /**
   * The computed money, on every read. `null` across the board when no price
   * has been set — a draft trip with no price has no total, not a $0 one.
   */
  private serialise<T extends ListRow>({ invoices, ...row }: T, user: AuthenticatedUser) {
    const financials = this.seesFinancials(user);
    const priced =
      row.basePrice === null
        ? null
        : priceQuote({
            basePrice: row.basePrice,
            fetEnabled: row.fetEnabled,
            fetRate: row.fetRate,
            operatorCost: row.operatorCost,
            lineItems: row.lineItems,
          });

    return {
      ...row,
      basePrice: priced?.basePrice ?? null,
      fetRate: Number(row.fetRate),
      fetAmount: priced?.fetAmount ?? null,
      extrasTotal: priced?.extrasTotal ?? null,
      totalPrice: priced?.totalPrice ?? null,
      lineItems: priced?.lineItems ?? [],
      ...(financials
        ? {
            operatorCost: toNumber(row.operatorCost),
            grossProfit: priced?.grossProfit ?? null,
            marginPercentage: priced?.marginPercentage ?? null,
          }
        : { operatorCost: undefined, grossProfit: undefined, marginPercentage: undefined }),
      /**
       * The client's billing position across this trip's invoices (#16) —
       * absent for a role that may not read receivables, never a guess.
       */
      clientPayment: this.seesReceivables(user)
        ? {
            ...tripPayment(invoices),
            /**
             * What billing the whole trip would charge — the price and extras,
             * and the FET — so the invoice form's "bill the full trip" copies
             * server figures rather than adding them up in the browser. Null
             * while the trip has no price.
             */
            fullCharge: priced
              ? {
                  amount: fromCents(toCents(priced.basePrice) + toCents(priced.extrasTotal)),
                  fetAmount: priced.fetAmount,
                }
              : null,
          }
        : undefined,
      operatorConfirmed: row.operatorConfirmedAt !== null,
      nextStatuses: allowedNextStatuses(row.status),
      editable: isEditable(row.status) && row.deletedAt === null,
    };
  }

  // ---- Link checks ------------------------------------------------------

  private async assertClient(id: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: { deletedAt: true },
    });
    if (!client) throw new BadRequestException('That client does not exist');
    if (client.deletedAt) {
      throw new BadRequestException('That client has been archived. Restore them, or choose another.');
    }
  }

  private async assertBroker(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const broker = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!broker) throw new BadRequestException('That broker does not exist');
  }

  private async assertOperator(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const row = await this.prisma.operator.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row) throw new BadRequestException('That operator does not exist');
    if (row.deletedAt) throw new BadRequestException('That operator has been archived. Restore it, or choose another.');
  }

  private async assertAircraft(id: string | null | undefined): Promise<void> {
    if (!id) return;
    const row = await this.prisma.aircraft.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row) throw new BadRequestException('That aircraft does not exist');
    if (row.deletedAt) throw new BadRequestException('That aircraft has been archived. Restore it, or choose another.');
  }

  private async assertTripRequest(id: string | null | undefined, clientId: string): Promise<void> {
    if (!id) return;
    const row = await this.prisma.tripRequest.findFirst({
      where: { id, deletedAt: null },
      select: { clientId: true },
    });
    if (!row) throw new BadRequestException('That trip request does not exist');
    if (row.clientId !== clientId) {
      throw new BadRequestException('That trip request belongs to a different client');
    }
  }

  /** Every airport the legs name must be a live row — checked once, together. */
  private async assertAirports(legs: LegInput[], previous?: Set<string>): Promise<void> {
    const ids = [...new Set(legs.flatMap((leg) => [leg.originAirportId, leg.destinationAirportId]))]
      // An airport already on this trip is not re-checked: archiving it later
      // must not lock the trip (AGENTS.md, "validate a foreign key only when it
      // is actually changing").
      .filter((id) => !previous?.has(id));
    if (ids.length === 0) return;
    const rows = await this.prisma.airport.findMany({
      where: { id: { in: ids } },
      select: { id: true, icao: true, deletedAt: true },
    });
    const found = new Map(rows.map((row) => [row.id, row]));
    for (const id of ids) {
      const row = found.get(id);
      if (!row) throw new BadRequestException('One of the legs names an airport that does not exist');
      if (row.deletedAt) {
        throw new BadRequestException(`${row.icao} has been archived. Restore it, or choose another airport.`);
      }
    }
  }

  private assertLegs(type: TripType, legs: LegInput[]): void {
    const problem = legProblem(type, legs);
    if (problem) throw new BadRequestException(problem);
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryTripsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.TripWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.visibilityScope(user),
        equalsAny(query, ['status', 'type', 'clientId', 'assignedBrokerId', 'operatorId', 'aircraftId']),
        departureFilter(query.departure),
        query.activeOnly ? { status: { in: [...ACTIVE_STATUSES] } } : {},
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take,
        // Nulls last whichever way it sorts: a draft with no date yet must not
        // sit at the top of an "upcoming departures" list.
        orderBy:
          query.sortBy === 'departureDate'
            ? [{ departureDate: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: TRIP_LIST_SELECT,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row, user)), total, query.page, query.limit);
  }

  /** Search the reference ("TJ-1048" or "1048"), the client, the tail and the operator. */
  private searchWhere(term: string): Prisma.TripWhereInput {
    const digits = term.replace(/^TJ-?/i, '');
    const reference = /^\d{1,9}$/.test(digits) ? Number(digits) : null;
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        { client: searchAcross(term, ['firstName', 'lastName', 'companyName', 'email']) },
        { aircraft: searchAcross(term, ['tailNumber', 'model']) },
        { operator: searchAcross(term, ['name']) },
        searchAcross(term, ['aircraftDescription']),
      ],
    };
  }

  /** Archived trips included — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.trip.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: TRIP_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Trip not found');
    return {
      ...this.serialise(row, user),
      // Passport numbers ride along only with the trip itself — whoever may
      // read the trip may read its manifest, and nobody else ever sees it.
    };
  }

  /**
   * The tiles above the board. Money is counted in the service because the
   * total is computed, not stored — `SUM(basePrice)` would be a figure that is
   * neither the offer nor the revenue (AGENTS.md).
   */
  async stats(user: AuthenticatedUser) {
    const scope = { deletedAt: null, ...this.visibilityScope(user) };
    const receivables = this.seesReceivables(user);
    const [byStatus, revenueRows, lateRows] = await Promise.all([
      this.prisma.trip.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.trip.findMany({
        where: { ...scope, status: { in: [...REVENUE_STATUSES] }, basePrice: { not: null } },
        select: {
          basePrice: true,
          fetEnabled: true,
          fetRate: true,
          operatorCost: true,
          lineItems: true,
        },
      }),
      // Only trips with a sent invoice past its due date can be late; the
      // payments decide whether they still are.
      receivables
        ? this.prisma.trip.findMany({
            where: {
              ...scope,
              invoices: { some: { deletedAt: null, status: InvoiceStatus.SENT, dueDate: { lt: todayUtc() } } },
            },
            select: { invoices: INVOICE_SELECT },
          })
        : Promise.resolve([]),
    ]);

    const count = (status: TripStatus) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    let revenue = 0;
    let profit = 0;
    let profitKnown = 0;
    for (const row of revenueRows) {
      const priced = priceQuote({ ...row, basePrice: row.basePrice! });
      revenue += priced.totalPrice;
      if (priced.grossProfit !== null) {
        profit += priced.grossProfit;
        profitKnown += 1;
      }
    }

    const financials = this.seesFinancials(user);
    return {
      active: ACTIVE_STATUSES.reduce((sum, status) => sum + count(status), 0),
      inFlight: count(TripStatus.IN_FLIGHT),
      confirmedOrBooked: count(TripStatus.CONFIRMED) + count(TripStatus.BOOKED),
      completed: count(TripStatus.COMPLETED),
      cancelled: count(TripStatus.CANCELLED),
      totalRevenue: financials ? Math.round(revenue * 100) / 100 : undefined,
      // Profit is summed only over trips whose operator cost is known, and
      // says how many that was — a profit total silently missing half the
      // trips reads as a bad month.
      totalProfit: financials ? Math.round(profit * 100) / 100 : undefined,
      profitTripCount: financials ? profitKnown : undefined,
      /**
       * Trips with an overdue client invoice (#16). Absent for a role that may
       * not read receivables.
       */
      paymentAttention: receivables
        ? lateRows.filter((row) => tripPayment(row.invoices).state === TripPaymentState.OVERDUE).length
        : undefined,
    };
  }

  // ---- Writes -----------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateTripInput) {
    if (dto.assignedBrokerId && dto.assignedBrokerId !== user.id) this.assertMayReassign(user);
    this.assertLegs(dto.type, dto.legs);
    await Promise.all([
      this.assertClient(dto.clientId),
      this.assertBroker(dto.assignedBrokerId),
      this.assertOperator(dto.operatorId),
      this.assertAircraft(dto.aircraftId),
      this.assertTripRequest(dto.tripRequestId, dto.clientId),
      this.assertAirports(dto.legs),
    ]);

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          clientId: dto.clientId,
          // A broker's own booking is theirs unless they say otherwise.
          assignedBrokerId: dto.assignedBrokerId === undefined ? user.id : dto.assignedBrokerId,
          tripRequestId: dto.tripRequestId ?? null,
          operatorId: dto.operatorId ?? null,
          aircraftId: dto.aircraftId ?? null,
          aircraftDescription: dto.aircraftDescription ?? null,
          type: dto.type,
          status: dto.status,
          operatorConfirmedAt: dto.operatorConfirmed ? new Date() : null,
          passengerCount: dto.passengerCount ?? null,
          departureDate: dto.legs[0]?.departureDate ?? null,
          basePrice: dto.basePrice ?? null,
          fetEnabled: dto.fetEnabled,
          ...(dto.fetRate !== undefined ? { fetRate: dto.fetRate } : {}),
          operatorCost: dto.operatorCost ?? null,
          lineItems: (dto.lineItems ?? []) as Prisma.InputJsonValue,
          internalNotes: dto.internalNotes ?? null,
          clientNotes: dto.clientNotes ?? null,
          documentUrls: dto.documentUrls,
          createdById: user.id,
          updatedById: user.id,
        },
        select: { id: true, reference: true },
      });
      await this.writeLegs(tx, user, created.id, dto.legs, []);
      await this.writePassengers(tx, user, created.id, dto.passengers, []);
      return created;
    });

    if (dto.tripRequestId) await this.requests.markConverted(user, dto.tripRequestId);

    await this.audit.record({
      actorId: user.id,
      action: 'trip.created',
      entityType: 'Trip',
      entityId: trip.id,
      metadata: { reference: trip.reference, status: dto.status, clientId: dto.clientId },
    });

    return this.findOne(user, trip.id);
  }

  /**
   * Books an approved quote as a trip — the step the quote's status actions
   * have been pointing at since Quotes shipped.
   *
   * Copies the quote's client, broker, operator, aircraft, route, dates, party
   * and priced inputs as they stand at the moment of booking. A quote books
   * one trip: a second attempt is refused by name, pointing at the first.
   */
  async bookFromQuote(user: AuthenticatedUser, quoteId: string, dto: BookQuoteInput) {
    const quote = await this.quotes.bookingSource(user, quoteId);
    if (quote.trip) {
      throw new ConflictException(
        `This quote is already booked as TJ-${quote.trip.reference}.`,
      );
    }
    if (!quote.originAirportId || !quote.destinationAirportId) {
      throw new BadRequestException(
        'The quote has no route. Add its origin and destination before booking it.',
      );
    }

    const outbound = {
      originAirportId: quote.originAirportId,
      destinationAirportId: quote.destinationAirportId,
      departureDate: quote.departureDate,
      departureTime: null,
    };
    const legs: LegInput[] = quote.returnDate
      ? [outbound, {
          originAirportId: quote.destinationAirportId,
          destinationAirportId: quote.originAirportId,
          departureDate: quote.returnDate,
          departureTime: null,
        }]
      : [outbound];

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
        data: {
          clientId: quote.clientId,
          assignedBrokerId: quote.assignedBrokerId,
          tripRequestId: quote.tripRequestId,
          quoteId: quote.id,
          operatorId: quote.operatorId,
          aircraftId: quote.aircraftId,
          aircraftDescription: quote.quotedAircraft,
          type: quote.returnDate ? TripType.ROUND_TRIP : TripType.ONE_WAY,
          status: dto.status,
          passengerCount: quote.passengers,
          departureDate: quote.departureDate,
          basePrice: quote.basePrice,
          fetEnabled: quote.fetEnabled,
          fetRate: quote.fetRate,
          operatorCost: quote.operatorCost,
          lineItems: quote.lineItems as Prisma.InputJsonValue,
          createdById: user.id,
          updatedById: user.id,
        },
        select: { id: true, reference: true },
      });
      await this.writeLegs(tx, user, created.id, legs, []);
      return created;
    });

    if (quote.tripRequestId) await this.requests.markConverted(user, quote.tripRequestId);

    await this.audit.record({
      actorId: user.id,
      action: 'trip.booked_from_quote',
      entityType: 'Trip',
      entityId: trip.id,
      metadata: { reference: trip.reference, quoteId: quote.id, quoteReference: quote.reference },
    });

    return this.findOne(user, trip.id);
  }

  /** A live trip within scope, for every write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: {
        id: true,
        reference: true,
        status: true,
        type: true,
        clientId: true,
        assignedBrokerId: true,
        tripRequestId: true,
        operatorId: true,
        aircraftId: true,
        operatorConfirmedAt: true,
        legs: { where: { deletedAt: null }, select: { id: true, originAirportId: true, destinationAirportId: true, departureDate: true } },
        passengers: { where: { deletedAt: null }, select: { id: true } },
      },
    });
    if (!row) throw new NotFoundException('Trip not found');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTripInput) {
    const current = await this.findLive(user, id);
    if (!isEditable(current.status)) {
      throw new BadRequestException(
        `A ${current.status.toLowerCase()} trip is history. Move it back a step before editing it.`,
      );
    }

    // Only links that actually change are checked — see AGENTS.md.
    const clientId = dto.clientId ?? current.clientId;
    if (dto.clientId !== undefined && dto.clientId !== current.clientId) await this.assertClient(dto.clientId);
    if (dto.assignedBrokerId !== undefined && dto.assignedBrokerId !== current.assignedBrokerId) {
      this.assertMayReassign(user);
      await this.assertBroker(dto.assignedBrokerId);
    }
    if (dto.operatorId !== undefined && dto.operatorId !== current.operatorId) await this.assertOperator(dto.operatorId);
    if (dto.aircraftId !== undefined && dto.aircraftId !== current.aircraftId) await this.assertAircraft(dto.aircraftId);
    if (
      (dto.tripRequestId !== undefined && dto.tripRequestId !== current.tripRequestId) ||
      (dto.clientId !== undefined && dto.clientId !== current.clientId && current.tripRequestId)
    ) {
      await this.assertTripRequest(dto.tripRequestId === undefined ? current.tripRequestId : dto.tripRequestId, clientId);
    }

    const type = dto.type ?? current.type;
    if (dto.legs) {
      this.assertLegs(type, dto.legs);
      const previous = new Set(current.legs.flatMap((leg) => [leg.originAirportId, leg.destinationAirportId]));
      await this.assertAirports(dto.legs, previous);
    } else if (dto.type && dto.type !== current.type) {
      // Changing the type without re-sending the legs must still leave a trip
      // whose legs fit it.
      this.assertLegs(type, current.legs);
    }

    const { legs, passengers, operatorConfirmed, lineItems, ...fields } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id },
        data: {
          ...fields,
          ...(lineItems !== undefined ? { lineItems: lineItems as Prisma.InputJsonValue } : {}),
          ...(operatorConfirmed !== undefined
            ? {
                // Keep the original confirmation time when it is re-sent as true.
                operatorConfirmedAt: operatorConfirmed
                  ? (current.operatorConfirmedAt ?? new Date())
                  : null,
              }
            : {}),
          ...(legs ? { departureDate: legs[0]?.departureDate ?? null } : {}),
          updatedById: user.id,
        },
      });
      if (legs) await this.writeLegs(tx, user, id, legs, current.legs.map((leg) => leg.id));
      if (passengers) await this.writePassengers(tx, user, id, passengers, current.passengers.map((p) => p.id));
    });

    if (dto.tripRequestId && dto.tripRequestId !== current.tripRequestId) {
      await this.requests.markConverted(user, dto.tripRequestId);
    }

    await this.audit.record({
      actorId: user.id,
      action: 'trip.updated',
      entityType: 'Trip',
      entityId: id,
      metadata: { reference: current.reference, fields: Object.keys(dto) },
    });

    return this.findOne(user, id);
  }

  /**
   * Replaces the leg list: rows sent with an id are updated in place, new ones
   * created, and stored legs missing from the list archived — never deleted.
   */
  private async writeLegs(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    tripId: string,
    legs: LegInput[],
    existingIds: string[],
  ) {
    const keep = new Set(legs.map((leg) => leg.id).filter((legId): legId is string => Boolean(legId)));
    const unknown = [...keep].filter((legId) => !existingIds.includes(legId));
    if (unknown.length) throw new BadRequestException('A leg id does not belong to this trip');

    const removed = existingIds.filter((legId) => !keep.has(legId));
    if (removed.length) {
      await tx.tripLeg.updateMany({
        where: { id: { in: removed } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
    }

    for (const [index, leg] of legs.entries()) {
      const data = {
        sequence: index + 1,
        originAirportId: leg.originAirportId,
        destinationAirportId: leg.destinationAirportId,
        departureDate: leg.departureDate ?? null,
        departureTime: leg.departureTime ?? null,
        updatedById: user.id,
      };
      if (leg.id) {
        await tx.tripLeg.update({ where: { id: leg.id }, data });
      } else {
        await tx.tripLeg.create({ data: { ...data, tripId, createdById: user.id } });
      }
    }
  }

  /** Same replace-by-id rule as the legs. */
  private async writePassengers(
    tx: Prisma.TransactionClient,
    user: AuthenticatedUser,
    tripId: string,
    passengers: PassengerInput[],
    existingIds: string[],
  ) {
    const keep = new Set(passengers.map((p) => p.id).filter((pid): pid is string => Boolean(pid)));
    const unknown = [...keep].filter((pid) => !existingIds.includes(pid));
    if (unknown.length) throw new BadRequestException('A passenger id does not belong to this trip');

    const removed = existingIds.filter((pid) => !keep.has(pid));
    if (removed.length) {
      await tx.tripPassenger.updateMany({
        where: { id: { in: removed } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
    }

    for (const [index, passenger] of passengers.entries()) {
      const data = {
        sequence: index + 1,
        fullName: passenger.fullName,
        dateOfBirth: passenger.dateOfBirth ?? null,
        passportNumber: passenger.passportNumber ?? null,
        updatedById: user.id,
      };
      if (passenger.id) {
        await tx.tripPassenger.update({ where: { id: passenger.id }, data });
      } else {
        await tx.tripPassenger.create({ data: { ...data, tripId, createdById: user.id } });
      }
    }
  }

  /**
   * Moves the trip along its lifecycle. A move the lifecycle does not allow is
   * a 400 that names the allowed ones, so the screen can explain rather than
   * just refuse.
   */
  async changeStatus(user: AuthenticatedUser, id: string, dto: ChangeTripStatusInput) {
    const current = await this.findLive(user, id);
    if (current.status === dto.status) return this.findOne(user, id);
    if (!canMove(current.status, dto.status)) {
      const allowed = allowedNextStatuses(current.status).join(', ');
      throw new BadRequestException(
        `A ${current.status} trip cannot move to ${dto.status}. From here it can move to: ${allowed}.`,
      );
    }

    await this.prisma.trip.update({
      where: { id },
      data: { status: dto.status, updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'trip.status_changed',
      entityType: 'Trip',
      entityId: id,
      metadata: { reference: current.reference, from: current.status, to: dto.status, note: dto.note ?? null },
    });

    return this.findOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user);
    const trip = await this.findLive(user, id);
    await this.prisma.trip.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'trip.archived',
      entityType: 'Trip',
      entityId: id,
      metadata: { reference: trip.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    if (!trip) throw new NotFoundException('Archived trip not found');
    await this.prisma.trip.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'trip.restored',
      entityType: 'Trip',
      entityId: id,
      metadata: { reference: trip.reference },
    });
    return this.findOne(user, id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.trip.findMany({
      where: { id: { in: ids }, deletedAt: null, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.trip.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'trip.bulk_archived',
        entityType: 'Trip',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.trip.findMany({
      where: { id: { in: ids }, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.trip.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'trip.bulk_restored',
        entityType: 'Trip',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  // ---- For other modules ------------------------------------------------

  /**
   * A trip as a notes subject (#5's "timeline for trips"): readable within the
   * caller's scope, or 404. Mirrors `ClientsService.subjectRef`.
   */
  async subjectRef(user: AuthenticatedUser, id: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: { id: true, reference: true, deletedAt: true },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return { id: trip.id, label: `TJ-${trip.reference}`, archived: trip.deletedAt !== null };
  }

  /**
   * Whether a trip may carry a client's credit application: it must exist, be
   * visible to the caller, and belong to the same client. Used by the client
   * credits module — "used towards another trip" as a real link.
   */
  async assertCreditTarget(user: AuthenticatedUser, tripId: string, clientId: string): Promise<void> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null, ...this.visibilityScope(user) },
      select: { clientId: true },
    });
    if (!trip) throw new BadRequestException('That trip does not exist');
    if (trip.clientId !== clientId) {
      throw new BadRequestException('Credit can only be applied to one of the same client\'s trips');
    }
  }

  /**
   * Row-level trip visibility as a `where`, for a module whose rows hang off a
   * trip and inherit its scope — Receivables reads an invoice exactly when the
   * caller may read its trip.
   */
  visibleWhere(user: AuthenticatedUser): Prisma.TripWhereInput {
    return this.visibilityScope(user);
  }

  /**
   * A live trip, visible to the caller, that an invoice can be raised on — its
   * reference and client — or a 400 naming the problem.
   */
  async invoiceTarget(user: AuthenticatedUser, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ...this.visibilityScope(user) },
      select: { id: true, reference: true, clientId: true, deletedAt: true },
    });
    if (!trip) throw new BadRequestException('That trip does not exist');
    if (trip.deletedAt) throw new BadRequestException(`TJ-${trip.reference} has been archived. Restore it first.`);
    return trip;
  }

  /**
   * A live trip a commission can be raised on — its reference, broker and
   * client — or a 400 naming the problem. Unscoped on purpose: raising a
   * commission is MANAGE_COMMISSIONS, which only roles that see every trip
   * hold.
   */
  async commissionTarget(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, reference: true, assignedBrokerId: true, clientId: true, deletedAt: true },
    });
    if (!trip) throw new BadRequestException('That trip does not exist');
    if (trip.deletedAt) throw new BadRequestException(`TJ-${trip.reference} has been archived. Restore it first.`);
    return trip;
  }

  /**
   * Whether a portal referral may be marked as having booked this trip: it
   * must be live, visible to the caller, and for the referral's own client —
   * a referral cannot claim somebody else's booking (and its commission).
   */
  async assertReferralTarget(user: AuthenticatedUser, tripId: string, clientId: string): Promise<void> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null, ...this.visibilityScope(user) },
      select: { clientId: true, reference: true },
    });
    if (!trip) throw new BadRequestException('That trip does not exist');
    if (trip.clientId !== clientId) {
      throw new BadRequestException(`TJ-${trip.reference} is for a different client than this referral`);
    }
  }

  /**
   * Live trips counted per operator / aircraft / broker, for the dependants'
   * second pass. One grouped query each — never a count per row.
   */
  async countByOperator(operatorIds: string[]) {
    return this.countBy('operatorId', operatorIds);
  }

  async countByAircraft(aircraftIds: string[]) {
    return this.countBy('aircraftId', aircraftIds);
  }

  /** Active (not completed, not cancelled) trips per broker. */
  async activeCountByBroker(brokerIds: string[]) {
    if (brokerIds.length === 0) return new Map<string, number>();
    const rows = await this.prisma.trip.groupBy({
      by: ['assignedBrokerId'],
      where: { assignedBrokerId: { in: brokerIds }, deletedAt: null, status: { in: [...ACTIVE_STATUSES] } },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.assignedBrokerId as string, row._count._all]));
  }

  private async countBy(field: 'operatorId' | 'aircraftId', ids: string[]) {
    if (ids.length === 0) return new Map<string, { total: number; thisYear: number }>();
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const where = { [field]: { in: ids }, deletedAt: null, status: { not: TripStatus.CANCELLED } };
    const [total, thisYear] = await Promise.all([
      this.prisma.trip.groupBy({ by: [field], where, _count: { _all: true } }),
      this.prisma.trip.groupBy({
        by: [field],
        where: { ...where, departureDate: { gte: yearStart } },
        _count: { _all: true },
      }),
    ]);
    const year = new Map(thisYear.map((row) => [row[field] as string, row._count._all]));
    return new Map(
      total.map((row) => [row[field] as string, { total: row._count._all, thisYear: year.get(row[field] as string) ?? 0 }]),
    );
  }
}
