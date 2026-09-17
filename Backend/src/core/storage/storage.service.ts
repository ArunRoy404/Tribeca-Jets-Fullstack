import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
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
   * Builds a collision-proof, traversal-proof key.
   *
   * The original filename is never used as the key — only its extension is
   * kept — because filenames arrive from uploads and would otherwise be a path
   * traversal vector and a collision source.
   */
  buildKey(scope: string, originalFilename: string): string {
    const ext = extname(originalFilename).slice(0, 12).toLowerCase();
    const safeScope = scope.replace(/[^a-zA-Z0-9/_-]/g, '');
    const date = new Date().toISOString().slice(0, 10);
    return `${safeScope}/${date}/${randomUUID()}${ext}`;
  }

  upload(
    key: string,
    body: Buffer | Readable,
    options?: PutObjectOptions,
  ): Promise<StoredObject> {
    return this.driver.put(key, body, options);
  }

  /** Convenience: generate a key and upload in one call. */
  async uploadFor(
    scope: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<StoredObject> {
    const key = this.buildKey(scope, file.originalname);
    return this.upload(key, file.buffer, {
      contentType: file.mimetype,
      filename: file.originalname,
    });
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
