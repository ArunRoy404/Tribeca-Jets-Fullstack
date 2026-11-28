import { Module, forwardRef } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { TripRequestsController } from './trip-requests.controller.js';
import { TripRequestsService } from './trip-requests.service.js';
import { OperatorQuotesModule } from '../operator-quotes/operator-quotes.module.js';
import { AirportsModule } from '../airports/airports.module.js';

@Module({
  imports: [OperatorQuotesModule, AirportsModule, forwardRef(() => TripsModule)],
  controllers: [TripRequestsController],
  providers: [TripRequestsService],
  // Exported because the Leads screen and the client detail page both read a
  // client's enquiries through this service rather than querying the table.
  exports: [TripRequestsService],
})
export class TripRequestsModule {}
