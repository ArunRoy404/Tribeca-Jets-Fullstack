import { Module } from '@nestjs/common';
import { AircraftModule } from '../aircraft/aircraft.module.js';
import { OperatorsController } from './operators.controller.js';
import { OperatorsService } from './operators.service.js';

@Module({
  // Aircraft, not the other way round: the fleet belongs to the aircraft
  // module and the operator detail page borrows it. AircraftService does not
  // inject OperatorsService, so this stays a one-way edge rather than a cycle.
  imports: [AircraftModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
  // Exported because sourcing, quotes and operator payments all resolve
  // operators through this service rather than querying the table.
  exports: [OperatorsService],
})
export class OperatorsModule {}
