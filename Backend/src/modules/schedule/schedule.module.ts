import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

/**
 * A view over trip legs, reading them through `TripsService`. WhatsApp imports
 * this view; none of its dependencies imports it back.
 */
@Module({
  imports: [TripsModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
