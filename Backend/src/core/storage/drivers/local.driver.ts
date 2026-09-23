import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  PutObjectOptions,
  StorageDriver,
  StoredObject,
} from '../storage.interface.js';
import { AppConfigService } from '../../../config/config.service.js';

/**
 * Filesystem driver — the fallback when no cloud credentials are configured.
 * Files land under STORAGE_LOCAL_PATH on the VPS.
 *
 * Operationally this means the documents directory is part of the backup
 * surface: a Postgres dump alone will not restore the document vault.
 */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local' as const;
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly root: string;

  constructor(private readonly config: AppConfigService) {
    this.root = resolve(this.config.storage.localPath);
    this.logger.log(`Local storage root: ${this.root}`);
  }

  /**
   * Resolves a key to an absolute path, refusing anything that escapes the
   * storage root. Keys can originate from user-influenced filenames, so
   * `../../etc/passwd` must never resolve outside `root`.
   */
  private resolveKey(key: string): string {
    const full = resolve(join(this.root, normalize(key)));
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }

  async put(
    key: string,
    body: Buffer | Readable,
    options?: PutObjectOptions,
  ): Promise<StoredObject> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    const { size } = await stat(path);

    return {
      key,
      size,
      contentType: options?.contentType ?? 'application/octet-stream',
    };
  }

  async get(key: string): Promise<Readable> {
    const path = this.resolveKey(key);
    if (!(await this.exists(key))) {
      throw new NotFoundException(`File not found: ${key}`);
    }
    return createReadStream(path);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolveKey(key));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Local disk has nothing to presign, and no key-addressed public route.
   *
   * Files are addressed by their upload id — `GET /api/uploads/:id` — which is
   * re-authorised on every fetch rather than frozen into a signature that keeps
   * working after access is revoked. There is deliberately no second way in by
   * raw storage key: a key is a path, and a path is not a permission.
   *
   * This throws rather than returning a URL to a route that does not exist,
   * because a silent 404 on every avatar is the kind of failure nobody
   * investigates. The one caller left is `avatarKey`, which no code writes and
   * which no row has set; when avatars are built they will store an
   * `/api/uploads/:id` URL like every other file, and this method will have no
   * callers at all.
   *
   * S3 still presigns properly — that is a real capability and it is untouched.
   */
  getSignedUrl(key: string): Promise<string> {
    return Promise.reject(
      new Error(
        `Local storage cannot presign "${key}". Files are served by upload id at ` +
          `GET /api/uploads/:id; store that URL rather than a storage key.`,
      ),
    );
  }
}
