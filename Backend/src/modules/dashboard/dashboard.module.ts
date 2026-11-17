import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { EmptyLegsModule } from '../empty-legs/empty-legs.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

/**
 * Dashboard (#24): reads every figure through the module that owns it.
 * The WhatsApp assistant imports this view; none of its dependencies imports it back.
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
    DocumentsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
