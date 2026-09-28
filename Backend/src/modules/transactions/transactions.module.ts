import { Module } from '@nestjs/common';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { CommissionsModule } from '../commissions/commissions.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

/**
 * A view over the three money modules, reading each through its own service.
 * Nothing imports this module, so it adds no cycle.
 */
@Module({
  imports: [ReceivablesModule, OperatorPaymentsModule, CommissionsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
