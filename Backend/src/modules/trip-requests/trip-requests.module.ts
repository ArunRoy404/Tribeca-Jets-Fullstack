import { Module } from '@nestjs/common';
import { TripRequestsController } from './trip-requests.controller.js';
import { TripRequestsService } from './trip-requests.service.js';

@Module({
  controllers: [TripRequestsController],
  providers: [TripRequestsService],
  // Exported because the Leads screen and the client detail page both read a
  // client's enquiries through this service rather than querying the table.
  exports: [TripRequestsService],
})
export class TripRequestsModule {}
