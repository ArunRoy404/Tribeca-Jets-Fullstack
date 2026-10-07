import type { Readable } from 'node:stream';
import { Inject, Injectable } from '@nestjs/common';
import {
  STORAGE_DRIVER,
  type PutObjectOptions,
  type StorageDriver,
  type StoredObject,
} from './storage.interface.js';

/**
 * The only storage entry point feature modules should use.
 *
 * Which backend is active (S3 or local disk) is decided once at boot from env
 * and is invisible here — callers never branch on it.
 */
@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
  ) {}

  /** Which backend is active. Useful for health checks and diagnostics. */
  get driverName() {
    return this.driver.name;
  }

  /**
   * Writes bytes at `key`. Uploads build the key from the content hash
   * (`UploadsService.keyFor`) — the one way a file enters storage.
   */
  upload(
    key: string,
    body: Buffer | Readable,
    options?: PutObjectOptions,
  ): Promise<StoredObject> {
    return this.driver.put(key, body, options);
  }

  download(key: string): Promise<Readable> {
    return this.driver.get(key);
  }

  remove(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  /** Time-limited URL. Default 15 minutes. */
  signedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return this.driver.getSignedUrl(key, expiresInSeconds);
  }

  /** Resolves a nullable key to a nullable URL — the common case for avatars. */
  async signedUrlOrNull(
    key: string | null | undefined,
    expiresInSeconds = 900,
  ): Promise<string | null> {
    if (!key) return null;
    return this.signedUrl(key, expiresInSeconds);
  }
}
