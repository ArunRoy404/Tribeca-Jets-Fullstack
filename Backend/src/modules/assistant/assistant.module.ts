import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [ClientsModule, TripsModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
