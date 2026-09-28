import { Module } from '@nestjs/common';
import { AircraftController } from './aircraft.controller.js';
import { AircraftService } from './aircraft.service.js';
import { TripsModule } from '../trips/trips.module.js';

@Module({
  // Trip counts on every tail come from the trips service (#11's second pass).
  imports: [TripsModule],
  controllers: [AircraftController],
  providers: [AircraftService],
  // Exported because quotes, trips, empty legs and flight tracking all resolve
  // aircraft through this service rather than querying the table.
  exports: [AircraftService],
})
export class AircraftModule {}
