import { Module } from '@nestjs/common';
import { TripRequestsController } from './trip-requests.controller.js';
import { TripRequestsService } from './trip-requests.service.js';
import { OperatorQuotesModule } from '../operator-quotes/operator-quotes.module.js';

@Module({
  // The board's sourcing counts are computed by the operator-quotes service
  // rather than queried out of its table here. One direction only: sourcing
  // knows nothing about this module.
  imports: [OperatorQuotesModule],
  controllers: [TripRequestsController],
  providers: [TripRequestsService],
  // Exported because the Leads screen and the client detail page both read a
  // client's enquiries through this service rather than querying the table.
  exports: [TripRequestsService],
})
export class TripRequestsModule {}
