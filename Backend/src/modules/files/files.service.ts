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
import { AuditService } from '../../core/audit/audit.service.js';
import { StorageService } from '../../core/storage/storage.service.js';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import { orderByField } from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import {
  can,
  canWrite,
} from '../../common/authorization/permissions.js';
import { FileCategory } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { sniffContentType } from './file-signature.js';
import {
  FILE_CATEGORY_RULES,
  ruleFor,
  storageScopeFor,
  type FileCategoryRule,
} from './files.access.js';
import type {
  QueryFilesInput,
  UpdateFileInput,
  UploadFileInput,
} from './dto/file.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/**
 * The owner comes back as a row, not an id.
 *
 * A file list is read as "Mark Reyes — 2025 Form 1099", so the name has to be
 * in the payload. Reading it off the related row rather than copying it at
 * upload time is what stops a folder still showing a maiden name.
 */
const OWNER_USER_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRCRAFT_SELECT = {
  select: { id: true, tailNumber: true, model: true },
} satisfies Prisma.AircraftDefaultArgs;

/**
 * Explicit select, never a bare row spread.
 *
 * `storageKey` is the one column that must never leave the service. It is the
 * address of the bytes, and every other protection in this module assumes that
 * reaching them requires going through a route that re-checks permission. A
 * key in a JSON response is that check bypassed.
 */
