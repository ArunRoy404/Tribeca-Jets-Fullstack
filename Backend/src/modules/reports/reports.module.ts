import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

/**
 * Reports (#23): reads every figure through the module that owns it.
 * Exported for the WhatsApp financial summary.
 */
@Module({
  imports: [TripsModule, ReceivablesModule, OperatorPaymentsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
