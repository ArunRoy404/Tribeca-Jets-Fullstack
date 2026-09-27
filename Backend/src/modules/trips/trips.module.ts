import { Module } from '@nestjs/common';
import { QuotesModule } from '../quotes/quotes.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

/**
 * Reads quotes and converts requests through their own services. Exported for
 * the second pass: notes (a trip timeline), client credits (the trip a credit
 * was used towards), and the trip counts on clients, operators and aircraft.
 *
 * One direction only — this module imports nothing that imports it, so the
 * dependants can import it without a cycle.
 */
@Module({
  imports: [QuotesModule, TripRequestsModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
