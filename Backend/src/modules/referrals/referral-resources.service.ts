import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import {
  paginate,
  type AuthenticatedUser,
  type Paginated,
} from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { orderByField, searchAcross } from '../../common/database/filters.js';
import {
  ARCHIVE_ACTOR_SELECT,
  ARCHIVE_SELECT,
  archiveData,
  archiveFilter,
  restoreData,
} from '../../common/database/archive.js';
import {
  Permission,
  Scope,
  isPartner,
  scopeFor,
} from '../../common/authorization/permissions.js';
import { UploadVisibility } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type {
  CreateResourceInput,
  QueryResourcesInput,
  UpdateResourceInput,
} from './dto/referral.dto.js';

const RESOURCE_SELECT = {
  id: true,
  title: true,
  description: true,
  fileUrl: true,
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.ReferralResourceSelect;

/**
 * The portal's Resources section (#11) — the brochure, the aircraft category
 * guide, the programme terms. Every referral agent reads every live resource;
 * only an administrator or senior broker curates the list.
 */
@Injectable()
export class ReferralResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  private assertCurator(user: AuthenticatedUser): void {
    if (scopeFor(user.role, Permission.MANAGE_REFERRALS) !== Scope.ALL) {
      throw new ForbiddenException('Only an administrator or senior broker manages portal resources.');
    }
  }

  /**
   * The file must be PUBLIC, or the agents it is published to could not open
   * it — the upload access rule reads visibility, not this table.
   */
  private async assertPublicFile(user: AuthenticatedUser, url: string): Promise<void> {
    const file = await this.uploads.findOne(user, url.split('/').pop() ?? '').catch(() => null);
    if (!file || file.archived) throw new BadRequestException('That file does not exist');
    if (file.visibility !== UploadVisibility.PUBLIC) {
      throw new BadRequestException('Upload the resource as a public file, so referral agents can open it.');
    }
  }

  async findAll(user: AuthenticatedUser, query: QueryResourcesInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.ReferralResourceWhereInput = {
      ...archiveFilter(isPartner(user.role) ? false : query.archived),
      ...searchAcross(query.search, ['title', 'description']),
    };
    const [rows, total] = await Promise.all([
      this.prisma.referralResource.findMany({
        where,
        skip,
        take,
        orderBy: orderByField(query.sortBy, query.sortOrder),
        select: RESOURCE_SELECT,
      }),
      this.prisma.referralResource.count({ where }),
    ]);
    return paginate(rows, total, query.page, query.limit);
  }

  async create(user: AuthenticatedUser, dto: CreateResourceInput) {
    this.assertCurator(user);
    await this.assertPublicFile(user, dto.fileUrl);
    const row = await this.prisma.referralResource.create({
      data: { ...dto, createdById: user.id, updatedById: user.id },
      select: RESOURCE_SELECT,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'referral_resource.created',
      entityType: 'ReferralResource',
      entityId: row.id,
      metadata: { title: row.title },
    });
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateResourceInput) {
    this.assertCurator(user);
    const current = await this.prisma.referralResource.findFirst({
      where: { id, deletedAt: null },
      select: { fileUrl: true },
    });
    if (!current) throw new NotFoundException('Resource not found');
    if (dto.fileUrl && dto.fileUrl !== current.fileUrl) await this.assertPublicFile(user, dto.fileUrl);
    const row = await this.prisma.referralResource.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
      select: RESOURCE_SELECT,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'referral_resource.updated',
      entityType: 'ReferralResource',
      entityId: id,
      metadata: { title: row.title, fields: Object.keys(dto) },
    });
    return row;
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertCurator(user);
    const current = await this.prisma.referralResource.findFirst({
      where: { id, deletedAt: null },
      select: { title: true },
    });
    if (!current) throw new NotFoundException('Resource not found');
    await this.prisma.referralResource.update({
      where: { id },
      data: { ...archiveData(user.id), updatedById: user.id },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'referral_resource.archived',
      entityType: 'ReferralResource',
      entityId: id,
      metadata: { title: current.title },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertCurator(user);
    const current = await this.prisma.referralResource.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { title: true },
    });
    if (!current) throw new NotFoundException('Archived resource not found');
    const row = await this.prisma.referralResource.update({
      where: { id },
      data: { ...restoreData(user.id), updatedById: user.id },
      select: RESOURCE_SELECT,
    });
    await this.audit.record({
      actorId: user.id,
      action: 'referral_resource.restored',
      entityType: 'ReferralResource',
      entityId: id,
      metadata: { title: current.title },
    });
    return row;
  }
}
