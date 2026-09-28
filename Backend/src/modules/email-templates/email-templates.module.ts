import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { OperatorsModule } from '../operators/operators.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { QuotesModule } from '../quotes/quotes.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { EmailTemplatesController } from './email-templates.controller.js';
import { EmailsController } from './emails.controller.js';
import { EmailTemplatesService } from './email-templates.service.js';
import { EmailsService } from './emails.service.js';

/**
 * Email Templates (#21): the library, and sending from it. Reads every
 * record an email names through the module that owns it. Nothing imports
 * this module, so it adds no cycle.
 */
@Module({
  imports: [ClientsModule, OperatorsModule, TripsModule, QuotesModule, ReceivablesModule],
  controllers: [EmailTemplatesController, EmailsController],
  providers: [EmailTemplatesService, EmailsService],
})
export class EmailTemplatesModule {}
