import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { AirportsController } from './airports.controller.js';
import { AirportsService } from './airports.service.js';

@Module({
  // Trips for the detail's "trips through here" count, read through the
  // trips module rather than a query into its tables. One direction only:
  // nothing Trips imports imports this module.
  imports: [TripsModule],
  controllers: [AirportsController],
  providers: [AirportsService],
  // Exported because trips, itineraries and sourcing will resolve airports
  // through this service rather than reaching into the table themselves.
  exports: [AirportsService],
})
export class AirportsModule {}
