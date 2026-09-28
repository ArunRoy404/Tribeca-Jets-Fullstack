import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { FlightTrackingController } from './flight-tracking.controller.js';
import { FlightTrackingService } from './flight-tracking.service.js';

/**
 * Flights read and reported through `TripsService`, which owns the legs.
 * Nothing imports this module, so it adds no cycle.
 */
@Module({
  imports: [TripsModule],
  controllers: [FlightTrackingController],
  providers: [FlightTrackingService],
})
export class FlightTrackingModule {}
