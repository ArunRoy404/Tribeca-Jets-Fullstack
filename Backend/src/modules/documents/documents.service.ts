import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import { equalsAny, orderByField, searchAcross } from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import { todayUtc } from '../../common/money/settlement.js';
import { Permission, Scope, scopeFor } from '../../common/authorization/permissions.js';
import type { DocumentCategory } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { OperatorsService } from '../operators/operators.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import {
  SENSITIVE_CATEGORIES,
  expiringHorizon,
  expiryState,
  expiryWhere,
  isSensitive,
} from './documents.rules.js';
import type {
  CreateDocumentInput,
  DocumentOwner,
  DocumentStatsInput,
  QueryDocumentsInput,
  UpdateDocumentInput,
} from './dto/document.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const CLIENT_SELECT = {
  select: { id: true, firstName: true, lastName: true, companyName: true },
} satisfies Prisma.ClientDefaultArgs;

/** The file's own facts, read through the upload — never copied onto the document. */
const UPLOAD_SELECT = {
  select: { id: true, filename: true, contentType: true, kind: true, size: true, deletedAt: true },
} satisfies Prisma.UploadDefaultArgs;

/** Explicit select, never a bare row spread. */
const DOCUMENT_LIST_SELECT = {
  id: true,
  title: true,
  category: true,
  uploadId: true,
  upload: UPLOAD_SELECT,
  clientId: true,
  client: CLIENT_SELECT,
  tripId: true,
  trip: { select: { id: true, reference: true, clientId: true, client: CLIENT_SELECT } },
  operatorId: true,
  operator: { select: { id: true, name: true } },
  expiresOn: true,
  notes: true,
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.DocumentSelect;

const DOCUMENT_DETAIL_SELECT = {
  ...DOCUMENT_LIST_SELECT,
  updatedBy: ACTOR_SELECT,
} satisfies Prisma.DocumentSelect;

type ListRow = Prisma.DocumentGetPayload<{ select: typeof DOCUMENT_LIST_SELECT }>;

/** "/api/uploads/<id>", the form every record in this system stores and serves an upload by. */
const fileUrlOf = (uploadId: string) => `/api/uploads/${uploadId}`;
const uploadIdOf = (fileUrl: string) => fileUrl.split('/').pop() ?? '';

const clientName = (client: { firstName: string | null; lastName: string | null; companyName: string | null }) =>
  [client.firstName, client.lastName].filter(Boolean).join(' ') || client.companyName || 'Unnamed client';

export interface OwnerRef {
  type: DocumentOwner;
  id: string;
  label: string;
}

/** The audit row is written on the owner, so the entry lands on its timeline. */
const OWNER_ENTITY: Record<DocumentOwner, string> = { CLIENT: 'Client', TRIP: 'Trip', OPERATOR: 'Operator' };

/**
 * Document Vault (#22, scope §6.18) — the client, trip and operator folders.
 *
 * **Row scope is the owner's.** A document is readable exactly when its
 * client, trip or operator is, resolved through the owning module's own rule
 * (`ClientsService.visibleWhere`, `TripsService.visibleWhere`; operators are
 * desk reference data) — never a copy of it. Passports and IDs additionally
 * need VIEW_SENSITIVE_DOCUMENTS: without it they are absent from every list
 * and a 404 when named.
 *
 * **The bytes go through the document.** A document's file is usually an
 * upload somebody else made privately, so `openFile` resolves the document
 * in scope first and then vouches for its upload — the second sanctioned
 * caller of `UploadsService.openVouched`, after referral attachments, and
 * for the same reason.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    private readonly trips: TripsService,
    private readonly operators: OperatorsService,
    private readonly uploads: UploadsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  private may(user: AuthenticatedUser, permission: Permission): boolean {
    return scopeFor(user.role, permission) !== Scope.NONE;
  }

  /** The documents whose owner the caller may read, and passports only for those allowed. */
  private scope(user: AuthenticatedUser): Prisma.DocumentWhereInput {
    const owners: Prisma.DocumentWhereInput[] = [];
    if (this.may(user, Permission.VIEW_CLIENTS)) {
      owners.push({ clientId: { not: null }, client: this.clients.visibleWhere(user) });
    }
    if (this.may(user, Permission.VIEW_TRIPS)) {
      owners.push({ tripId: { not: null }, trip: this.trips.visibleWhere(user) });
    }
    if (this.may(user, Permission.MANAGE_OPERATORS)) {
      owners.push({ operatorId: { not: null } });
    }
    return {
      AND: [
        { OR: owners.length ? owners : [{ id: { in: [] } }] },
        this.may(user, Permission.VIEW_SENSITIVE_DOCUMENTS) ? {} : { category: { notIn: SENSITIVE_CATEGORIES } },
      ],
    };
  }

  /** Archiving somebody else's filing is an administrator's or senior broker's call. */
  private assertMayArchive(user: AuthenticatedUser, row: { createdById: string | null }): void {
    if (scopeFor(user.role, Permission.MANAGE_DOCUMENTS) === Scope.ALL) return;
    if (row.createdById !== user.id) {
      throw new ForbiddenException('Only whoever filed a document, or an administrator, can archive or restore it.');
    }
  }

  private assertMayFileSensitive(user: AuthenticatedUser, category: DocumentCategory | undefined): void {
    if (category && isSensitive(category) && !this.may(user, Permission.VIEW_SENSITIVE_DOCUMENTS)) {
      throw new ForbiddenException('Your role cannot file passports or IDs.');
    }
  }

  // ---- Shaping ----------------------------------------------------------

  private owner(row: Pick<ListRow, 'client' | 'trip' | 'operator'>): OwnerRef | null {
    if (row.client) return { type: 'CLIENT', id: row.client.id, label: clientName(row.client) };
    if (row.trip) return { type: 'TRIP', id: row.trip.id, label: `TJ-${row.trip.reference}` };
    if (row.operator) return { type: 'OPERATOR', id: row.operator.id, label: row.operator.name };
    return null;
  }

  private serialise<T extends ListRow>({ upload, ...row }: T, today: Date) {
    return {
      ...row,
      fileUrl: fileUrlOf(row.uploadId),
      file: {
        filename: upload.filename,
        contentType: upload.contentType,
        kind: upload.kind,
        size: upload.size,
        /** The upload itself was archived — the file will not open until it is restored. */
        archived: upload.deletedAt !== null,
      },
      owner: this.owner(row),
      sensitive: isSensitive(row.category),
      /** NONE, VALID, EXPIRING or EXPIRED — worked out now, never stored. */
      expiry: expiryState(row.expiresOn, today),
    };
  }

  // ---- Link checks ------------------------------------------------------

  /**
   * The folder a document is being filed in, resolved by the module that
   * owns it — a 400 naming the problem, since the form needs a reason. A
   * closed record takes no new filings, the rule notes already follow.
   */
  private async resolveOwner(user: AuthenticatedUser, dto: CreateDocumentInput): Promise<OwnerRef> {
    const [type, id]: [DocumentOwner, string] = dto.clientId
      ? ['CLIENT', dto.clientId]
      : dto.tripId
        ? ['TRIP', dto.tripId]
        : ['OPERATOR', dto.operatorId!];
    const noun = type.toLowerCase();
    let ref: { label: string; archived: boolean };
    try {
      ref =
        type === 'CLIENT'
          ? await this.clients.subjectRef(user, id)
          : type === 'TRIP'
            ? await this.trips.subjectRef(user, id)
            : await this.operators.subjectRef(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw new BadRequestException(`That ${noun} does not exist`);
      throw error;
    }
    if (ref.archived) throw new BadRequestException(`${ref.label} has been archived. Restore it before filing on it.`);
    return { type, id, label: ref.label };
  }

  /**
   * The file must be one the caller may read, and live. Without this, filing
   * somebody else's private upload would hand it to everyone who can see the
   * folder — the vouched read would open it for them.
   */
  private async assertFile(user: AuthenticatedUser, fileUrl: string): Promise<string> {
    const id = uploadIdOf(fileUrl);
    const file = await this.uploads.findOne(user, id).catch(() => null);
    if (!file || file.archived) throw new BadRequestException('That file does not exist. Upload it again.');
    return id;
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryDocumentsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const today = query.on ?? todayUtc();
    const where: Prisma.DocumentWhereInput = {
      AND: [
        archiveFilter(query.archived),
        this.scope(user),
        equalsAny(query, ['category', 'clientId', 'tripId', 'operatorId']),
        query.owner ? { [`${query.owner.toLowerCase()}Id`]: { not: null } } : {},
        query.expiry ? expiryWhere(query.expiry, today) : {},
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'expiresOn'
            ? [{ expiresOn: { sort: query.sortOrder, nulls: 'last' } }, { id: 'desc' }]
            : [orderByField(query.sortBy, query.sortOrder), { id: 'desc' }],
        select: DOCUMENT_LIST_SELECT,
      }),
      this.prisma.document.count({ where }),
    ]);

    return paginate(rows.map((row) => this.serialise(row, today)), total, query.page, query.limit);
  }

  /** The title, notes, file name, the owner's name and a trip's "TJ-1048". */
  private searchWhere(term: string): Prisma.DocumentWhereInput {
    const trip = /^(?:TJ-?)?(\d{1,9})$/i.exec(term.trim());
    return {
      OR: [
        searchAcross(term, ['title', 'notes']),
        { upload: searchAcross(term, ['filename']) },
        { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) },
        { trip: { client: searchAcross(term, ['firstName', 'lastName', 'companyName']) } },
        { operator: searchAcross(term, ['name']) },
        ...(trip ? [{ trip: { reference: Number(trip[1]) } }] : []),
      ],
    };
  }

  /** Archived documents included — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.document.findFirst({
      where: { AND: [{ id }, this.scope(user)] },
      select: DOCUMENT_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Document not found');
    return this.serialise(row, todayUtc());
  }

  /** A live document in the caller's scope, for a write. */
  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.document.findFirst({
      where: { AND: [{ id, deletedAt: null }, this.scope(user)] },
      select: DOCUMENT_LIST_SELECT,
    });
    if (!row) throw new NotFoundException('Document not found');
    return row;
  }

  /**
   * The file's bytes, for whoever may read the document — live or archived,
   * since an archived document still opens from the Archived tab. 404 when
   * the document is out of scope, exactly as the detail read.
   */
  async openFile(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.document.findFirst({
      where: { AND: [{ id }, this.scope(user)] },
      select: { uploadId: true },
    });
    if (!row) throw new NotFoundException('Document not found');
    return this.uploads.openVouched(row.uploadId);
  }

  /**
   * Live documents in the caller's scope that have expired or expire before
   * `before` — soonest first, `take` rows and the full count — for the
   * dashboard's priorities (#24): scope §6.3's passport-expiry reminder.
   */
  async expiringBefore(user: AuthenticatedUser, before: Date, take: number) {
    const where: Prisma.DocumentWhereInput = {
      AND: [{ deletedAt: null, expiresOn: { lt: before } }, this.scope(user)],
    };
    const today = todayUtc();
    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        take,
        orderBy: [{ expiresOn: 'asc' }, { id: 'asc' }],
        select: DOCUMENT_LIST_SELECT,
      }),
      this.prisma.document.count({ where }),
    ]);
    return { rows: rows.map((row) => this.serialise(row, today)), total };
  }

  /** The tiles, over the caller's scope — optionally one folder. */
  async stats(user: AuthenticatedUser, query: DocumentStatsInput) {
    const today = query.on ?? todayUtc();
    const base: Prisma.DocumentWhereInput = {
      AND: [{ deletedAt: null }, this.scope(user), equalsAny(query, ['clientId', 'tripId', 'operatorId'])],
    };
    const count = (extra: Prisma.DocumentWhereInput) => this.prisma.document.count({ where: { AND: [base, extra] } });
    const [total, clients, trips, operators, expired, expiring] = await Promise.all([
      count({}),
      count({ clientId: { not: null } }),
      count({ tripId: { not: null } }),
      count({ operatorId: { not: null } }),
      count(expiryWhere('EXPIRED', today)),
      count(expiryWhere('EXPIRING', today)),
    ]);
    return {
      total,
      byOwner: { client: clients, trip: trips, operator: operators },
      expired,
      /** Expiring within the window, from `on`. */
      expiring,
      expiringUntil: expiringHorizon(today).toISOString().slice(0, 10),
    };
  }

  // ---- Writes -----------------------------------------------------------

  /** One audit row, on the owner — so filing a document reads on its timeline. */
  private async record(
    user: AuthenticatedUser,
    action: string,
    owner: OwnerRef | null,
    doc: { id: string; title: string; category: DocumentCategory },
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (!owner) return;
    await this.audit.record({
      actorId: user.id,
      action,
      entityType: OWNER_ENTITY[owner.type],
      entityId: owner.id,
      // A passport's title can carry its number; the timeline shows the
      // category, and the title only for what is not restricted.
      metadata: {
        documentId: doc.id,
        category: doc.category,
        ...(isSensitive(doc.category) ? {} : { title: doc.title }),
        ...extra,
      },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateDocumentInput) {
    this.assertMayFileSensitive(user, dto.category);
    const [owner, uploadId] = await Promise.all([this.resolveOwner(user, dto), this.assertFile(user, dto.fileUrl)]);

    const row = await this.prisma.document.create({
      data: {
        title: dto.title,
        category: dto.category,
        uploadId,
        clientId: dto.clientId ?? null,
        tripId: dto.tripId ?? null,
        operatorId: dto.operatorId ?? null,
        expiresOn: dto.expiresOn ?? null,
        notes: dto.notes ?? null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true },
    });
    await this.record(user, 'document.added', owner, { id: row.id, title: dto.title, category: dto.category });
    return this.findOne(user, row.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateDocumentInput) {
    const current = await this.findLive(user, id);
    // Moving a passport out of the restricted categories needs the same
    // right as filing one — otherwise a relabel would publish it.
    this.assertMayFileSensitive(user, current.category);
    this.assertMayFileSensitive(user, dto.category);

    const { fileUrl, ...fields } = dto;
    const uploadId = fileUrl && uploadIdOf(fileUrl) !== current.uploadId ? await this.assertFile(user, fileUrl) : undefined;

    await this.prisma.document.update({
      where: { id },
      data: { ...fields, ...(uploadId ? { uploadId } : {}), updatedById: user.id },
    });
    await this.record(
      user,
      uploadId ? 'document.replaced' : 'document.updated',
      this.owner(current),
      { id, title: dto.title ?? current.title, category: dto.category ?? current.category },
      { fields: Object.keys(dto) },
    );
    return this.findOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.findLive(user, id);
    this.assertMayArchive(user, current);
    await this.prisma.document.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.record(user, 'document.archived', this.owner(current), current);
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.document.findFirst({
      where: { AND: [{ id, deletedAt: { not: null } }, this.scope(user)] },
      select: DOCUMENT_LIST_SELECT,
    });
    if (!row) throw new NotFoundException('Archived document not found');
    this.assertMayArchive(user, row);
    await this.prisma.document.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.record(user, 'document.restored', this.owner(row), row);
    return this.findOne(user, id);
  }

  /**
   * Partial success is success: ids out of scope, already archived, or filed
   * by somebody else (for a role that may archive only its own) come back in
   * `skipped` rather than failing the rest.
   */
  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    return this.bulk(user, ids, true);
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    return this.bulk(user, ids, false);
  }

  private async bulk(user: AuthenticatedUser, ids: string[], archive: boolean): Promise<BulkResult> {
    const mayAll = scopeFor(user.role, Permission.MANAGE_DOCUMENTS) === Scope.ALL;
    const targets = await this.prisma.document.findMany({
      where: {
        AND: [
          { id: { in: ids }, deletedAt: archive ? null : { not: null } },
          this.scope(user),
          mayAll ? {} : { createdById: user.id },
        ],
      },
      select: DOCUMENT_LIST_SELECT,
    });
    if (targets.length) {
      await this.prisma.document.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...(archive ? archiveData(user.id) : restoreData(user.id)), updatedById: user.id },
      });
      for (const row of targets) {
        await this.record(user, archive ? 'document.archived' : 'document.restored', this.owner(row), row);
      }
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }
}
