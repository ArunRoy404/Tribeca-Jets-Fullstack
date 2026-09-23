import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { StorageService } from '../../core/storage/storage.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { sniffContentType } from '../../common/files/file-signature.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import { searchAcross, orderByField } from '../../common/database/filters.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { paginate, type AuthenticatedUser } from '../../common/types/api.types.js';
import { UploadKind, UploadVisibility } from '../../generated/prisma/enums.js';
import {
  administersUsers,
  mayRead,
  visibilityWhere,
} from './uploads.access.js';
import { formatBytes, ruleFor } from './uploads.rules.js';
import type { ListUploadsQuery } from './dto/upload-query.dto.js';

/** The multipart part multer hands us, narrowed to what is actually read. */
export interface IncomingFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** The fields that travel beside the bytes. All optional; all default safe. */
export interface UploadOptions {
  /** Defaults to PRIVATE — see `Upload.visibility` for why that direction. */
  visibility?: UploadVisibility;
  /** Files this document belongs to, beyond its uploader. */
  ownerUserId?: string;
  /** A human name, shown instead of the filename. */
  label?: string;
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
  label: true,
  contentType: true,
  kind: true,
  size: true,
  visibility: true,
  ownerUserId: true,
  uploadedById: true,
  createdAt: true,
} as const;

/**
 * The list adds who archived a row and who brought it back.
 *
 * On the list, not just the detail: the Archived tab has a "Removed By"
 * column, and the live list shows a "Restored" badge.
 */
