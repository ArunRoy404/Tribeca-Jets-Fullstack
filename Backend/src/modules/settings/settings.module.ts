import { Global, Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module.js';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

/**
 * Global, because a setting is read by the module it governs — Auth today,
 * Quotes, Clients and the rest as each is reviewed.
 */
@Global()
@Module({
  imports: [UploadsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
