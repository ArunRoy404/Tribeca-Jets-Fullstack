import { describe, expect, it, vi } from 'vitest';
import { OperatorsService } from './operators.service.js';
import { createOperatorSchema, updateOperatorSchema } from './dto/operator.dto.js';

describe('operator OA required is three-valued', () => {
  it.each([null, true, false])('round-trips %s through both DTOs, writes and selects', async (oaRequired) => {
    // A create omits Not set rather than sending null; only an edit sends null, to clear.
    const dto = createOperatorSchema.parse({ name: 'Probe Aviation', homeBase: 'KTEB', primaryContact: 'Alex Stone', contactEmail: 'alex@example.com',
      ...(oaRequired === null ? {} : { oaRequired }) });
    expect(dto.oaRequired).toBe(oaRequired ?? undefined);
    expect(updateOperatorSchema.parse({ oaRequired }).oaRequired).toBe(oaRequired);
    const operator = { create: vi.fn(async ({ data }) => ({ id: 'op', ...data })),
      update: vi.fn(async ({ data }) => ({ id: 'op', ...data })), findFirst: vi.fn().mockResolvedValue({ id: 'op' }) };
    const service = new OperatorsService({ operator } as never, { record: vi.fn() } as never, {} as never, {} as never,
      { countByOperator: vi.fn().mockResolvedValue(new Map()) } as never, {} as never);
    const user = { id: 'u', access: {} } as never;
    expect((await service.create(user, dto)).oaRequired).toBe(oaRequired ?? undefined);
    expect(await service.update(user, 'op', updateOperatorSchema.parse({ oaRequired }))).toMatchObject({ oaRequired });
    expect(operator.create).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ oaRequired: true }) }));
    expect(operator.update).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ oaRequired: true }) }));
  });
  it('has no default on either DTO and never coerces strings', () => {
    expect(createOperatorSchema.parse({ name: 'Probe Aviation', homeBase: 'KTEB', primaryContact: 'Alex Stone', contactEmail: 'alex@example.com' })).not.toHaveProperty('oaRequired');
    expect(updateOperatorSchema.parse({ name: 'New name' })).not.toHaveProperty('oaRequired');
    expect(updateOperatorSchema.safeParse({ oaRequired: 'false' }).success).toBe(false);
    expect(createOperatorSchema.safeParse({ name: 'Probe Aviation', homeBase: 'KTEB', primaryContact: 'Alex Stone', contactEmail: 'alex@example.com', oaRequired: null }).success).toBe(false);
  });
});
