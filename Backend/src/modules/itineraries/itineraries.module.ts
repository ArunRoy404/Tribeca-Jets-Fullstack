import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { ItinerariesController } from './itineraries.controller.js';
import { ItinerariesService } from './itineraries.service.js';

/**
 * Reads the trip it belongs to through `TripsService`, and opens operator
 * itinerary attachments via `UploadsService.openVouched()`.
 */
@Module({
  imports: [TripsModule, UploadsModule],
  controllers: [ItinerariesController],
  providers: [ItinerariesService],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}

