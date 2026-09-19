import { Module } from '@nestjs/common';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

/**
 * `StorageService` is not imported here: `StorageModule` is `@Global()`, so
 * the driver is resolved once at boot and injected everywhere.
 */
@Module({
  controllers: [FilesController],
  providers: [FilesService],
  // Exported because the modules that own the records these files hang off —
  // users' personal folders, an aircraft's photographs, the referral portal's
  // resources — resolve files through this service rather than querying the
  // table, so "who may open this" stays decided in one place.
  exports: [FilesService],
})
export class FilesModule {}
