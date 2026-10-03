import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { OperatorsModule } from '../operators/operators.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

/**
 * Document Vault (#22): reads each folder's owner through its own module,
 * and each file through Uploads. Only the dashboard imports this module —
 * for expiring documents — so it adds no cycle.
 */
@Module({
  imports: [ClientsModule, TripsModule, OperatorsModule, UploadsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
