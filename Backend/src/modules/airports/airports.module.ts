import { Module } from '@nestjs/common';
import { AirportsController } from './airports.controller.js';
import { AirportsService } from './airports.service.js';

@Module({
  controllers: [AirportsController],
  providers: [AirportsService],
  // Exported because trips, itineraries and sourcing will resolve airports
  // through this service rather than reaching into the table themselves.
  exports: [AirportsService],
})
export class AirportsModule {}
