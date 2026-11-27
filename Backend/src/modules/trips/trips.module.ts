import { Module, forwardRef } from '@nestjs/common';
import { AirportsModule } from '../airports/airports.module.js';
import { QuotesModule } from '../quotes/quotes.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { MailModule } from '../../core/mail/mail.module.js';
import { TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

/**
 * Quotes reads the client lifecycle through its owner. The existing
 * Clients → Trips → Quotes reader cycle is deferred with forwardRef;
 * commissions completion stays a transaction function, without a DI edge.
 */
@Module({
  imports: [AirportsModule, forwardRef(() => QuotesModule), TripRequestsModule, MailModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
