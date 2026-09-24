import { Module } from '@nestjs/common';
import { ClientCreditsController } from './client-credits.controller.js';
import { ClientCreditsService } from './client-credits.service.js';
import { ClientsModule } from '../clients/clients.module.js';

/**
 * One direction only: credits know about clients, clients know nothing about
 * credits. The balance is read from the client profile by calling this module
 * rather than the clients service growing a `credits` relation — which is what
 * keeps the client detail select from having to learn how money is summed.
 */
@Module({
  imports: [ClientsModule],
  controllers: [ClientCreditsController],
  providers: [ClientCreditsService],
  exports: [ClientCreditsService],
})
export class ClientCreditsModule {}
