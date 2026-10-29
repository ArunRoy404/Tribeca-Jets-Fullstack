import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { ClientPortalController } from './client-portal.controller.js';
import { ClientPortalService } from './client-portal.service.js';

@Module({
  imports: [ClientsModule, UploadsModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}
