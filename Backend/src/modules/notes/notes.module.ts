import { Module } from '@nestjs/common';
import { NotesController } from './notes.controller.js';
import { NotesService } from './notes.service.js';
import { NoteSubjectsService } from './notes.subjects.js';
import { ClientsModule } from '../clients/clients.module.js';

/**
 * One direction only: notes know about clients, clients know nothing about
 * notes. The timeline is read from the client detail page by calling this
 * module, not by the clients service growing a `notes` relation — which is
 * what keeps adding Trips to the enum from touching either module.
 */
@Module({
  imports: [ClientsModule],
  controllers: [NotesController],
  providers: [NotesService, NoteSubjectsService],
  exports: [NotesService],
})
export class NotesModule {}
