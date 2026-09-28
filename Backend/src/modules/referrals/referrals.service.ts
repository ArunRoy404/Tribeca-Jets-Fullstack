import {
  BadRequestException,
  ConflictException,
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
import { bulkResult, type BulkResult } from '../../common/dto/bulk.dto.js';
import {
  equalsAny,
  orderByField,
  searchAcross,
} from '../../common/database/filters.js';
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
import { fromCents, toCents } from '../../common/money/cents.js';
import {
  ClientPriority,
  ClientStatus,
  ClientType,
  LeadSource,
  LeadStage,
  ReferralStatus,
  TripRequestStatus,
  UserRole,
} from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { TripsService } from '../trips/trips.service.js';
import { CommissionsService } from '../commissions/commissions.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type {
  ConvertReferralInput,
  QueryReferralsInput,
  SubmitReferralInput,
  UpdateReferralInput,
} from './dto/referral.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const AIRPORT_SELECT = {
  select: { id: true, icao: true, iata: true, name: true, city: true },
} satisfies Prisma.AirportDefaultArgs;

/** Explicit select, never a bare row spread — see the users module for why. */
const REFERRAL_SELECT = {
  id: true,
  reference: true,
  agentId: true,
  agent: ACTOR_SELECT,
  status: true,
  clientFirstName: true,
  clientLastName: true,
  clientEmail: true,
  clientPhone: true,
  originAirportId: true,
  originAirport: AIRPORT_SELECT,
  destinationAirportId: true,
  destinationAirport: AIRPORT_SELECT,
  departureDate: true,
  returnDate: true,
  departureTime: true,
  passengers: true,
  aircraftPreference: true,
  budget: true,
  notes: true,
  attachmentUrls: true,
  assignedBrokerId: true,
  assignedBroker: ACTOR_SELECT,
  clientId: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  tripRequestId: true,
  tripRequest: { select: { id: true, reference: true, status: true } },
  tripId: true,
  trip: { select: { id: true, reference: true, status: true, departureDate: true } },
  createdAt: true,
  createdById: true,
  updatedAt: true,
  updatedById: true,
  ...ARCHIVE_SELECT,
  ...ARCHIVE_ACTOR_SELECT,
} satisfies Prisma.ReferralSelect;

type Row = Prisma.ReferralGetPayload<{ select: typeof REFERRAL_SELECT }>;

/** Still being worked — #11's "Active referrals". */
export const ACTIVE_REFERRAL_STATUSES = [
  ReferralStatus.SUBMITTED,
  ReferralStatus.CONTACTED,
  ReferralStatus.QUOTING,
  ReferralStatus.BOOKED,
] as const;

/** The ladder's order, for "only ever move forward automatically". */
const LADDER: ReferralStatus[] = [
  ReferralStatus.SUBMITTED,
  ReferralStatus.CONTACTED,
  ReferralStatus.QUOTING,
  ReferralStatus.BOOKED,
  ReferralStatus.COMPLETED,
];

/** `to` if it is further along the ladder than `from`, otherwise `from`. */
function advance(from: ReferralStatus, to: ReferralStatus): ReferralStatus {
  const a = LADDER.indexOf(from);
  const b = LADDER.indexOf(to);
  // LOST / CANCELLED are off the ladder: an automatic step never revives one.
  if (a === -1) return from;
  return b > a ? to : from;
}

const attachmentId = (url: string) => url.split('/').pop() ?? '';

/**
 * Portal referrals — client adjustment #11.
 *
 * Two audiences, one table. The desk sees everything about a referral and
 * works it: converts it into a client and a trip request, assigns it, links
 * the trip it booked. The referral agent sees **their own** referrals,
 * projected down to what they sent plus its status, the trip it booked and
 * its date — never the desk's broker, the CRM client record, or anything
 * internal. Their "Agent Update" is the SHARED notes on the referral, read
 * through the notes module.
 */
