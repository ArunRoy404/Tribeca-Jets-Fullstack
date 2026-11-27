import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CommissionBasis, CommissionRecipientType, CommissionStatus, PaymentMethod, UserRole } from '../../generated/prisma/enums.js';
import { resolveAccess } from '../../common/authorization/access.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CreateCommissionDto, UpdateCommissionDto, updateCommissionSchema } from './dto/commission.dto.js';
import { CommissionsService } from './commissions.service.js';

const user = { id: 'owner', role: UserRole.SUPER_ADMIN, email: 'owner@example.com', access: resolveAccess(UserRole.SUPER_ADMIN, null) };
const tripId = '11111111-1111-4111-8111-111111111111';

describe('commission payout workflow', () => {
  it.each([
    [CreateCommissionDto, { tripId, recipientType: 'MANUAL', recipientName: 'Agent', status: 'PAID' }],
    [UpdateCommissionDto, { status: 'PAID', method: null }],
  ])('PAID without a method is a field-level 400 through the DTO', (metatype, body) => {
    const pipe = new ZodValidationPipe();
    try {
      pipe.transform(body, { type: 'body', metatype });
      expect.fail('Expected 400');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({ errors: { method: expect.any(String) } });
    }
  });

  it('trims and bounds the reference and accepts only a calendar paid date', () => {
    expect(updateCommissionSchema.parse({ status: 'PAID', method: 'ACH', paymentReference: '  ACH-982  ', paidAt: '2026-11-27' }))
      .toMatchObject({ paymentReference: 'ACH-982', paidAt: new Date('2026-11-27T00:00:00Z') });
    expect(updateCommissionSchema.safeParse({ paymentReference: 'x'.repeat(121) }).success).toBe(false);
    expect(updateCommissionSchema.safeParse({ paidAt: 'yesterday' }).success).toBe(false);
  });

  it('leaves an omitted method to the service when updating PAID', () => {
    expect(updateCommissionSchema.parse({ status: 'PAID' })).toEqual({ status: 'PAID' });
  });

  function setup(status: CommissionStatus = CommissionStatus.EARNED, method: PaymentMethod | null = null) {
    let row = { id: 'commission', reference: 51, tripId, recipientType: CommissionRecipientType.REFERRAL_AGENT,
      basis: CommissionBasis.FLAT_FEE, amount: 1500, finalAmount: null, percentage: null, status,
      method, paidAt: null, paymentReference: null,
      trip: { id: tripId, reference: 42, client: null, basePrice: 10000, fetEnabled: false, fetRate: 0, operatorCost: 9000, lineItems: [] } };
    const commission = { findFirst: vi.fn(async (_query: unknown) => row), update: vi.fn(async ({ data }) => { row = { ...row, ...data }; return row; }) };
    const audit = { record: vi.fn() };
    const service = new CommissionsService({ commission } as never, audit as never, {} as never);
    return { service, commission, audit };
  }

  it.each([CommissionStatus.PENDING, CommissionStatus.EARNED])('refuses %s to PAID without a method before writing', async (status) => {
    const { service, commission, audit } = setup(status);
    await expect(service.update(user, 'commission', { status: 'PAID' })).rejects.toMatchObject({
      status: 400, response: { errors: { method: expect.any(String) } },
    });
    expect(commission.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([
    { notes: 'Paid by the old desk' },
    { status: CommissionStatus.PAID, notes: 'Paid by the old desk' },
  ])('accepts an unrelated edit of a legacy PAID row: %j', async (body) => {
    const { service, commission } = setup(CommissionStatus.PAID);
    expect(await service.update(user, 'commission', updateCommissionSchema.parse(body)))
      .toMatchObject({ status: CommissionStatus.PAID, method: null, notes: body.notes });
    expect(commission.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      data: expect.objectContaining({ notes: body.notes }),
    }));
    expect(commission.update.mock.calls[0]?.[0].data).not.toHaveProperty('method');
  });

  it.each([
    [null, { status: CommissionStatus.PAID, method: null }],
    [null, { method: null }],
    [PaymentMethod.ACH, { method: null }],
  ])('refuses clearing method %s on a PAID row with %j before writing', async (method, body) => {
    const { service, commission, audit } = setup(CommissionStatus.PAID, method);
    await expect(service.update(user, 'commission', body)).rejects.toMatchObject({
      status: 400, response: { errors: { method: expect.any(String) } },
    });
    expect(commission.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it.each([CommissionStatus.PENDING, CommissionStatus.EARNED, CommissionStatus.PAID])('keeps a stored method when %s is saved as PAID without one', async (status) => {
    const { service, commission } = setup(status, PaymentMethod.ACH);
    expect(await service.update(user, 'commission', updateCommissionSchema.parse({ status: 'PAID' })))
      .toMatchObject({ status: CommissionStatus.PAID, method: PaymentMethod.ACH });
    expect(commission.update).toHaveBeenCalledOnce();
    expect(commission.update.mock.calls[0]?.[0].data).not.toHaveProperty('method');
  });

  it('stores the reference and method, audits them, and returns them in the partner view', async () => {
    const { service, commission, audit } = setup();
    const result = await service.update(user, 'commission', { status: 'PAID', method: 'WIRE_TRANSFER', paymentReference: 'WIRE-450', paidAt: new Date('2026-11-27') });
    expect(result).toMatchObject({ method: 'WIRE_TRANSFER', paymentReference: 'WIRE-450', paidAt: new Date('2026-11-27') });
    expect(commission.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentReference: 'WIRE-450' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ method: 'WIRE_TRANSFER', paymentReference: 'WIRE-450' }) }));
    const partner = { ...user, role: UserRole.REFERRAL_AGENT, access: resolveAccess(UserRole.REFERRAL_AGENT, null) };
    const view = await service.findOne(partner, 'commission');
    expect(view).toMatchObject({ method: 'WIRE_TRANSFER', paymentReference: 'WIRE-450', paidAt: new Date('2026-11-27') });
    expect(view).not.toHaveProperty('notes');
    expect(view).not.toHaveProperty('broker');
    expect(view.trip).not.toHaveProperty('operatorCost');
    expect(commission.findFirst.mock.calls.at(-1)?.[0]).toMatchObject({ select: { paymentReference: true, method: true, paidAt: true } });
  });
});
