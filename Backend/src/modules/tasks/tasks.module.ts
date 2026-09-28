import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';

/**
 * Checks a task's client and trip through their own services. Only the
 * dashboard imports this module, so it adds no cycle.
 */
@Module({
  imports: [ClientsModule, TripsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