const UPLOAD_LIST_SELECT = {
  ...UPLOAD_SELECT,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
  uploadedBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
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

  private shape(
    row: {
      id: string;
      filename: string;
      label: string | null;
      contentType: string;
      kind: UploadKind;
      size: number;
      visibility: UploadVisibility;
      ownerUserId: string | null;
      uploadedById: string | null;
      createdAt: Date;
    },
    deduplicated: boolean,
  ) {
    return {
      id: row.id,
      url: UploadsService.urlFor(row.id),
      filename: row.filename,
      label: row.label,
      contentType: row.contentType,
      size: row.size,
      kind: row.kind,
      visibility: row.visibility,
      ownerUserId: row.ownerUserId,
      deduplicated,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Who a caller may file a document *about*.
   *
   * Filing against somebody else puts a row in their folder, so it takes the
   * permission that administers their account. Without this, any broker could
   * drop a document into any other broker's folder.
   */
  private async resolveOwner(
    actor: AuthenticatedUser,
    ownerUserId: string | undefined,
  ): Promise<string | null> {
    if (!ownerUserId) return null;

    if (ownerUserId !== actor.id && !administersUsers(actor)) {
      throw new ForbiddenException(
        'Filing a document against another user needs permission to manage users.',
      );
    }

    const owner = await this.prisma.user.findFirst({
      where: { id: ownerUserId, deletedAt: null },
      select: { id: true },
    });

    if (!owner) {
      throw new BadRequestException({ ownerUserId: 'That user does not exist.' });
    }

    return owner.id;
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
  async create(
    actor: AuthenticatedUser,
    kind: UploadKind,
    file: IncomingFile,
    options: UploadOptions = {},
  ) {
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

    const visibility = options.visibility ?? UploadVisibility.PRIVATE;
    const ownerUserId = await this.resolveOwner(actor, options.ownerUserId);

    /**
     * Has this person already uploaded these exact bytes, for this owner, at
     * this visibility?
     *
     * **Scoped to the uploader** on purpose. A global match would hand one user
     * a row owned by another, and the moment either archived it the other's
     * record would point at a file it can no longer fetch — a delete with a
     * cross-account side effect nobody asked for. Per-user, the worst case is
     * two rows for one object on disk, which costs a row and no bytes.
     *
     * **Scoped to the owner and the visibility** because otherwise filing the
     * same PDF for Mark and then for Barry returns Mark's row, and one
     * document appears in two people's folders. Publishing a file that was
     * uploaded privately would silently reuse the private row in the same way.
     *
     * `label` is deliberately *not* part of the key: the same bytes filed
     * about the same person is a duplicate whatever it is called, and the
     * existing record keeps the name it was given.
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
        ownerUserId,
        visibility,
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
        visibility,
        ownerUserId,
        label: options.label ?? null,
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
        visibility: created.visibility,
        // Who it was filed about. The one fact that makes this entry worth
        // reading back: "who put a document in Mark's folder, and when".
        ownerUserId: created.ownerUserId,
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
  async openStream(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{
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
        visibility: true,
        ownerUserId: true,
        uploadedById: true,
      },
    });

    /**
     * **404, not 403.** A 403 confirms the file exists, and on a private
     * document that is the whole secret: it turns a list of upload ids into a
     * register of which brokers have been paid. The caller cannot tell a file
     * they may not read from one that was never there, which is correct.
     */
    if (!row || !mayRead(actor, row)) {
      throw new NotFoundException('That file does not exist.');
    }

    return {
      stream: await this.storage.download(row.storageKey),
      contentType: row.contentType,
      filename: row.filename,
      size: row.size,
    };
  }

  /**
   * The record without its bytes — for a caller that wants the metadata.
   *
   * Unlike the stream, this answers for an archived row: a list showing an
   * attachment needs to say "removed" rather than render a broken link.
   */
  async findOne(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.upload.findUnique({
      where: { id },
      select: { ...UPLOAD_SELECT, deletedAt: true },
    });

    if (!row || !mayRead(actor, row)) {
      throw new NotFoundException('That file does not exist.');
    }

    const { deletedAt, ...rest } = row;
    return { ...this.shape(rest, false), archived: deletedAt !== null };
  }

  /**
   * A page of stored files.
   *
   * `ownerUserId` is what makes this a *folder*: the client's "folder for each
   * broker" is every live upload filed about that broker. It is a query, not a
   * second table, which is why removing a document and removing the file are
   * the same act rather than two rows to keep in step.
   */
  async findAll(actor: AuthenticatedUser, query: ListUploadsQuery) {
    // Reading somebody else's folder needs the permission that administers
    // their account — the same rule as filing into it.
    if (
      query.ownerUserId &&
      query.ownerUserId !== actor.id &&
      !administersUsers(actor)
    ) {
      throw new ForbiddenException(
        'Reading another user\'s documents needs permission to manage users.',
      );
    }

    const where = {
      AND: [
        archiveFilter(query.archived),
        visibilityWhere(actor),
        ...(query.ownerUserId ? [{ ownerUserId: query.ownerUserId }] : []),
        ...(query.kind ? [{ kind: query.kind as UploadKind }] : []),
        ...(query.search
          ? [searchAcross(query.search, ['filename', 'label'])]
          : []),
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        ...toPrismaPagination(query),
        orderBy: orderByField(query.sortBy, query.sortOrder),
        select: UPLOAD_LIST_SELECT,
      }),
      this.prisma.upload.count({ where }),
    ]);

    return paginate(
      items.map((row) => ({
        ...this.shape(row, false),
        archived: row.deletedAt !== null,
        deletedAt: row.deletedAt,
        deletedBy: row.deletedBy,
        restoredAt: row.restoredAt,
        restoredBy: row.restoredBy,
        uploadedBy: row.uploadedBy,
      })),
      total,
      query.page,
      query.limit,
    );
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
      select: {
        id: true,
        filename: true,
        visibility: true,
        ownerUserId: true,
        uploadedById: true,
      },
    });

    // Same 404 as the read. Somebody who cannot see a file must not be able to
    // discover it exists by trying to remove it.
    if (!row || !mayRead(actor, row)) {
      throw new NotFoundException('That file does not exist.');
    }

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
      select: {
        id: true,
        deletedAt: true,
        filename: true,
        visibility: true,
        ownerUserId: true,
        uploadedById: true,
      },
    });

    if (!row || !mayRead(actor, row)) {
      throw new NotFoundException('That file does not exist.');
    }
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
