import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { FlightTrackingController } from './flight-tracking.controller.js';
import { FlightTrackingService } from './flight-tracking.service.js';

/**
 * Flights read and reported through `TripsService`, which owns the legs.
 * The WhatsApp assistant reads flight status through this service.
 */
@Module({
  imports: [TripsModule],
  controllers: [FlightTrackingController],
  providers: [FlightTrackingService],
  exports: [FlightTrackingService],
})
export class FlightTrackingModule {}
