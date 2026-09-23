import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { StorageService } from '../../core/storage/storage.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { sniffContentType } from '../../common/files/file-signature.js';
import { archiveData, restoreData } from '../../common/database/archive.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UploadKind } from '../../generated/prisma/enums.js';
import { formatBytes, ruleFor } from './uploads.rules.js';

/** The multipart part multer hands us, narrowed to what is actually read. */
export interface IncomingFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Columns returned to a caller.
 *
 * `storageKey` is absent deliberately: it is the path on disk or in the bucket,
 * and a caller that knows it can construct requests the object route was meant
 * to mediate. The public address of a file is its `/api/uploads/:id` URL.
 */
const UPLOAD_SELECT = {
  id: true,
  filename: true,
  contentType: true,
  kind: true,
  size: true,
  createdAt: true,
} as const;

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** The address a form stores. Relative — see `uploadResponseSchema.url`. */
  private static urlFor(id: string): string {
    return `/api/uploads/${id}`;
  }

  private shape(row: {
    id: string;
    filename: string;
    contentType: string;
    kind: UploadKind;
    size: number;
    createdAt: Date;
  }, deduplicated: boolean) {
    return {
      id: row.id,
      url: UploadsService.urlFor(row.id),
      filename: row.filename,
      contentType: row.contentType,
      size: row.size,
      kind: row.kind,
      deduplicated,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Decides what the bytes actually are, and refuses them if this route does
   * not take that kind of file.
   *
   * The multipart `Content-Type` is chosen by whoever sent the file. Believing
   * it means an attacker picks what the download route later hands a browser —
   * `text/html` served from the API's own origin, with the session cookie
   * attached. So the header settles exactly one question, which the sniffer
   * cannot: whether text is `text/plain` or `text/csv`. Those are the same
   * bytes and differ only in what the sender meant by them.
   */
  private resolveContentType(file: IncomingFile, kind: UploadKind): string {
    const rule = ruleFor(kind);
    const sniffed = sniffContentType(file.buffer, file.mimetype);

    if (!sniffed || !rule.accept.includes(sniffed)) {
      throw new UnsupportedMediaTypeException(
        `This endpoint accepts ${rule.label}. Allowed types: ${rule.accept.join(', ')}.`,
      );
    }

    return sniffed;
  }

  /**
   * Content-addressed key: `images/<sha256>.jpg`.
   *
   * Two properties matter, and both come from the hash being the whole name.
   * Identical bytes always resolve to the same path, so a re-upload overwrites
   * a file with itself instead of adding a copy — which is what makes
   * deduplication a storage saving and not just a database one. And nothing
   * from the caller reaches the path: a filename arrives from an upload, so
   * using it would be both a collision source and a traversal vector.
   *
   * There is deliberately no date folder. A date would put the same bytes in
   * two places on two days and defeat the deduplication this key exists to
   * provide.
   */
  private static keyFor(
    kind: UploadKind,
    checksum: string,
    contentType: string,
  ): string {
    const rule = ruleFor(kind);
    const extension = rule.extensions[contentType] ?? '';
    return `${rule.folder}/${checksum}${extension}`;
  }

  /**
   * Stores a file and returns the row describing it.
   *
   * The order of the two writes is deliberate: bytes first, then the row. A
   * failed insert leaves an object nothing references, which is invisible,
   * harmless and findable by key prefix. The opposite order leaves a row
   * pointing at nothing — and given a choice between an orphaned blob and an
   * orphaned row, the blob is the one that cannot lie to anybody.
   */
  async create(actor: AuthenticatedUser, kind: UploadKind, file: IncomingFile) {
    const rule = ruleFor(kind);

    // Multer's limit is the largest any route accepts, so a file can clear it
    // and still be too big for this one.
    if (file.size > rule.maxBytes) {
      throw new PayloadTooLargeException(
        `That file is ${formatBytes(file.size)}. The limit for ${rule.label} is ${formatBytes(rule.maxBytes)}.`,
      );
    }

    // An empty part passes every size check and sniffs as nothing. Caught here
    // so the caller is told what is wrong rather than getting "unsupported".
    if (file.size === 0) {
      throw new BadRequestException('That file is empty.');
    }

    const contentType = this.resolveContentType(file, kind);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    /**
     * Has this person already uploaded these exact bytes?
     *
     * Scoped to the uploader on purpose. A global match would hand one user a
     * row owned by another, and the moment either archived it the other's
     * record would point at a file it can no longer fetch — a delete with a
     * cross-account side effect nobody asked for. Per-user, the worst case is
     * that two people each hold a row for the same object on disk, which costs
     * one row and no bytes, because the key is the content hash for both.
     *
     * Archived rows are excluded: re-uploading a file that was removed is a
     * request to have it back, and answering with the removed row would return
     * a URL that 404s.
     */
    const existing = await this.prisma.upload.findFirst({
      where: {
        checksum,
        kind,
        uploadedById: actor.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: UPLOAD_SELECT,
    });

    const key = UploadsService.keyFor(kind, checksum, contentType);

    /**
     * Write the bytes unless they are already there.
     *
     * The key is the content hash, so "already there" means byte-identical —
     * another user who uploaded the same file, or this user's own earlier
     * upload. Skipping the write costs one stat call and saves up to 25 MB of
     * I/O; doing it anyway would be a no-op that rewrites a file with itself.
     *
     * This runs *before* the deduplication branch below on purpose. A row can
     * outlive its object — a restore from a database dump without the storage
     * directory, a bucket emptied by hand — and in that state returning the
     * row would hand back a URL that 404s. The bytes are in hand right now, so
     * the cheapest correct thing is to put them back.
     */
    if (!(await this.storage.exists(key))) {
      await this.storage.upload(key, file.buffer, {
        // The sniffed type, never the sender's. S3 serves back what it was
        // given, so storing the header here would hand a browser the
        // attacker's choice of content type.
        contentType,
        filename: file.originalname,
      });
    }

    if (existing) return this.shape(existing, true);

    const created = await this.prisma.upload.create({
      data: {
        storageKey: key,
        driver: this.storage.driverName,
        filename: file.originalname,
        contentType,
        kind,
        size: file.size,
        checksum,
        uploadedById: actor.id,
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: UPLOAD_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'upload.created',
      entityType: 'Upload',
      entityId: created.id,
      metadata: {
        filename: created.filename,
        kind: created.kind,
        contentType,
        size: created.size,
      },
    });

    return this.shape(created, false);
  }

  /**
   * Opens the bytes for streaming.
   *
   * Archived rows are refused. The URL is stored on other records, so serving
   * a removed file would make "remove" mean nothing at the only place it is
   * observable.
   */
  async openStream(id: string): Promise<{
    stream: Readable;
    contentType: string;
    filename: string;
    size: number;
  }> {
    const row = await this.prisma.upload.findFirst({
      where: { id, deletedAt: null },
      select: {
        storageKey: true,
        contentType: true,
        filename: true,
        size: true,
      },
    });

    if (!row) throw new NotFoundException('That file does not exist.');

    return {
      stream: await this.storage.download(row.storageKey),
      contentType: row.contentType,
      filename: row.filename,
      size: row.size,
    };
  }

  /** The record without its bytes — for a caller that wants the metadata. */
  async findOne(id: string) {
    const row = await this.prisma.upload.findUnique({
      where: { id },
      select: { ...UPLOAD_SELECT, deletedAt: true },
    });

    if (!row) throw new NotFoundException('That file does not exist.');

    const { deletedAt, ...rest } = row;
    return { ...this.shape(rest, false), archived: deletedAt !== null };
  }

  /**
   * Archives the record. **The bytes are left exactly where they are.**
   *
   * Nothing in this system is ever permanently deleted, and a restore that
   * could not hand back the same file would not be a restore — it would be an
   * empty row wearing a filename. The object is also content-addressed and may
   * be shared with another user's row, so deleting it here would break a record
   * this request never looked at.
   */
  async remove(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.upload.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, filename: true },
    });

    if (!row) throw new NotFoundException('That file does not exist.');

    await this.prisma.upload.update({
      where: { id },
      data: archiveData(actor.id),
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'upload.removed',
      entityType: 'Upload',
      entityId: id,
      metadata: { filename: row.filename },
    });

    return { id, removed: true };
  }

  /** Clears the deletion stamp and touches nothing else. */
  async restore(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.upload.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, filename: true },
    });

    if (!row) throw new NotFoundException('That file does not exist.');
    if (!row.deletedAt) {
      throw new BadRequestException('That file has not been removed.');
    }

    const restored = await this.prisma.upload.update({
      where: { id },
      data: restoreData(actor.id),
      select: UPLOAD_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'upload.restored',
      entityType: 'Upload',
      entityId: id,
      metadata: { filename: row.filename },
    });

    return this.shape(restored, false);
  }
}
