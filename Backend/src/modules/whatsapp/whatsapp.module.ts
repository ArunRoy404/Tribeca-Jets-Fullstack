import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { AirportsModule } from '../airports/airports.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { ItinerariesModule } from '../itineraries/itineraries.module.js';
import { NotesModule } from '../notes/notes.module.js';
import { QuotesModule } from '../quotes/quotes.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { WhatsappActions } from './whatsapp.actions.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { WhatsappAgent } from './whatsapp.agent.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappPending } from './whatsapp.pending.js';
import { WhatsappTools } from './whatsapp.tools.js';
import { whatsappAiClientProvider } from './whatsapp.ai-client.js';

@Module({
  imports: [AirportsModule, AuthModule, ClientsModule, DashboardModule, ItinerariesModule, NotesModule, QuotesModule, ReceivablesModule, ScheduleModule, TasksModule, TripRequestsModule, TripsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappSender, WhatsappAgent, WhatsappMemory, WhatsappPending, WhatsappActions, WhatsappTools, whatsappAiClientProvider],
})
export class WhatsappModule {}