const FILE_SELECT = {
  id: true,
  filename: true,
  contentType: true,
  size: true,
  checksum: true,
  category: true,
  label: true,
  notes: true,
  ownerUserId: true,
  ownerUser: OWNER_USER_SELECT,
  aircraftId: true,
  aircraft: AIRCRAFT_SELECT,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  // On the list, not just the detail: the Archived tab has a "Removed By"
  // column and the live list shows a restored badge.
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.FileObjectSelect;

const FILE_DETAIL_SELECT = {
  ...FILE_SELECT,
  createdBy: ACTOR_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.FileObjectSelect;

/** What the service needs to decide whether a caller may touch a row. */
const ACCESS_SELECT = {
  id: true,
  category: true,
  ownerUserId: true,
  deletedAt: true,
} satisfies Prisma.FileObjectSelect;

type AccessRow = {
  category: FileCategory;
  ownerUserId: string | null;
};

/**
 * Text search over the two fields a person actually typed.
 *
 * Not `searchAcross`: the `where` here already carries an `OR` for visibility,
 * and two `OR` keys on one object silently overwrite each other. Both are
 * nested under `AND` at the call site instead — see the note in
 * `common/database/filters.ts`.
 */
function fileSearch(term: string | undefined): Prisma.FileObjectWhereInput {
  if (!term) return {};
  const contains = { contains: term, mode: 'insensitive' } as const;
  return { OR: [{ filename: contains }, { label: contains }] };
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  // ---- Authorization -------------------------------------------------------

  /**
   * Whether `actor` may read files of this category at all, ignoring ownership.
   *
   * A `null` read permission means every signed-in caller — which is what
   * publishing a company brochure means, and is still not public: the route
   * itself is behind the global auth guard.
   */
  private mayReadCategory(actor: AuthenticatedUser, rule: FileCategoryRule) {
    return rule.readPermission === null || can(actor.role, rule.readPermission);
  }

  /**
   * The `where` fragment limiting a list to what this caller may see.
   *
   * Built per category rather than as one scope, because the categories
   * genuinely differ: a broker sees every brochure, their own personal
   * documents, and nobody else's. Expressing that as a single `OWN`/`ALL`
   * scope would force the narrowest rule onto all three and hide the
   * brochures, or the widest and expose the tax forms.
   */
  private visibilityFilter(
    actor: AuthenticatedUser,
  ): Prisma.FileObjectWhereInput {
    const branches: Prisma.FileObjectWhereInput[] = [];

    for (const [category, rule] of Object.entries(FILE_CATEGORY_RULES) as [
      FileCategory,
      FileCategoryRule,
    ][]) {
      if (this.mayReadCategory(actor, rule)) {
        branches.push({ category });
        continue;
      }
      // No blanket read, but a personal folder its owner may still open.
      if (rule.ownerMayRead && rule.owner === 'user') {
        branches.push({ category, ownerUserId: actor.id });
      }
    }

    return { OR: branches };
  }

  /**
   * Refuses a read of one row, as a 404.
   *
   * Never a 403. A 403 here confirms the row exists, which turns any id into
   * an oracle — and for `USER_DOCUMENT` that oracle answers "has this broker
   * been issued a 1099", which is a question about somebody's pay.
   */
  private assertMayRead(actor: AuthenticatedUser, file: AccessRow): void {
    const rule = ruleFor(file.category);
    if (this.mayReadCategory(actor, rule)) return;
    if (rule.ownerMayRead && file.ownerUserId === actor.id) return;
    throw new NotFoundException('File not found');
  }

  /**
   * Refuses a write, as a 403.
   *
   * A 403 is right here and a 404 is not: "you may not publish company
   * resources" is a fact about the caller's role, true before any row is
   * named, so it reveals nothing about what exists.
   */
  private assertMayWrite(actor: AuthenticatedUser, category: FileCategory) {
    const rule = ruleFor(category);
    if (!canWrite(actor.role, rule.writePermission)) {
      throw new ForbiddenException(
        `Your role cannot manage ${category} files`,
      );
    }
  }

  // ---- Upload validation ---------------------------------------------------

  /**
   * Checks the bytes against the rule for the category they were sent as.
   *
   * Order matters. Size is checked before content because rejecting a 400MB
   * file should not first hash it, and the content type is taken from the
   * bytes rather than the upload header because the header is chosen by the
   * sender — see `file-signature.ts`.
   */
  private resolveContentType(
    file: { buffer: Buffer; mimetype: string; size: number },
    rule: FileCategoryRule,
  ): string {
    if (file.size === 0) {
      throw new BadRequestException('That file is empty');
    }
    if (file.size > rule.maxBytes) {
      const limit = Math.round(rule.maxBytes / (1024 * 1024));
      throw new PayloadTooLargeException(
        `That file is larger than the ${limit} MB limit for this kind of file`,
      );
    }

    const detected = sniffContentType(file.buffer, file.mimetype);
    if (detected === null || !rule.accept.includes(detected)) {
      throw new UnsupportedMediaTypeException(
        `This must be ${rule.label}. Accepted formats: ${rule.accept.join(', ')}`,
      );
    }
    return detected;
  }

  /**
   * Verifies the owner a file is being filed against exists and is live.
   *
   * The foreign key would catch a missing row with a bare P2003, and would
   * happily accept an *archived* aircraft — the row still exists, so the
   * constraint holds while the desk has said that tail is gone. Checking here
   * gives the form a named 400 instead.
   */
  private async assertOwner(dto: UploadFileInput): Promise<void> {
    if (dto.ownerUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.ownerUserId },
        select: { id: true, deletedAt: true },
      });
      if (!user || user.deletedAt) {
        throw new BadRequestException('That user does not exist');
      }
    }

    if (dto.aircraftId) {
      const aircraft = await this.prisma.aircraft.findUnique({
        where: { id: dto.aircraftId },
        select: { id: true, deletedAt: true },
      });
      if (!aircraft) {
        throw new BadRequestException('That aircraft does not exist');
      }
      if (aircraft.deletedAt) {
        throw new BadRequestException(
          'That aircraft has been archived. Restore it, or choose another.',
        );
      }
    }
  }

  // ---- Reads ---------------------------------------------------------------

  async findAll(
    actor: AuthenticatedUser,
    query: QueryFilesInput,
  ): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);

    // Asking for a category this role cannot read at all is a 403, not an empty
    // list: silently returning nothing reads as "there are no tax forms"
    // rather than "these are not yours to see". A personal folder is the
    // exception — the caller may not read the category in general but can
    // still read their own, and the visibility filter below narrows it to
    // exactly that.
    if (query.category) {
      const rule = ruleFor(query.category);
      const readable =
        this.mayReadCategory(actor, rule) ||
        (rule.ownerMayRead && rule.owner === 'user');
      if (!readable) {
        throw new ForbiddenException(
          `Your role cannot view ${query.category} files`,
        );
      }
    }

    const where: Prisma.FileObjectWhereInput = {
      ...archiveFilter(query.archived),
      ...(query.category ? { category: query.category } : {}),
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
      ...(query.aircraftId ? { aircraftId: query.aircraftId } : {}),
      // Both of these produce `OR`, so they are nested rather than spread —
      // two `OR` keys on one object and the second silently wins, which here
      // would mean the search term replacing the visibility rule.
      AND: [this.visibilityFilter(actor), fileSearch(query.search)],
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fileObject.findMany({
        where,
        select: FILE_SELECT,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        skip,
        take,
      }),
      this.prisma.fileObject.count({ where }),
    ]);

    return paginate(rows, total, query.page, query.limit);
  }

  /**
   * Archived rows included, deliberately — the Archived tab links straight
   * here, so filtering them out would list a row and then 404 it.
   */
  async findOne(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: { id },
      select: { ...FILE_DETAIL_SELECT, ...ACCESS_SELECT },
    });
    if (!row) throw new NotFoundException('File not found');
    this.assertMayRead(actor, row);
    return row;
  }

  /**
   * The bytes, for the download route.
   *
   * Returns the stream and the metadata together so the controller sets the
   * headers from what was actually stored rather than from anything the
   * request said. An archived file still downloads: the row is archived, the
   * bytes are not, and refusing here would make the Archived tab a list of
   * documents nobody can open.
   */
  async openStream(
    actor: AuthenticatedUser,
    id: string,
  ): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
    size: number;
  }> {
    const file = await this.prisma.fileObject.findFirst({
      where: { id },
      select: {
        ...ACCESS_SELECT,
        storageKey: true,
        filename: true,
        contentType: true,
        size: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');
    this.assertMayRead(actor, file);

    return {
      stream: await this.storage.download(file.storageKey),
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    };
  }

  /**
   * The same, addressed by storage key instead of id.
   *
   * This exists for objects the storage layer writes that are not rows in this
   * table — a user's avatar, whose key lives on `users.avatarKey`. Those are
   * readable by any signed-in caller, which is what an avatar is.
   *
   * A key that *is* a registered file goes through the full category rule, so
   * this route cannot be used to sidestep `openStream`.
   */
  async openStreamByKey(
    actor: AuthenticatedUser,
    key: string,
  ): Promise<{ stream: Readable; filename: string; contentType: string }> {
    const registered = await this.prisma.fileObject.findUnique({
      where: { storageKey: key },
      select: { ...ACCESS_SELECT, filename: true, contentType: true },
    });

    if (registered) {
      this.assertMayRead(actor, registered);
      return {
        stream: await this.storage.download(key),
        filename: registered.filename,
        contentType: registered.contentType,
      };
    }

    if (!(await this.storage.exists(key))) {
      throw new NotFoundException('File not found');
    }

    // Unregistered objects carry no stored content type, and guessing one from
    // the key's extension would let a crafted key choose what a browser
    // executes. `application/octet-stream` downloads instead of rendering.
    return {
      stream: await this.storage.download(key),
      filename: key.split('/').pop() ?? 'download',
      contentType: 'application/octet-stream',
    };
  }

  /** Counts for the tiles above a file list. */
  async stats(actor: AuthenticatedUser) {
    const visible = this.visibilityFilter(actor);

    const [total, archived, ...perCategory] = await this.prisma.$transaction([
      this.prisma.fileObject.count({ where: { AND: [visible, { deletedAt: null }] } }),
      this.prisma.fileObject.count({
        where: { AND: [visible, { deletedAt: { not: null } }] },
      }),
      ...Object.keys(FILE_CATEGORY_RULES).map((category) =>
        this.prisma.fileObject.count({
          where: {
            AND: [visible, { deletedAt: null, category: category as FileCategory }],
          },
        }),
      ),
    ]);

    const byCategory = Object.fromEntries(
      Object.keys(FILE_CATEGORY_RULES).map((category, index) => [
        category,
        perCategory[index] ?? 0,
      ]),
    ) as Record<FileCategory, number>;

    return { total, archived, byCategory };
  }

  // ---- Writes --------------------------------------------------------------

  /**
   * Stores the bytes, then records them.
   *
   * In that order, and it matters which way round. Writing the row first would
   * leave a record pointing at nothing if the upload failed; this way a failed
   * insert leaves an unreferenced object in the bucket, which is invisible,
   * harmless and findable by `driver` + key prefix. Given a choice between an
   * orphaned row and an orphaned blob, the blob is the one that cannot lie to
   * anybody.
   */
  async create(
    actor: AuthenticatedUser,
    dto: UploadFileInput,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    this.assertMayWrite(actor, dto.category);
    const rule = ruleFor(dto.category);
    const contentType = this.resolveContentType(file, rule);
    await this.assertOwner(dto);

    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    const stored = await this.storage.uploadFor(storageScopeFor(dto.category), {
      buffer: file.buffer,
      originalname: file.originalname,
      // The sniffed type, not the sender's. S3 serves what it was given, so
      // storing the header here would hand a browser the attacker's choice.
      mimetype: contentType,
    });

    const created = await this.prisma.fileObject.create({
      data: {
        storageKey: stored.key,
        driver: this.storage.driverName,
        filename: file.originalname,
        contentType,
        size: stored.size,
        checksum,
        category: dto.category,
        label: dto.label ?? null,
        notes: dto.notes ?? null,
        ownerUserId: dto.ownerUserId ?? null,
        aircraftId: dto.aircraftId ?? null,
        createdById: actor.id,
        updatedById: actor.id,
      },
      select: FILE_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'file.uploaded',
      entityType: 'FileObject',
      entityId: created.id,
      metadata: {
        filename: created.filename,
        category: created.category,
        size: created.size,
        contentType,
        ownerUserId: created.ownerUserId,
        aircraftId: created.aircraftId,
      },
    });

    return created;
  }

  /**
   * Loads a row for writing.
   *
   * Separate from `findOne` because that one deliberately returns archived
   * rows for the detail page, and an archived file must not be editable or
   * re-archived. The read check runs first so a caller who may not see the row
   * gets the same 404 they would from any other route.
   */
  private async findLive(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.fileObject.findFirst({
      where: { id, deletedAt: null },
      select: { ...ACCESS_SELECT, filename: true },
    });
    if (!row) throw new NotFoundException('File not found');
    this.assertMayRead(actor, row);
    return row;
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateFileInput) {
    const target = await this.findLive(actor, id);
    this.assertMayWrite(actor, target.category);

    const updated = await this.prisma.fileObject.update({
      where: { id },
      // `updatedById` comes from the session, never the request body.
      data: { ...dto, updatedById: actor.id },
      select: FILE_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'file.updated',
      entityType: 'FileObject',
      entityId: id,
      metadata: { filename: target.filename, fields: Object.keys(dto) },
    });

    return updated;
  }

  /**
   * Archives the row and leaves the bytes exactly where they are.
   *
   * There is no hard delete in this system, and a restore that could not
   * return the same bytes would not be a restore — so removing the object here
   * would quietly make the Archived tab a list of files that can never come
   * back. Storage cost is the price of that promise.
   */
  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const target = await this.findLive(actor, id);
    this.assertMayWrite(actor, target.category);

    await this.prisma.fileObject.update({
      where: { id },
      data: { ...archiveData(actor.id), updatedById: actor.id },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'file.removed',
      entityType: 'FileObject',
      entityId: id,
      metadata: { filename: target.filename, category: target.category },
    });
  }

  async restore(actor: AuthenticatedUser, id: string) {
    const target = await this.prisma.fileObject.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { ...ACCESS_SELECT, filename: true },
    });
    if (!target) throw new NotFoundException('Archived file not found');
    this.assertMayRead(actor, target);
    this.assertMayWrite(actor, target.category);

    const restored = await this.prisma.fileObject.update({
      where: { id },
      data: { ...restoreData(actor.id), updatedById: actor.id },
      select: FILE_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'file.restored',
      entityType: 'FileObject',
      entityId: id,
      metadata: { filename: target.filename, category: target.category },
    });

    return restored;
  }

  /**
   * The rows from a bulk selection this caller may actually act on.
   *
   * Rows they cannot see, and rows in a category they cannot write, are
   * dropped rather than failing the batch — they come back as `skipped`, the
   * same as an id that matched nothing. A mixed selection must not be an
   * all-or-nothing choice between exposing which rows exist and refusing the
   * whole action.
   */
  private async actionable(
    actor: AuthenticatedUser,
    ids: string[],
    archived: boolean,
  ) {
    const rows = await this.prisma.fileObject.findMany({
      where: {
        id: { in: ids },
        ...archiveFilter(archived),
      },
      select: { ...ACCESS_SELECT, filename: true },
    });

    return rows.filter((row) => {
      const rule = ruleFor(row.category);
      const mayRead =
        this.mayReadCategory(actor, rule) ||
        (rule.ownerMayRead && row.ownerUserId === actor.id);
      return mayRead && canWrite(actor.role, rule.writePermission);
    });
  }

  async removeMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    // Read first, so the audit entry can name what was removed.
    const targets = await this.actionable(actor, ids, false);

    if (targets.length > 0) {
      await this.prisma.fileObject.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'file.removed_bulk',
        entityType: 'FileObject',
        entityId: null,
        metadata: {
          count: targets.length,
          files: targets.map((row) => ({
            id: row.id,
            filename: row.filename,
            category: row.category,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(
    actor: AuthenticatedUser,
    ids: string[],
  ): Promise<BulkResult> {
    const targets = await this.actionable(actor, ids, true);

    if (targets.length > 0) {
      await this.prisma.fileObject.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(actor.id), updatedById: actor.id },
      });

      await this.audit.record({
        actorId: actor.id,
        action: 'file.restored_bulk',
        entityType: 'FileObject',
        entityId: null,
        metadata: {
          count: targets.length,
          files: targets.map((row) => ({
            id: row.id,
            filename: row.filename,
            category: row.category,
          })),
        },
      });
    }

    return bulkResult(ids, targets.map((row) => row.id));
  }
}
