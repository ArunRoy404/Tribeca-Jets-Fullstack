import {
  BadRequestException,
  ConflictException,
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
import { ItineraryStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { TripsService } from '../trips/trips.service.js';
import type {
  CreateItineraryInput,
  QueryItinerariesInput,
  UpdateItineraryInput,
} from './dto/itinerary.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/** Enough of an airport to show a route code and its FBO default. */
const AIRPORT_SELECT = {
  select: { id: true, icao: true, name: true, city: true, assignedFbo: true },
} satisfies Prisma.AirportDefaultArgs;

const ITINERARY_LEG_SELECT = {
  where: { deletedAt: null },
  orderBy: { sequence: 'asc' },
  select: {
    sequence: true,
    originAirport: AIRPORT_SELECT,
    destinationAirport: AIRPORT_SELECT,
    departureDate: true,
    departureTime: true,
  },
} satisfies Prisma.Trip$legsArgs;

/** Passport numbers ride along with the trip's own manifest — whoever may
 * read the document may read the flight it is for. */
const ITINERARY_PASSENGER_SELECT = {
  where: { deletedAt: null },
  orderBy: { sequence: 'asc' },
  select: { id: true, fullName: true, dateOfBirth: true, passportNumber: true },
} satisfies Prisma.Trip$passengersArgs;

/**
 * Everything read *through* the trip: aircraft, operator, tail, route, party
 * and passengers. None of it is ever stored on the itinerary row — see
 * `itinerary.prisma` for why.
 */
const ITINERARY_TRIP_SELECT = {
  select: {
    id: true,
    reference: true,
    status: true,
    type: true,
    deletedAt: true,
    clientId: true,
    client: {
      select: { id: true, firstName: true, lastName: true, companyName: true },
    },
    assignedBrokerId: true,
    operatorId: true,
    operator: { select: { id: true, name: true } },
    aircraftId: true,
    aircraft: {
      select: { id: true, tailNumber: true, model: true, exteriorImageUrl: true, interiorImageUrl: true },
    },
    aircraftDescription: true,
    legs: ITINERARY_LEG_SELECT,
    passengers: ITINERARY_PASSENGER_SELECT,
  },
} satisfies Prisma.TripDefaultArgs;

const ITINERARY_SELECT = {
  id: true,
  tripId: true,
  trip: ITINERARY_TRIP_SELECT,
  status: true,
  confirmedAt: true,
  sentAt: true,
  sentById: true,
  sentBy: ACTOR_SELECT,
  logoUrl: true,
  arrivalTime: true,
  flightTime: true,
  miles: true,
  departureFbo: true,
  arrivalFbo: true,
  catering: true,
  groundTransport: true,
  operatorItineraryUrl: true,
  operatorItineraryText: true,
  exteriorImageUrl: true,
  interiorImageUrl: true,
  notes: true,
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  updatedById: true,
  updatedBy: ACTOR_SELECT,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.ItinerarySelect;

type ItineraryRow = Prisma.ItineraryGetPayload<{ select: typeof ITINERARY_SELECT }>;

/**
 * Itineraries (#12) — the passenger-facing document for a trip.
 *
 * Reads the trip it belongs to through `TripsService.visibleWhere`, exactly
 * as Receivables and Operator Payments already do, so a broker's document
 * list can never disagree with which trips they may see. Aircraft, operator,
 * tail, route and the manifest are computed from the trip on every read; only
 * the document's own content — times nothing else tracks, FBO overrides,
 * catering, photos, notes — is a column here.
 */
@Injectable()
export class ItinerariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly trips: TripsService,
  ) {}

  // ---- Scope --------------------------------------------------------------

  private visibilityScope(user: AuthenticatedUser): Prisma.ItineraryWhereInput {
    return { trip: this.trips.visibleWhere(user) };
  }

  /** An archived trip's document is read-only — the same split Notes makes
   * for an archived subject: the record can still be read, never written. */
  private assertTripLive(row: { trip: { reference: number; deletedAt: Date | null } }): void {
    if (row.trip.deletedAt) {
      throw new BadRequestException(
        `TJ-${row.trip.reference} has been archived. Restore the trip to edit this document.`,
      );
    }
  }

  // ---- Shaping --------------------------------------------------------------

  private serialise(row: ItineraryRow) {
    const { trip, exteriorImageUrl, interiorImageUrl, departureFbo, arrivalFbo, ...rest } = row;
    const legs = trip.legs;
    const first = legs[0] ?? null;
    const last = legs.length ? legs[legs.length - 1] : null;

    return {
      ...rest,
      tripId: trip.id,
      tripReference: `TJ-${trip.reference}`,
      tripStatus: trip.status,
      tripType: trip.type,
      tripArchived: trip.deletedAt !== null,
      clientId: trip.clientId,
      client: trip.client,
      assignedBrokerId: trip.assignedBrokerId,
      operatorId: trip.operatorId,
      operator: trip.operator,
      aircraftId: trip.aircraftId,
      aircraft: trip.aircraft,
      aircraftDescription: trip.aircraftDescription,
      originAirport: first?.originAirport ?? null,
      destinationAirport: last?.destinationAirport ?? null,
      departureDate: first?.departureDate ?? null,
      departureTime: first?.departureTime ?? null,
      passengers: trip.passengers,
      passengerCount: trip.passengers.length,

      /**
       * The raw override rides along beside the effective value: the edit
       * form needs to tell "using the airport/aircraft default" apart from
       * "deliberately blank", which a single merged field cannot express.
       */
      exteriorImageOverride: exteriorImageUrl,
      interiorImageOverride: interiorImageUrl,
      exteriorImageUrl: exteriorImageUrl ?? trip.aircraft?.exteriorImageUrl ?? null,
      interiorImageUrl: interiorImageUrl ?? trip.aircraft?.interiorImageUrl ?? null,

      departureFboOverride: departureFbo,
      arrivalFboOverride: arrivalFbo,
      departureFbo: departureFbo ?? first?.originAirport?.assignedFbo ?? null,
      arrivalFbo: arrivalFbo ?? last?.destinationAirport?.assignedFbo ?? null,

      confirmed: rest.status === ItineraryStatus.CONFIRMED,
    };
  }

  /** Search the trip's reference ("TJ-1048" or "1048"), client, tail and operator. */
  private searchWhere(term: string): Prisma.ItineraryWhereInput {
    const digits = term.replace(/^TJ-?/i, '');
    const reference = /^\d{1,9}$/.test(digits) ? Number(digits) : null;
    return {
      trip: {
        OR: [
          ...(reference !== null ? [{ reference }] : []),
          { client: searchAcross(term, ['firstName', 'lastName', 'companyName', 'email']) },
          { aircraft: searchAcross(term, ['tailNumber', 'model']) },
          { operator: searchAcross(term, ['name']) },
        ],
      },
    };
  }

  // ---- Reads --------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryItinerariesInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.ItineraryWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.visibilityScope(user),
        equalsAny(query, ['status', 'tripId']),
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.itinerary.findMany({
        where,
        skip,
        take,
        // Nulls last whichever way it sorts: a document for a trip with no
        // date yet must not sit at the top of a "soonest departure" list.
        orderBy:
          query.sortBy === 'departureDate'
            ? [{ trip: { departureDate: { sort: query.sortOrder, nulls: 'last' } } }, { createdAt: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: ITINERARY_SELECT,
      }),
      this.prisma.itinerary.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row)), total, query.page, query.limit);
  }

  /** Archived documents included — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.itinerary.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: ITINERARY_SELECT,
    });
    if (!row) throw new NotFoundException('Itinerary not found');
    return this.serialise(row);
  }

  /** The board tiles: total, confirmed, and the honest remainder — never a
   * fabricated "pending upload" / "awaiting confirmation" split nothing in
   * this schema actually distinguishes. */
  async stats(user: AuthenticatedUser) {
    const scope: Prisma.ItineraryWhereInput = { deletedAt: null, ...this.visibilityScope(user) };
    const [total, confirmed] = await Promise.all([
      this.prisma.itinerary.count({ where: scope }),
      this.prisma.itinerary.count({ where: { ...scope, status: ItineraryStatus.CONFIRMED } }),
    ]);
    return { total, confirmed, pending: total - confirmed };
  }

  // ---- Writes ---------------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateItineraryInput) {
    const trip = await this.trips.itineraryTarget(user, dto.tripId);

    // Unique across live *and* archived rows, the same rule Aircraft's tail
    // number and Airport's ICAO already make: a second document for one trip
    // is not a new record, it is this one, restored or edited.
    const existing = await this.prisma.itinerary.findUnique({
      where: { tripId: dto.tripId },
      select: { id: true, deletedAt: true },
    });
    if (existing) {
      throw new ConflictException(
        existing.deletedAt
          ? `TJ-${trip.reference} already has an archived itinerary. Restore it rather than building a new one.`
          : `TJ-${trip.reference} already has an itinerary. Edit it rather than building a new one.`,
      );
    }

    const { tripId, ...fields } = dto;
    const created = await this.prisma.itinerary.create({
      data: {
        tripId,
        ...fields,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'itinerary.created',
      entityType: 'Itinerary',
      entityId: created.id,
      metadata: { tripReference: trip.reference },
    });

    return this.findOne(user, created.id);
  }

  /** A live document within scope, for every write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.itinerary.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: {
        id: true,
        status: true,
        trip: { select: { reference: true, deletedAt: true } },
      },
    });
    if (!row) throw new NotFoundException('Itinerary not found');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateItineraryInput) {
    const current = await this.findLive(user, id);
    this.assertTripLive(current);

    await this.prisma.itinerary.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'itinerary.updated',
      entityType: 'Itinerary',
      entityId: id,
      metadata: { tripReference: current.trip.reference, fields: Object.keys(dto) },
    });

    return this.findOne(user, id);
  }

  /** Locks the document in. Idempotent — confirming twice is a no-op, not an error. */
  async confirm(user: AuthenticatedUser, id: string) {
    const current = await this.findLive(user, id);
    this.assertTripLive(current);
    if (current.status !== ItineraryStatus.CONFIRMED) {
      await this.prisma.itinerary.update({
        where: { id },
        data: { status: ItineraryStatus.CONFIRMED, confirmedAt: new Date(), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'itinerary.confirmed',
        entityType: 'Itinerary',
        entityId: id,
        metadata: { tripReference: current.trip.reference },
      });
    }
    return this.findOne(user, id);
  }

  /** Marks it sent to the client, the same "marks it, does not deliver" a
   * quote's Send makes — there is no Email Templates module (#21) to
   * actually deliver it yet. Re-sending after an edit updates the stamp. */
  async send(user: AuthenticatedUser, id: string) {
    const current = await this.findLive(user, id);
    this.assertTripLive(current);

    await this.prisma.itinerary.update({
      where: { id },
      data: { sentAt: new Date(), sentById: user.id, updatedById: user.id },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'itinerary.sent',
      entityType: 'Itinerary',
      entityId: id,
      metadata: { tripReference: current.trip.reference },
    });

    return this.findOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.findLive(user, id);
    await this.prisma.itinerary.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'itinerary.archived',
      entityType: 'Itinerary',
      entityId: id,
      metadata: { tripReference: current.trip.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.itinerary.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, trip: { select: { reference: true } } },
    });
    if (!row) throw new NotFoundException('Archived itinerary not found');
    await this.prisma.itinerary.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'itinerary.restored',
      entityType: 'Itinerary',
      entityId: id,
      metadata: { tripReference: row.trip.reference },
    });
    return this.findOne(user, id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.itinerary.findMany({
      where: { id: { in: ids }, deletedAt: null, ...this.visibilityScope(user) },
      select: { id: true, trip: { select: { reference: true } } },
    });
    if (targets.length) {
      await this.prisma.itinerary.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'itinerary.bulk_archived',
        entityType: 'Itinerary',
        metadata: { count: targets.length, tripReferences: targets.map((row) => row.trip.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.itinerary.findMany({
      where: { id: { in: ids }, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, trip: { select: { reference: true } } },
    });
    if (targets.length) {
      await this.prisma.itinerary.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'itinerary.bulk_restored',
        entityType: 'Itinerary',
        metadata: { count: targets.length, tripReferences: targets.map((row) => row.trip.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }
}
