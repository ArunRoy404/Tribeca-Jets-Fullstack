import { describe, expect, it, vi } from 'vitest';
import { QueryWhatsappHistoryDto, QueryWhatsappPhonesDto } from './dto/whatsapp-settings.dto.js';
import { WhatsappEvent } from './whatsapp-history.events.js';
import { WhatsappHistoryService } from './whatsapp-history.service.js';

const userId = 'user-fixture';
const phoneId = '00000000-0000-4000-8000-000000000001';
const proposalId = '00000000-0000-4000-8000-000000000002';
const at = new Date('2026-11-20T10:00:00Z');
const event = {
  id: 'event-fixture', entityType: 'WhatsappPhone', entityId: phoneId, createdAt: at,
};
const metadata = { last4: '4567', label: 'Work', fullNumber: '15551234567', reply: 'private', secret: 'secret' };
const historySchema = QueryWhatsappHistoryDto.zodSchema;

function setup(rows: object[], outcomes: object[] = [], timeZone: string | null = 'Asia/Dhaka') {
  const findMany = vi.fn().mockResolvedValueOnce(rows).mockResolvedValueOnce(outcomes);
  const count = vi.fn().mockResolvedValue(rows.length);
  const phones = vi.fn().mockResolvedValue([{ id: phoneId }]);
  const user = { findUnique: vi.fn().mockResolvedValue({ timeZone }) };
  const settings = { read: vi.fn().mockResolvedValue({ companyTimeZone: 'America/New_York' }) };
  const history = new WhatsappHistoryService(
    { auditLog: { findMany, count }, whatsappPhone: { findMany: phones }, user } as never,
    settings as never,
  );
  return { history, findMany, count, phones };
}

describe('WhatsApp history', () => {
  it('rejects unknown filters and invalid bounds and accepts explicitly archived phones', () => {
    expect(historySchema.safeParse({ search: '' }).success).toBe(false);
    expect(historySchema.safeParse({ sortOrder: 'desc' }).success).toBe(false);
    expect(historySchema.safeParse({ from: '2026-11-21', to: '2026-11-20' }).success).toBe(false);
    expect(historySchema.safeParse({ phoneId: 'bad-id' }).success).toBe(false);
    expect(QueryWhatsappPhonesDto.zodSchema.parse({ includeArchived: 'true', limit: '25' }))
      .toEqual({ page: 1, limit: 25, includeArchived: true });
  });

  it('reads the days on the company calendar when the reader has no zone', async () => {
    const { history, findMany } = setup([], [], null);
    await history.list(userId, historySchema.parse({ from: '2026-11-19', to: '2026-11-19' }));
    // New York is UTC-5 in November: its 19th runs 05:00Z to 05:00Z.
    expect(findMany.mock.calls[0][0].where.createdAt)
      .toEqual({ gte: new Date('2026-11-19T05:00:00Z'), lt: new Date('2026-11-20T05:00:00Z') });
  });

  it('scopes filters before paging and includes the whole end date', async () => {
    const { history, findMany, count, phones } = setup([]);
    const query = historySchema.parse({ phoneId, type: 'documents', page: '2', limit: '5', from: '2026-11-19', to: '2026-11-20' });
    const result = await history.list(userId, query);
    expect(phones).toHaveBeenCalledExactlyOnceWith({ where: { userId, id: phoneId }, select: { id: true } });
    expect(findMany).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: {
        actorId: userId, action: { in: [WhatsappEvent.DOCUMENT_SENT] },
        // The reader's own days (Dhaka, UTC+6): the 19th from 18 Nov 18:00Z
        // to the end of the 20th, 20 Nov 18:00Z.
        createdAt: { gte: new Date('2026-11-18T18:00:00Z'), lt: new Date('2026-11-20T18:00:00Z') },
        OR: [expect.objectContaining({ entityType: 'WhatsappPhone', entityId: { in: [phoneId] } })],
      },
      skip: 5, take: 5, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(result.meta).toEqual({ page: 2, limit: 5, total: 0, totalPages: 0, hasNext: false, hasPrevious: true });
  });

  it('returns explicit metadata fields and keeps legacy events unattributed', async () => {
    const { history, findMany } = setup([
      { ...event, action: WhatsappEvent.QUESTION_ANSWERED, metadata: { ...metadata, tools: ['list_flights', false], results: ['private'] } },
      { ...event, action: WhatsappEvent.DOCUMENT_SENT, metadata: { ...metadata, kind: 'quote', ref: 'Q-17', filename: 'private.pdf' } },
      { ...event, entityType: 'User', entityId: userId, action: WhatsappEvent.PHONE_LINKED, metadata: { last4: '1049' } },
      { ...event, entityType: 'User', entityId: userId, action: WhatsappEvent.PHONE_UNLINKED, metadata: { fields: ['whatsappPhone'] } },
      { ...event, entityType: 'WhatsappSettings', entityId: '1', action: WhatsappEvent.SETTINGS_UPDATED,
        metadata: { fields: ['openaiApiKey', 'extra'], secret: 'private' } },
    ]);
    const { items } = await history.list(userId, historySchema.parse({}));
    expect(findMany.mock.calls[0][0].where.OR).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'User', entityId: userId }),
      expect.objectContaining({ entityType: 'WhatsappSettings', entityId: '1' }),
    ]));
    expect(items.map(({ phone, details }) => ({ phone, details }))).toEqual([
      { phone: { id: phoneId, label: 'Work', last4: '4567' }, details: { tools: ['list_flights'] } },
      { phone: { id: phoneId, label: 'Work', last4: '4567' }, details: { kind: 'quote', ref: 'Q-17' } },
      { phone: null, details: { beforePhoneNames: true, last4: '1049' } },
      { phone: null, details: { beforePhoneNames: true } },
      { phone: null, details: { fields: ['openaiApiKey'] } },
    ]);
  });

  it.each([true, false])('recognises expiry and looks for a resolving event outside the page (%s)', async (hasResolution) => {
    const { history, findMany } = setup([
      { ...event, action: WhatsappEvent.ACTION_PROPOSED, metadata: { ...metadata, kind: 'TASK_CREATE', proposalId, ref: null } },
    ], hasResolution ? [{ metadata: { proposalId } }] : []);
    const query = historySchema.parse({ type: 'actions', to: '2026-11-20' });
    const { items } = await history.list(userId, query, at.getTime() + 300_000);
    expect(items[0].details).toEqual({ proposalId, kind: 'TASK_CREATE', ref: null, notConfirmed: !hasResolution });
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: {
        actorId: userId, entityType: 'WhatsappPhone',
        action: { in: [WhatsappEvent.ACTION_CONFIRMED, WhatsappEvent.ACTION_CANCELLED] },
        OR: [{ entityId: phoneId, createdAt: { gte: at }, metadata: { path: ['proposalId'], equals: proposalId } }],
      },
    }));
  });
});
