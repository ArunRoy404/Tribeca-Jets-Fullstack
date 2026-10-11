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
    // Legitimate on a VPS with a persistent volume, fatal on a container whose
    // disk is replaced on every deploy — so said loudly at boot, where whoever
    // deploys will see it, rather than discovered when a file 404s.
    if (driver.name === 'local' && config.isProduction) {
      logger.warn(
        `Production is storing uploads on local disk (${config.storage.localPath}). ` +
          'This is only safe on a persistent volume; set the S3_* variables to use Cloudflare R2.',
      );
    }
    return driver;
  },
};

@Global()
@Module({
  providers: [storageDriverProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
