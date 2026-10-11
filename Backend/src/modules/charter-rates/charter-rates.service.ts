import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { isAdministrator } from '../../common/authorization/permissions.js';
import { paginate } from '../../common/types/api.types.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { AircraftCategory } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AirportsService } from '../airports/airports.service.js';
import { estimateLeg, greatCircleNm } from './charter-rates.estimate.js';
import type {
  EstimateInput,
  QueryCharterRatesInput,
  SetCharterRateInput,
} from './dto/charter-rate.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true },
} satisfies Prisma.UserDefaultArgs;

const RATE_SELECT = {
  id: true,
  category: true,
  hourlyRate: true,
  averageSpeedKnots: true,
  typicalSeats: true,
  minimumHours: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.CharterRateSelect;

type RateRow = Prisma.CharterRateGetPayload<{ select: typeof RATE_SELECT }>;

/** Every category, in the order the Add Aircraft form lists them. */
const CATEGORIES = Object.values(AircraftCategory);

const toNumber = (value: Prisma.Decimal | number | null) =>
  value === null ? null : Number(value);

/**
 * The desk's charter rates and the instant estimate built on them — client
 * adjustment #6. Part of Quotes: it has no screen or permission of its own.
 *
 * **Reading the rates and running an estimate need Quotes · View money**
 * (the routes check it): a rate per flight hour is what the desk expects to
 * *pay*, which is margin information. **Changing a rate is for an
 * administrator** (SUPER_ADMIN or ADMIN by stored role — owner's decision,
 * 8 Oct 2026): it is one company-wide number every estimate is built on.
 */
@Injectable()
export class CharterRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly airports: AirportsService,
  ) {}

  /**
   * One row per aircraft category, always — including categories nobody has
   * priced yet, which come back with every figure null. A table that lists
   * only the priced categories hides the fact that the others have no rate,
   * and "no rate on file" is exactly what the desk needs to see.
   */
  async findAll(query: QueryCharterRatesInput) {
    const rows = await this.prisma.charterRate.findMany({ select: RATE_SELECT });
    const byCategory = new Map(rows.map((row) => [row.category, row]));
    const all = CATEGORIES.map((category) => this.serialise(category, byCategory.get(category)));

    const start = (query.page - 1) * query.limit;
    return paginate(all.slice(start, start + query.limit), all.length, query.page, query.limit);
  }

  async set(user: AuthenticatedUser, category: AircraftCategory, dto: SetCharterRateInput) {
    if (!isAdministrator(user.role)) {
      throw new ForbiddenException('Charter rates are company-wide; only an administrator can change them.');
    }

    const before = await this.prisma.charterRate.findUnique({
      where: { category },
      select: RATE_SELECT,
    });

    const row = await this.prisma.charterRate.upsert({
      where: { category },
      create: { category, ...dto, createdById: user.id, updatedById: user.id },
      update: { ...dto, updatedById: user.id },
      select: RATE_SELECT,
    });

    // Before and after, because this row is overwritten in place — the audit
    // log is where "what rate did we estimate that trip on?" gets answered.
    await this.audit.record({
      actorId: user.id,
      action: 'charter_rate.set',
      entityType: 'CharterRate',
      entityId: row.id,
      metadata: {
        category,
        before: before ? this.figures(before) : null,
        after: this.figures(row),
      },
    });

    return this.serialise(category, row);
  }

  /**
   * The instant estimate: the route's great-circle distance, then for every
   * category the flight time, billed hours and cost from the desk's rates.
   *
   * A category with no rate is still listed, with `estimate: null` — the
   * screen shows "No rate on file" there rather than dropping the row or
   * printing $0. `fitsParty` is null when either the party size or the
   * category's seats is unknown, for the same reason.
   */
  async estimate(input: EstimateInput) {
    // Live airports only — an archived one is refused by name.
    const [origin, destination] = await Promise.all([
      this.airports.usable(input.originAirportId, 'origin'),
      this.airports.usable(input.destinationAirportId, 'destination'),
    ]);

    if (
      origin.latitude === null || origin.longitude === null ||
      destination.latitude === null || destination.longitude === null
    ) {
      throw new BadRequestException(
        `No coordinates on file for ${origin.latitude === null || origin.longitude === null ? origin.icao : destination.icao}. Add them on the Airports screen to estimate this route.`,
      );
    }

    const distanceNm = greatCircleNm(
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude },
    );
    const legs = input.roundTrip ? 2 : 1;

    const rates = await this.prisma.charterRate.findMany({ select: RATE_SELECT });
    const byCategory = new Map(rates.map((row) => [row.category, row]));

    const options = CATEGORIES.map((category) => {
      const rate = this.serialise(category, byCategory.get(category));
      const leg = estimateLeg(distanceNm, rate);
      return {
        category,
        hourlyRate: rate.hourlyRate,
        averageSpeedKnots: rate.averageSpeedKnots,
        typicalSeats: rate.typicalSeats,
        minimumHours: rate.minimumHours,
        fitsParty:
          input.passengers === undefined || rate.typicalSeats === null
            ? null
            : rate.typicalSeats >= input.passengers,
        estimate: leg
          ? {
              flightHoursPerLeg: leg.flightHours,
              billedHoursPerLeg: leg.billedHours,
              totalBilledHours: Math.round(leg.billedHours * legs * 10) / 10,
              estimatedCost: Math.round(leg.cost * legs * 100) / 100,
            }
          : null,
      };
    });

    return {
      origin: { id: origin.id, icao: origin.icao, name: origin.name },
      destination: { id: destination.id, icao: destination.icao, name: destination.name },
      distanceNm,
      legs,
      passengers: input.passengers ?? null,
      options,
    };
  }

  private figures(row: RateRow) {
    return {
      hourlyRate: toNumber(row.hourlyRate),
      averageSpeedKnots: row.averageSpeedKnots,
      typicalSeats: row.typicalSeats,
      minimumHours: toNumber(row.minimumHours),
    };
  }

  private serialise(category: AircraftCategory, row: RateRow | undefined | null) {
    return {
      category,
      id: row?.id ?? null,
      hourlyRate: row ? toNumber(row.hourlyRate) : null,
      averageSpeedKnots: row?.averageSpeedKnots ?? null,
      typicalSeats: row?.typicalSeats ?? null,
      minimumHours: row ? toNumber(row.minimumHours) : null,
      notes: row?.notes ?? null,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  }
}
