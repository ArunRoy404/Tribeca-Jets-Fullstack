import { Injectable } from '@nestjs/common';
import { DEFAULT_TIME_ZONE, momentIn } from '../../common/dates/time-zone.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { paginate } from '../../common/types/api.types.js';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { SettingsService } from '../settings/settings.service.js';
import { WHATSAPP_SECRET_FIELDS, type QueryWhatsappHistoryDto } from './dto/whatsapp-settings.dto.js';
import { LEGACY_PHONE_EVENTS, PHONE_EVENTS, SETTINGS_ROW_EVENTS, WHATSAPP_HISTORY_GROUPS, WhatsappEvent } from './whatsapp-history.events.js';
import { WHATSAPP_SETTINGS_ID } from './whatsapp-settings.service.js';
import { PENDING_TTL_SECONDS } from './whatsapp.pending.js';

const EVENT_SELECT = { id: true, createdAt: true, action: true, entityType: true, entityId: true, metadata: true } satisfies Prisma.AuditLogSelect;
type EventRow = Prisma.AuditLogGetPayload<{ select: typeof EVENT_SELECT }>;
const CONFIRM_OR_CANCEL = [WhatsappEvent.ACTION_CONFIRMED, WhatsappEvent.ACTION_CANCELLED];
const SETTINGS_FIELDS = new Set<string>([...WHATSAPP_SECRET_FIELDS, 'openaiModel', 'graphVersion', 'phoneNumberId']);

function metadataOf(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function lastFour(value: unknown) {
  return typeof value === 'string' && /^\d{4}$/.test(value) ? value : undefined;
}

function eventView(row: EventRow, resolved: Set<string>, now: number) {
  const meta = metadataOf(row.metadata);
  const label = text(meta.label);
  const last4 = lastFour(meta.last4);
  const phone = row.entityType === 'WhatsappPhone' && row.entityId && label && last4
    ? { id: row.entityId, label, last4 }
    : null;
  const proposalId = text(meta.proposalId);
  const proposal = { proposalId, kind: text(meta.kind), ref: text(meta.ref) ?? null };
  let details: Record<string, unknown>;
  switch (row.action) {
    case WhatsappEvent.QUESTION_ANSWERED:
      details = { tools: Array.isArray(meta.tools) ? meta.tools.filter((name) => typeof name === 'string') : [] };
      break;
    case WhatsappEvent.ACTION_PROPOSED:
      details = {
        ...proposal,
        notConfirmed: !!proposalId && !resolved.has(proposalId) && now - row.createdAt.getTime() >= PENDING_TTL_SECONDS * 1000,
      };
      break;
    case WhatsappEvent.ACTION_CONFIRMED:
      details = { ...proposal, outcome: meta.outcome === 'done' || meta.outcome === 'refused' ? meta.outcome : undefined };
      break;
    case WhatsappEvent.ACTION_CANCELLED:
      details = proposal;
      break;
    case WhatsappEvent.DOCUMENT_SENT:
      details = { kind: text(meta.kind), ref: text(meta.ref) };
      break;
    case WhatsappEvent.SETTINGS_UPDATED:
      details = { fields: Array.isArray(meta.fields) ? meta.fields.filter((field) => typeof field === 'string' && SETTINGS_FIELDS.has(field)) : [] };
      break;
    case WhatsappEvent.SETTINGS_REVEALED: {
      const field = text(meta.field);
      details = field && SETTINGS_FIELDS.has(field) ? { field } : {};
      break;
    }
    case WhatsappEvent.PHONE_LINKED:
    case WhatsappEvent.PHONE_UNLINKED:
      details = row.entityType === 'User' ? { beforePhoneNames: true, ...(last4 && { last4 }) } : {};
      break;
    default:
      details = {};
  }
  return { id: row.id, at: row.createdAt, action: row.action, phone, details };
}

@Injectable()
export class WhatsappHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * `from` / `to` are days on the reader's own calendar — their time zone,
   * else the company's — not UTC days. The History tab shows times in local
   * time, so a UTC day cut a Dhaka evening's entries off the day they read as.
   */
  private async dayRange(userId: string, query: QueryWhatsappHistoryDto) {
    if (!query.from && !query.to) return undefined;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
    const zone = user?.timeZone ?? (await this.settings.read()).companyTimeZone ?? DEFAULT_TIME_ZONE;
    const day = (value: Date) => value.toISOString().slice(0, 10);
    const nextDay = (value: Date) => day(new Date(value.getTime() + 86_400_000));
    return {
      gte: query.from ? momentIn(day(query.from), '00:00', zone) ?? undefined : undefined,
      lt: query.to ? momentIn(nextDay(query.to), '00:00', zone) ?? undefined : undefined,
    };
  }

  async list(userId: string, query: QueryWhatsappHistoryDto, now = Date.now()) {
    const phones = await this.prisma.whatsappPhone.findMany({
      where: { userId, ...(query.phoneId && { id: query.phoneId }) }, select: { id: true },
    });
    const phoneScope = { entityType: 'WhatsappPhone', entityId: { in: phones.map(({ id }) => id) } };
    const createdAt = await this.dayRange(userId, query);

    const where: Prisma.AuditLogWhereInput = {
      actorId: userId,
      ...(query.type && { action: { in: WHATSAPP_HISTORY_GROUPS[query.type] } }),
      ...(createdAt && { createdAt }),
      OR: [
        { ...phoneScope, action: { in: PHONE_EVENTS } },
        ...(!query.phoneId ? [
          { entityType: 'WhatsappSettings', entityId: String(WHATSAPP_SETTINGS_ID), action: { in: SETTINGS_ROW_EVENTS } },
          { entityType: 'User', entityId: userId, action: { in: LEGACY_PHONE_EVENTS } },
        ] : []),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, select: EVENT_SELECT, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...toPrismaPagination(query),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const unresolved = rows.flatMap((row) => {
      if (row.action !== WhatsappEvent.ACTION_PROPOSED || now - row.createdAt.getTime() < PENDING_TTL_SECONDS * 1000) return [];
      const proposalId = text(metadataOf(row.metadata).proposalId);
      return proposalId ? [{
        entityId: row.entityId, createdAt: { gte: row.createdAt }, metadata: { path: ['proposalId'], equals: proposalId },
      }] : [];
    });
    // A resolution can be on a different page or outside the selected date window.
    const resolutions = unresolved.length ? await this.prisma.auditLog.findMany({
      where: { actorId: userId, entityType: 'WhatsappPhone', action: { in: CONFIRM_OR_CANCEL }, OR: unresolved },
      select: { metadata: true },
    }) : [];
    const resolved = new Set(resolutions.flatMap((row) => text(metadataOf(row.metadata).proposalId) ?? []));
    return paginate(rows.map((row) => eventView(row, resolved, now)), total, query.page, query.limit);
  }
}
