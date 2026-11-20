import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { AircraftModule } from '../aircraft/aircraft.module.js';
import { AirportsModule } from '../airports/airports.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClientCreditsModule } from '../client-credits/client-credits.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { CommissionsModule } from '../commissions/commissions.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { EmptyLegsModule } from '../empty-legs/empty-legs.module.js';
import { FlightTrackingModule } from '../flight-tracking/flight-tracking.module.js';
import { ItinerariesModule } from '../itineraries/itineraries.module.js';
import { NotesModule } from '../notes/notes.module.js';
import { OperatorPaymentsModule } from '../operator-payments/operator-payments.module.js';
import { OperatorsModule } from '../operators/operators.module.js';
import { QuotesModule } from '../quotes/quotes.module.js';
import { ReceivablesModule } from '../receivables/receivables.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { TasksModule } from '../tasks/tasks.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { TripRequestsModule } from '../trip-requests/trip-requests.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { UsersModule } from '../users/users.module.js';
import { WhatsappActions } from './whatsapp.actions.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { WhatsappAgent } from './whatsapp.agent.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappPending } from './whatsapp.pending.js';
import { WhatsappTools } from './whatsapp.tools.js';
import { whatsappAiClientProvider } from './whatsapp.ai-client.js';
import { SecretBox } from '../../common/crypto/secret-box.js';
import { WhatsappPhoneService } from './whatsapp-phone.service.js';
import { WhatsappSettingsController } from './whatsapp-settings.controller.js';
import { WhatsappSettingsService } from './whatsapp-settings.service.js';
import { WhatsappConnectionsService } from './whatsapp-connections.service.js';
import { WhatsappHistoryService } from './whatsapp-history.service.js';

@Module({
  imports: [
    AircraftModule, AirportsModule, AuthModule, ClientCreditsModule, ClientsModule, CommissionsModule, DashboardModule,
    EmptyLegsModule, FlightTrackingModule, ItinerariesModule, NotesModule, OperatorPaymentsModule, OperatorsModule,
    QuotesModule, ReceivablesModule, ReportsModule, ScheduleModule, TasksModule, TransactionsModule, TripRequestsModule,
    TripsModule, UsersModule,
  ],
  controllers: [WhatsappController, WhatsappSettingsController],
  providers: [
    WhatsappService, WhatsappSender, WhatsappAgent, WhatsappMemory, WhatsappPending, WhatsappActions,
    WhatsappTools, whatsappAiClientProvider, SecretBox, WhatsappSettingsService, WhatsappPhoneService,
    WhatsappConnectionsService, WhatsappHistoryService,
  ],
  exports: [WhatsappSettingsService],
})
export class WhatsappModule {}
