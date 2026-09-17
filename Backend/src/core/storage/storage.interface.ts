import type { Readable } from 'node:stream';

export interface StoredObject {
  /** Opaque storage key. Persist this, never a URL — URLs are driver-specific. */
  key: string;
  size: number;
  contentType: string;
}

export interface PutObjectOptions {
  contentType?: string;
  /** Original filename, preserved for download responses. */
  filename?: string;
}

/**
 * Contract every storage backend implements.
 *
 * Feature code depends on this interface only, so moving the client's document
 * vault from the VPS disk to S3/R2 is an env change, not a code change.
 */
export interface StorageDriver {
  readonly name: 's3' | 'local';

  put(
    key: string,
    body: Buffer | Readable,
    options?: PutObjectOptions,
  ): Promise<StoredObject>;

  get(key: string): Promise<Readable>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;

  /**
   * A URL the browser can use to fetch the object.
   *
   * S3 returns a presigned, expiring URL. Local returns a path served by the
   * API behind the normal auth guards. Both are time-limited by design:
   * passports and IDs must never sit behind a permanent public URL.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
