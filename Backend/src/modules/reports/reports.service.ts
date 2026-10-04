import { Injectable } from '@nestjs/common';
import { paginate, type AuthenticatedUser } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { todayUtc } from '../../common/money/settlement.js';
import {
  EXPORT_CONTENT_TYPES,
  EXPORT_EXTENSIONS,
  toFile,
  type Column,
} from '../../common/export/tabular.js';
import { TripsService } from '../trips/trips.service.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { OperatorPaymentsService } from '../operator-payments/operator-payments.service.js';
import { tallyTrips } from '../trips/trips.figures.js';
import { bucketSpan, isoDay, rankBy, seriesBuckets, tallyByBucket, windowFromDays } from './reports.window.js';
import type {
  ReportExportInput,
  ReportRankingInput,
  ReportSeriesInput,
  ReportWindowInput,
} from './dto/reports.dto.js';

type ReportTrip = Awaited<ReturnType<TripsService['reportRows']>>[number];

const personName = (person: { firstName: string; lastName: string } | null) =>
  person ? `${person.firstName} ${person.lastName}`.trim() : null;

const clientName = (client: ReportTrip['client']) =>
  `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim() || client.companyName || null;

const airportCode = (airport: { icao: string; iata: string | null }) => airport.icao || airport.iata || '';

/** The figures every ranking row and the summary carry, named for the screen. */
const money = (tally: ReturnType<typeof tallyTrips>) => ({
  tripCount: tally.tripCount,
  pricedCount: tally.pricedCount,
  revenue: tally.revenue,
  profit: tally.profit,
  profitTripCount: tally.profitTripCount,
  marginPercentage: tally.marginPercentage,
});

/**
 * Reports (#23). Stores nothing and prices nothing: every trip is read
 * through Trips with its own computed figures, every payment through
 * Receivables and every bill through Operator Payments, each in the caller's
 * scope. Which date each figure counts by is set out in `reports.window.ts`.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly trips: TripsService,
    private readonly receivables: ReceivablesService,
    private readonly operatorPayments: OperatorPaymentsService,
  ) {}

  /** The tiles and the financial summary for the window. */
  async summary(user: AuthenticatedUser, query: ReportWindowInput) {
    const window = windowFromDays(query.from, query.to);
    const [trips, collected, receivables, payables, allTime] = await Promise.all([
      this.trips.reportRows(user, window),
      this.receivables.collectedBetween(user, window.from, window.to),
      this.receivables.stats(user, {}),
      this.operatorPayments.stats(user, {}),
      this.trips.reportCount(user),
    ]);
    const tally = tallyTrips(trips.map((trip) => trip.figures));

    return {
      from: isoDay(query.from),
      to: isoDay(query.to),
      /** By departure date: booked and flown trips leaving in the window. */
      ...money(tally),
      /** FET charged on those same trips. */
      fetCharged: tally.fet,
      /** Null with nothing to divide — never a zero average. */
      averageRevenue: tally.pricedCount ? Math.round((tally.revenue / tally.pricedCount) * 100) / 100 : null,
      averageProfit: tally.profitTripCount
        ? Math.round((tally.profit / tally.profitTripCount) * 100) / 100
        : null,
      /** By payment date: money that arrived in the window, and the FET inside it. */
      collected,
      /** As they stand today, whatever the window. */
      outstanding: { receivables: receivables.outstanding, payables: payables.outstanding },
      /** For the export dialog: operations in this window, and on record in all. */
      operations: { window: tally.tripCount, allTime },
    };
  }

  /** The two charts: revenue, profit and trips per week, month or year. */
  async series(user: AuthenticatedUser, query: ReportSeriesInput) {
    const buckets = seriesBuckets(query.bucket, query.on ?? todayUtc());
    const trips = await this.trips.reportRows(user, bucketSpan(buckets));
    return {
      bucket: query.bucket,
      points: tallyByBucket(buckets, trips).map(({ start, ...tally }) => ({ start, ...money(tally) })),
    };
  }

  async brokers(user: AuthenticatedUser, query: ReportRankingInput) {
    const trips = await this.trips.reportRows(user, windowFromDays(query.from, query.to));
    const ranked = rankBy(
      trips,
      (trip) => trip.assignedBroker?.id ?? '',
      // Null is a trip nobody is assigned — shown as such, never credited to anyone.
      (trip) => trip.assignedBroker,
    ).map((row) => ({ broker: row.subject, ...money(row) }));
    return this.page(ranked, query);
  }

  async clients(user: AuthenticatedUser, query: ReportRankingInput) {
    const trips = await this.trips.reportRows(user, windowFromDays(query.from, query.to));
    const ranked = rankBy(
      trips,
      (trip) => trip.client.id,
      (trip) => trip.client,
    ).map((row) => ({ client: row.subject, ...money(row) }));
    return this.page(ranked, query);
  }

  async routes(user: AuthenticatedUser, query: ReportRankingInput) {
    const trips = await this.trips.reportRows(user, windowFromDays(query.from, query.to));
    const ranked = rankBy(
      trips.filter((trip) => trip.route !== null),
      (trip) => `${trip.route!.origin.id}>${trip.route!.destination.id}`,
      (trip) => trip.route!,
    ).map((row) => ({ origin: row.subject.origin, destination: row.subject.destination, ...money(row) }));
    return this.page(ranked, query);
  }

  private page<T>(rows: T[], query: ReportRankingInput) {
    const { skip, take } = toPrismaPagination(query);
    return paginate(rows.slice(skip, skip + take), rows.length, query.page, query.limit);
  }

  /** Every operation in the window — or on record — as a CSV or Excel file. */
  async export(user: AuthenticatedUser, query: ReportExportInput) {
    const window = query.from && query.to ? windowFromDays(query.from, query.to) : null;
    const trips = await this.trips.reportRows(user, window);
    const body = await toFile(query.format, OPERATION_COLUMNS, trips, 'Operations');
    const span = query.from && query.to ? `${isoDay(query.from)}-to-${isoDay(query.to)}` : 'all';
    return {
      body,
      contentType: EXPORT_CONTENT_TYPES[query.format],
      filename: `tribeca-operations-${span}.${EXPORT_EXTENSIONS[query.format]}`,
    };
  }
}

const MONEY_FORMAT = '#,##0.00';

/** One row per trip, the figures each trip's own. Blank where a figure is unknown — never zero. */
const OPERATION_COLUMNS: Column<ReportTrip>[] = [
  { header: 'Trip', value: (trip) => `TJ-${trip.reference}`, width: 10 },
  { header: 'Departure', value: (trip) => (trip.departureDate ? isoDay(trip.departureDate) : null), width: 12 },
  { header: 'Status', value: (trip) => trip.status },
  { header: 'Client', value: (trip) => clientName(trip.client), width: 24 },
  { header: 'Broker', value: (trip) => personName(trip.assignedBroker), width: 20 },
  {
    header: 'Route',
    value: (trip) =>
      trip.route ? `${airportCode(trip.route.origin)} - ${airportCode(trip.route.destination)}` : null,
    width: 14,
  },
  {
    header: 'Aircraft',
    value: (trip) =>
      trip.aircraft ? `${trip.aircraft.tailNumber} (${trip.aircraft.model})` : trip.aircraftDescription,
    width: 24,
  },
  { header: 'Operator', value: (trip) => trip.operator?.name ?? null, width: 22 },
  { header: 'Revenue', value: (trip) => trip.figures?.totalPrice ?? null, numberFormat: MONEY_FORMAT },
  { header: 'FET', value: (trip) => trip.figures?.fetAmount ?? null, numberFormat: MONEY_FORMAT },
  { header: 'Operator Cost', value: (trip) => trip.figures?.operatorCost ?? null, numberFormat: MONEY_FORMAT },
  { header: 'Profit', value: (trip) => trip.figures?.grossProfit ?? null, numberFormat: MONEY_FORMAT },
  { header: 'Margin %', value: (trip) => trip.figures?.marginPercentage ?? null, numberFormat: '0.0' },
];
