import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
import type { Prisma } from '../../generated/prisma/client.js';
import { EmailsService } from './emails.service.js';
import { unknownTokens } from './email.merge.js';
import type {
  CreateEmailTemplateInput,
  EmailTemplateStatsInput,
  QueryEmailTemplatesInput,
  UpdateEmailTemplateInput,
} from './dto/email-template.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

/** Explicit select, never a bare row spread. The list carries the body: the preview sheet opens from it. */
const TEMPLATE_LIST_SELECT = {
  id: true,
  name: true,
  category: true,
  subject: true,
  body: true,
  active: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  updatedBy: ACTOR_SELECT,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.EmailTemplateSelect;

const TEMPLATE_DETAIL_SELECT = {
  ...TEMPLATE_LIST_SELECT,
  createdBy: ACTOR_SELECT,
} satisfies Prisma.EmailTemplateSelect;

/**
 * Email Templates (#21) — the desk's shared library. Read by all staff
 * (MANAGE_EMAIL_TEMPLATES at READ is enough to use one); changed by
 * administrators and senior brokers. There is no row scope: a template
 * belongs to the desk, not to whoever wrote it.
 */
@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emails: EmailsService,
  ) {}

  /** A merge field the catalogue does not have is a typo — named, and refused. */
  private assertKnownFields(...texts: string[]): void {
    const unknown = unknownTokens(...texts);
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown merge field${unknown.length > 1 ? 's' : ''}: ${unknown.map((t) => `{${t}}`).join(', ')}`,
      );
    }
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(query: QueryEmailTemplatesInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.EmailTemplateWhereInput = {
      ...archiveFilter(query.archived),
      ...equalsAny(query, ['category', 'active']),
      ...searchAcross(query.search, ['name', 'subject', 'body']),
    };
    const [rows, total] = await Promise.all([
      this.prisma.emailTemplate.findMany({
        where,
        skip,
        take,
        orderBy: [orderByField(query.sortBy, query.sortOrder), { id: 'desc' }],
        select: TEMPLATE_LIST_SELECT,
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  /** Archived templates load too — the Archived tab opens them. */
  async findOne(id: string) {
    const row = await this.prisma.emailTemplate.findUnique({ where: { id }, select: TEMPLATE_DETAIL_SELECT });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  private async findLive(id: string) {
    const row = await this.prisma.emailTemplate.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true, subject: true, body: true },
    });
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  /**
   * The four tiles. "Categories" counts the categories the live library
   * actually uses — not the size of the enum — and "sent this month" counts
   * the emails the caller may see, delivered or not, from the sent log.
   */
  async stats(user: AuthenticatedUser, query: EmailTemplateStatsInput) {
    const on = query.on ?? todayUtc();
    const monthStart = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(on.getUTCFullYear(), on.getUTCMonth() + 1, 1));
    const live = { deletedAt: null };

    const [total, active, categories, sentThisMonth] = await Promise.all([
      this.prisma.emailTemplate.count({ where: live }),
      this.prisma.emailTemplate.count({ where: { ...live, active: true } }),
      this.prisma.emailTemplate.groupBy({ by: ['category'], where: live }),
      this.emails.countSent(user, monthStart, nextMonth),
    ]);
    return { total, active, inactive: total - active, categoriesInUse: categories.length, sentThisMonth };
  }

  // ---- Writes -----------------------------------------------------------

  async create(user: AuthenticatedUser, dto: CreateEmailTemplateInput) {
    this.assertKnownFields(dto.subject, dto.body);
    const row = await this.prisma.emailTemplate.create({
      data: { ...dto, createdById: user.id, updatedById: user.id },
      select: { id: true },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'email_template.created',
      entityType: 'EmailTemplate',
      entityId: row.id,
      metadata: { name: dto.name, category: dto.category },
    });
    return this.findOne(row.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmailTemplateInput) {
    const current = await this.findLive(id);
    this.assertKnownFields(dto.subject ?? current.subject, dto.body ?? current.body);
    await this.prisma.emailTemplate.update({ where: { id }, data: { ...dto, updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'email_template.updated',
      entityType: 'EmailTemplate',
      entityId: id,
      metadata: { name: dto.name ?? current.name, fields: Object.keys(dto) },
    });
    return this.findOne(id);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const current = await this.findLive(id);
    await this.prisma.emailTemplate.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'email_template.archived',
      entityType: 'EmailTemplate',
      entityId: id,
      metadata: { name: current.name },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.emailTemplate.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { id: true, name: true },
    });
    if (!row) throw new NotFoundException('Archived template not found');
    await this.prisma.emailTemplate.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'email_template.restored',
      entityType: 'EmailTemplate',
      entityId: id,
      metadata: { name: row.name },
    });
    return this.findOne(id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.emailTemplate.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, name: true },
    });
    if (targets.length) {
      await this.prisma.emailTemplate.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'email_template.bulk_archived',
        entityType: 'EmailTemplate',
        metadata: { count: targets.length, names: targets.map((row) => row.name) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    const targets = await this.prisma.emailTemplate.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, name: true },
    });
    if (targets.length) {
      await this.prisma.emailTemplate.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'email_template.bulk_restored',
        entityType: 'EmailTemplate',
        metadata: { count: targets.length, names: targets.map((row) => row.name) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }
}
