import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { EmptyLegsModule } from '../empty-legs/empty-legs.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

/**
 * Dashboard (#24): reads every figure through the module that owns it.
 * Nothing imports this module, so it adds no cycle.
 */
@Module({
  imports: [
    TripsModule,
    TripRequestsModule,
    ReceivablesModule,
    OperatorPaymentsModule,
    EmptyLegsModule,
    ClientsModule,
    TasksModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
