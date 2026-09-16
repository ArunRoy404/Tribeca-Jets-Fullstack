import { Module } from '@nestjs/common';
import { AircraftController } from './aircraft.controller.js';
import { AircraftService } from './aircraft.service.js';

@Module({
  controllers: [AircraftController],
  providers: [AircraftService],
  // Exported because quotes, trips, empty legs and flight tracking all resolve
  // aircraft through this service rather than querying the table.
  exports: [AircraftService],
})
export class AircraftModule {}
