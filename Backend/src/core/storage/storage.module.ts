import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { AppConfigService } from '../../config/config.service.js';
import { STORAGE_DRIVER, type StorageDriver } from './storage.interface.js';
import { LocalStorageDriver } from './drivers/local.driver.js';
import { S3StorageDriver } from './drivers/s3.driver.js';
import { StorageService } from './storage.service.js';

/**
 * Selects the storage backend once, at boot.
 *
 * `STORAGE_DRIVER=auto` (the default) uses S3 when a full credential set is
 * present and local disk otherwise — so the same build runs unchanged on a
 * bare VPS and on a VPS with R2 attached.
 */
const storageDriverProvider: Provider = {
  provide: STORAGE_DRIVER,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): StorageDriver => {
    const logger = new Logger('StorageModule');
    const driver =
      config.storage.driver === 's3'
        ? new S3StorageDriver(config)
        : new LocalStorageDriver(config);

    logger.log(`Storage driver resolved: ${driver.name}`);
    return driver;
  },
};

@Global()
@Module({
  providers: [storageDriverProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
