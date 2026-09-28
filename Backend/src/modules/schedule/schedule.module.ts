import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

/**
 * A view over trip legs, reading them through `TripsService`. Nothing imports
 * this module, so it adds no cycle.
 */
@Module({
  imports: [TripsModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
})
export class ScheduleModule {}
