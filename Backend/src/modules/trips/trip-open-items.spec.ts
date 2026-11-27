import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ACCESS_KEY, STAFF_ONLY_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import { TripOpenItemsController } from './trip-open-items.module.js';

describe('trip open-items warning', () => {
  function setup(totalPrice: number | null = 10000, payableCount = 1) {
    const trips = { findOne: vi.fn().mockResolvedValue({ id: 'trip', totalPrice, operatorId: 'operator' }) };
    const payables = { positionOnTrip: vi.fn().mockResolvedValue({ balance: 2000, payableCount }) };
    const receivables = { invoicedCentsByTrip: vi.fn().mockResolvedValue(new Map([['trip', 600000]])) };
    const controller = new TripOpenItemsController(trips as never, payables as never, receivables as never);
    return { controller, trips, payables, receivables };
  }
  const user = (actions: boolean) => ({ id: 'u', access: actions ? {
    [Module.OPERATOR_PAYMENTS]: { reach: Reach.ALL, actions: [Action.VIEW] },
    [Module.RECEIVABLES]: { reach: Reach.ALL, actions: [Action.VIEW] },
  } : {} }) as never;

  it('is a staff-only session read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, TripOpenItemsController)).toBe(true);
    expect(Reflect.getMetadata(ACCESS_KEY, Object.getOwnPropertyDescriptor(TripOpenItemsController.prototype, 'openItems')!.value)).toBeUndefined();
  });
  it('reads each owner, clamps uninvoiced in cents, and returns permitted amounts', async () => {
    const { controller, trips, payables, receivables } = setup();
    expect(await controller.openItems(user(true), 'trip')).toEqual({ operatorUnpaid: true, operatorBalance: 2000, uninvoiced: 4000, uninvoicedOpen: true });
    expect(trips.findOne).toHaveBeenCalledWith(user(true), 'trip');
    expect(payables.positionOnTrip).toHaveBeenCalledWith('trip');
    expect(receivables.invoicedCentsByTrip).toHaveBeenCalledWith(['trip']);
  });
  it('keeps warning flags but hides figures without the relevant permissions', async () => {
    const { controller } = setup();
    expect(await controller.openItems(user(false), 'trip')).toEqual({ operatorUnpaid: true, operatorBalance: null, uninvoiced: null, uninvoicedOpen: true });
  });
  it('never uses one money permission as authority for the other', async () => {
    const { controller } = setup();
    expect(await controller.openItems({ id: 'u', access: { [Module.RECEIVABLES]: { reach: Reach.ALL, actions: [Action.VIEW] } } } as never, 'trip'))
      .toMatchObject({ operatorBalance: null, uninvoiced: 4000 });
  });
  it('uses honest nulls for unpriced trips and unrecorded operator bills', async () => {
    const { controller } = setup(null, 0);
    expect(await controller.openItems(user(true), 'trip')).toEqual({ operatorUnpaid: true, operatorBalance: null, uninvoiced: null, uninvoicedOpen: false });
  });
  it('reports nothing open when all invoices and operator payments are complete', async () => {
    const { controller, payables } = setup(6000);
    payables.positionOnTrip.mockResolvedValue({ balance: 0, payableCount: 1 });
    expect(await controller.openItems(user(true), 'trip')).toEqual({ operatorUnpaid: false, operatorBalance: 0, uninvoiced: 0, uninvoicedOpen: false });
  });
  it('does not read money owners for an out-of-scope trip', async () => {
    const { controller, trips, payables, receivables } = setup();
    trips.findOne.mockRejectedValue(new NotFoundException('Trip not found'));
    await expect(controller.openItems(user(true), 'hidden')).rejects.toBeInstanceOf(NotFoundException);
    expect(payables.positionOnTrip).not.toHaveBeenCalled();
    expect(receivables.invoicedCentsByTrip).not.toHaveBeenCalled();
  });
});
