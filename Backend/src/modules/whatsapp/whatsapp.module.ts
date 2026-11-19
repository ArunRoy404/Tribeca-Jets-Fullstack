import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller.js';
import { WhatsappService } from './whatsapp.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { DashboardModule } from '../dashboard/dashboard.module.js';
import { ScheduleModule } from '../schedule/schedule.module.js';
import { WhatsappSender } from './whatsapp.sender.js';
import { WhatsappAgent } from './whatsapp.agent.js';
import { WhatsappMemory } from './whatsapp.memory.js';
import { WhatsappTools } from './whatsapp.tools.js';
import { whatsappAiClientProvider } from './whatsapp.ai-client.js';

@Module({
  imports: [AuthModule, ClientsModule, DashboardModule, ScheduleModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappSender, WhatsappAgent, WhatsappMemory, WhatsappTools, whatsappAiClientProvider],
})
export class WhatsappModule {}