@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
    private readonly requests: TripRequestsService,
    private readonly trips: TripsService,
    private readonly commissions: CommissionsService,
    private readonly uploads: UploadsService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  /**
   * An agent sees what they submitted. A broker sees the referrals assigned
   * to them and the unassigned ones — the trip-request rule, so a fresh
   * referral cannot sit where nobody looks.
   */
  private visibilityScope(user: AuthenticatedUser): Prisma.ReferralWhereInput {
    if (isPartner(user.role)) return { agentId: user.id };
    if (scopeFor(user.role, Permission.VIEW_REFERRALS) === Scope.ALL) return {};
    return { OR: [{ assignedBrokerId: user.id }, { assignedBrokerId: null }] };
  }

  private administers(user: AuthenticatedUser): boolean {
    return scopeFor(user.role, Permission.MANAGE_REFERRALS) === Scope.ALL;
  }

  /** Only the desk works a referral. The agent submits it and reads it. */
  private assertDesk(user: AuthenticatedUser): void {
    if (isPartner(user.role)) {
      throw new ForbiddenException('Referrals are updated by the Tribeca desk.');
    }
  }

  // ---- Shaping ----------------------------------------------------------

  private serialise(row: Row) {
    return {
      ...row,
      budget: row.budget === null ? null : fromCents(toCents(row.budget)),
    };
  }

  /**
   * What the agent reads: what they sent, where it stands, and the trip it
   * booked. The broker working it, the CRM client and enquiry it became, and
   * the archive trail stay on the desk's side.
   */
  private partnerView(row: Row) {
    const full = this.serialise(row);
    return {
      id: full.id,
      reference: full.reference,
      status: full.status,
      clientFirstName: full.clientFirstName,
      clientLastName: full.clientLastName,
      clientEmail: full.clientEmail,
      clientPhone: full.clientPhone,
      originAirport: full.originAirport,
      destinationAirport: full.destinationAirport,
      departureDate: full.departureDate,
      returnDate: full.returnDate,
      departureTime: full.departureTime,
      passengers: full.passengers,
      aircraftPreference: full.aircraftPreference,
      budget: full.budget,
      notes: full.notes,
      attachmentUrls: full.attachmentUrls,
      trip: full.trip ? { reference: full.trip.reference, status: full.trip.status, departureDate: full.trip.departureDate } : null,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
  }

  private view(user: AuthenticatedUser, row: Row) {
    return isPartner(user.role) ? this.partnerView(row) : this.serialise(row);
  }

  // ---- Reads ------------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryReferralsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const partner = isPartner(user.role);
    const where: Prisma.ReferralWhereInput = {
      AND: [
        archiveFilter(partner ? false : query.archived),
        this.visibilityScope(user),
        equalsAny(query, partner ? ['status'] : ['status', 'agentId', 'assignedBrokerId']),
        query.search ? this.searchWhere(query.search) : {},
      ],
    };

    const [rows, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take,
        orderBy:
          query.sortBy === 'departureDate'
            ? [{ departureDate: { sort: query.sortOrder, nulls: 'last' } }, { reference: 'desc' }]
            : orderByField(query.sortBy, query.sortOrder),
        select: REFERRAL_SELECT,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return paginate(rows.map((row) => this.view(user, row)), total, query.page, query.limit);
  }

  /** "RF-1001" or "1001", the client's name, email or phone. */
  private searchWhere(term: string): Prisma.ReferralWhereInput {
    const digits = term.replace(/^RF-?/i, '');
    const reference = /^\d{1,9}$/.test(digits) ? Number(digits) : null;
    return {
      OR: [
        ...(reference !== null ? [{ reference }] : []),
        searchAcross(term, ['clientFirstName', 'clientLastName', 'clientEmail', 'clientPhone']),
      ],
    };
  }

  /** Archived rows load for the desk — the Archived tab links here. */
  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.referral.findFirst({
      where: { id, ...this.visibilityScope(user), ...(isPartner(user.role) ? { deletedAt: null } : {}) },
      select: REFERRAL_SELECT,
    });
    if (!row) throw new NotFoundException('Referral not found');
    return this.view(user, row);
  }

  /**
   * #11's dashboard counts, over the caller's scope — an agent's own, or the
   * desk's. "Trips booked" counts BOOKED and COMPLETED: a completed trip was
   * booked first.
   */
  async stats(user: AuthenticatedUser) {
    const rows = await this.prisma.referral.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...this.visibilityScope(user) },
      _count: { _all: true },
    });
    const count = (status: ReferralStatus) => rows.find((row) => row.status === status)?._count._all ?? 0;
    return {
      total: rows.reduce((sum, row) => sum + row._count._all, 0),
      submitted: count(ReferralStatus.SUBMITTED),
      active: ACTIVE_REFERRAL_STATUSES.reduce((sum, status) => sum + count(status), 0),
      booked: count(ReferralStatus.BOOKED) + count(ReferralStatus.COMPLETED),
      completed: count(ReferralStatus.COMPLETED),
      lost: count(ReferralStatus.LOST) + count(ReferralStatus.CANCELLED),
    };
  }

  // ---- Writes -----------------------------------------------------------

  private async assertAirport(id: string | undefined, label: string): Promise<void> {
    if (!id) return;
    const row = await this.prisma.airport.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!row || row.deletedAt) throw new BadRequestException(`That ${label} airport does not exist`);
  }

  /** An attachment must be a file the submitter uploaded themselves. */
  private async assertAttachments(user: AuthenticatedUser, urls: string[]): Promise<void> {
    for (const url of urls) {
      const file = await this.uploads.findOne(user, attachmentId(url)).catch(() => null);
      if (!file || file.archived) throw new BadRequestException('One of the attachments does not exist');
    }
  }

  /**
   * #11's Submit Referral. The agent is always the session — "Referral
   * Source: [agent]" is recorded, never typed. Desk staff may log one an
   * agent phoned in, naming the agent.
   */
  async submit(user: AuthenticatedUser, dto: SubmitReferralInput) {
    const partner = isPartner(user.role);
    let agentId = user.id;
    if (!partner) {
      if (!dto.agentId) throw new BadRequestException('Choose the referral agent this came from');
      const agent = await this.prisma.user.findFirst({
        where: { id: dto.agentId, deletedAt: null },
        select: { role: true },
      });
      if (agent?.role !== UserRole.REFERRAL_AGENT) throw new BadRequestException('That referral agent does not exist');
      agentId = dto.agentId;
    }

    await Promise.all([
      this.assertAirport(dto.originAirportId, 'departure'),
      this.assertAirport(dto.destinationAirportId, 'arrival'),
      this.assertAttachments(user, dto.attachmentUrls),
    ]);

    const created = await this.prisma.referral.create({
      data: {
        ...dto,
        // Always the resolved agent — the session's, for a referral agent.
        agentId,
        // A broker logging one takes it; an agent's lands unassigned, where
        // every broker can see it.
        assignedBrokerId: !partner && user.role === UserRole.BROKER ? user.id : null,
        createdById: user.id,
        updatedById: user.id,
      },
      select: { id: true, reference: true },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'referral.submitted',
      entityType: 'Referral',
      entityId: created.id,
      metadata: { reference: created.reference, agentId },
    });

    return this.findOne(user, created.id);
  }

  private async findLive(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.referral.findFirst({
      where: { id, deletedAt: null, ...this.visibilityScope(user) },
      select: REFERRAL_SELECT,
    });
    if (!row) throw new NotFoundException('Referral not found');
    return row;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateReferralInput) {
    this.assertDesk(user);
    const current = await this.findLive(user, id);

    if (dto.assignedBrokerId !== undefined && dto.assignedBrokerId !== current.assignedBrokerId) {
      // A broker may pick up an unassigned referral for themselves; handing
      // one to somebody else is an administrator's call.
      const takingIt = dto.assignedBrokerId === user.id && current.assignedBrokerId === null;
      if (!takingIt && !this.administers(user)) {
        throw new ForbiddenException('Only an administrator or senior broker can reassign a referral.');
      }
      if (dto.assignedBrokerId) {
        const broker = await this.prisma.user.findFirst({
          where: { id: dto.assignedBrokerId, deletedAt: null },
          select: { role: true },
        });
        if (!broker || broker.role === UserRole.REFERRAL_AGENT) throw new BadRequestException('That broker does not exist');
      }
    }

    let status = dto.status ?? current.status;
    const linking = dto.tripId !== undefined && dto.tripId !== null && dto.tripId !== current.tripId;
    if (linking) {
      if (!current.clientId) {
        throw new BadRequestException('Convert the referral into a client first, then link the trip it booked.');
      }
      await this.trips.assertReferralTarget(user, dto.tripId!, current.clientId);
      // Booking moves it forward unless the same call says otherwise.
      if (!dto.status) status = advance(status, ReferralStatus.BOOKED);
    }

    await this.prisma.referral.update({
      where: { id },
      data: {
        status,
        ...(dto.assignedBrokerId !== undefined ? { assignedBrokerId: dto.assignedBrokerId } : {}),
        ...(dto.tripId !== undefined ? { tripId: dto.tripId } : {}),
        updatedById: user.id,
      },
    });

    if (linking) {
      await this.commissions.raiseForReferral(user, {
        id,
        reference: current.reference,
        agentId: current.agentId,
        tripId: dto.tripId!,
        brokerId: dto.assignedBrokerId === undefined ? current.assignedBrokerId : dto.assignedBrokerId,
      });
    }

    await this.audit.record({
      actorId: user.id,
      action: status !== current.status ? 'referral.status_changed' : 'referral.updated',
      entityType: 'Referral',
      entityId: id,
      metadata: {
        reference: current.reference,
        fields: Object.keys(dto),
        ...(status !== current.status ? { from: current.status, to: status } : {}),
      },
    });

    return this.findOne(user, id);
  }

  /**
   * Turns a referral into the CRM's own records: a client (lead source
   * REFERRAL) and an open trip request carrying the route, dates, party,
   * preference and budget the agent sent. Both are created through their own
   * modules, with their own validation and audit entries. An existing client
   * can be linked instead of creating a duplicate.
   *
   * Converting moves a SUBMITTED referral to CONTACTED — the desk has it —
   * and a broker converting an unassigned one takes it.
   */
  async convert(user: AuthenticatedUser, id: string, dto: ConvertReferralInput) {
    this.assertDesk(user);
    const referral = await this.findLive(user, id);
    if (referral.tripRequestId) {
      throw new ConflictException(`This referral is already converted (TR-${referral.tripRequest?.reference}).`);
    }

    const brokerId = referral.assignedBrokerId ?? (user.role === UserRole.BROKER ? user.id : null);

    let clientId: string;
    if (dto.clientId) {
      // The client's own module decides whether this caller may see them.
      const client = await this.clients.subjectRef(user, dto.clientId);
      if (client.archived) throw new BadRequestException('That client has been archived. Restore them, or choose another.');
      clientId = client.id;
    } else {
      const client = await this.clients.create(user, {
        type: ClientType.DIRECT,
        status: ClientStatus.LEAD,
        firstName: referral.clientFirstName,
        lastName: referral.clientLastName,
        email: referral.clientEmail ?? undefined,
        phone: referral.clientPhone ?? undefined,
        leadSource: LeadSource.REFERRAL,
        leadStage: LeadStage.NEW,
        assignedBrokerId: brokerId ?? undefined,
        preferences: {},
        priority: ClientPriority.MEDIUM,
        labels: [],
      });
      clientId = client.id;
    }

    const agentName = `${referral.agent.firstName} ${referral.agent.lastName}`.trim();
    const request = await this.requests.create(user, {
      clientId,
      source: LeadSource.REFERRAL,
      status: TripRequestStatus.OPEN,
      assignedBrokerId: brokerId,
      originAirportId: referral.originAirportId,
      destinationAirportId: referral.destinationAirportId,
      departureDate: referral.departureDate ?? undefined,
      returnDate: referral.returnDate ?? undefined,
      passengers: referral.passengers ?? undefined,
      aircraftPreference: referral.aircraftPreference ?? undefined,
      estimatedValue: referral.budget === null ? undefined : fromCents(toCents(referral.budget)),
      summary: `Referral RF-${referral.reference} from ${agentName}`.slice(0, 300),
      requirements: [
        referral.departureTime ? `Requested departure time: ${referral.departureTime}` : null,
        referral.notes,
      ]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 2_000) || undefined,
    });

    await this.prisma.referral.update({
      where: { id },
      data: {
        clientId,
        tripRequestId: request.id,
        assignedBrokerId: brokerId,
        status: advance(referral.status, ReferralStatus.CONTACTED),
        updatedById: user.id,
      },
    });

    await this.audit.record({
      actorId: user.id,
      action: 'referral.converted',
      entityType: 'Referral',
      entityId: id,
      metadata: { reference: referral.reference, clientId, tripRequestId: request.id, linkedExistingClient: Boolean(dto.clientId) },
    });

    return this.findOne(user, id);
  }

  /**
   * An attachment's bytes, for whoever may read the referral. The file is
   * the agent's PRIVATE upload, so this is the one place it is opened on
   * someone else's behalf — see `UploadsService.openVouched`.
   */
  async openAttachment(user: AuthenticatedUser, id: string, uploadId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { id, ...this.visibilityScope(user) },
      select: { attachmentUrls: true },
    });
    if (!referral || !referral.attachmentUrls.some((url) => attachmentId(url) === uploadId)) {
      throw new NotFoundException('That file does not exist.');
    }
    return this.uploads.openVouched(uploadId);
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    this.assertMayArchive(user);
    const row = await this.findLive(user, id);
    await this.prisma.referral.update({ where: { id }, data: { ...archiveData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'referral.archived',
      entityType: 'Referral',
      entityId: id,
      metadata: { reference: row.reference },
    });
  }

  async restore(user: AuthenticatedUser, id: string) {
    this.assertMayArchive(user);
    const row = await this.prisma.referral.findFirst({
      where: { id, deletedAt: { not: null }, ...this.visibilityScope(user) },
      select: { id: true, reference: true },
    });
    if (!row) throw new NotFoundException('Archived referral not found');
    await this.prisma.referral.update({ where: { id }, data: { ...restoreData(user.id), updatedById: user.id } });
    await this.audit.record({
      actorId: user.id,
      action: 'referral.restored',
      entityType: 'Referral',
      entityId: id,
      metadata: { reference: row.reference },
    });
    return this.findOne(user, id);
  }

  async removeMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.referral.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.referral.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...archiveData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'referral.bulk_archived',
        entityType: 'Referral',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  async restoreMany(user: AuthenticatedUser, ids: string[]): Promise<BulkResult> {
    this.assertMayArchive(user);
    const targets = await this.prisma.referral.findMany({
      where: { id: { in: ids }, deletedAt: { not: null } },
      select: { id: true, reference: true },
    });
    if (targets.length) {
      await this.prisma.referral.updateMany({
        where: { id: { in: targets.map((row) => row.id) } },
        data: { ...restoreData(user.id), updatedById: user.id },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'referral.bulk_restored',
        entityType: 'Referral',
        metadata: { count: targets.length, references: targets.map((row) => row.reference) },
      });
    }
    return bulkResult(ids, targets.map((row) => row.id));
  }

  /** Archiving is an administrator's call; a broker marks it Lost or Cancelled. */
  private assertMayArchive(user: AuthenticatedUser): void {
    if (!this.administers(user)) {
      throw new ForbiddenException('Only an administrator can archive a referral. Mark it Lost or Cancelled instead.');
    }
  }

  // ---- For other modules ------------------------------------------------

  /**
   * A referral as a notes subject: readable within the caller's scope, or
   * 404. For a referral agent this is their own referrals only — the notes
   * module then shows them the SHARED notes and nothing else.
   */
  async subjectRef(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.referral.findFirst({
      where: { id, ...this.visibilityScope(user), ...(isPartner(user.role) ? { deletedAt: null } : {}) },
      select: { id: true, reference: true, deletedAt: true },
    });
    if (!row) throw new NotFoundException('Referral not found');
    return { id: row.id, label: `RF-${row.reference}`, archived: row.deletedAt !== null };
  }
}
