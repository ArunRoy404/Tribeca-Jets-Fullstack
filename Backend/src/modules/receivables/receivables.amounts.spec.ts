import { describe, expect, it } from 'vitest';
import { InvoiceStatus } from '../../generated/prisma/enums.js';
import {
  InvoiceState,
  TripPaymentState,
  invoiceFigures,
  invoiceNumber,
  paymentProblem,
  referenceFromSearch,
  tally,
  todayUtc,
  tripPayment,
} from './receivables.amounts.js';

const TODAY = new Date('2026-09-28T00:00:00.000Z');
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const invoice = (
  overrides: Partial<{
    amount: number | string;
    fetAmount: number | string;
    status: InvoiceStatus;
    dueDate: Date | null;
    payments: { amount: number | string }[];
  }> = {},
) => ({
  amount: 10_000,
  fetAmount: 750,
  status: InvoiceStatus.SENT,
  dueDate: day('2026-10-15'),
  payments: [],
  ...overrides,
});

describe('invoiceFigures', () => {
  it('totals the charge and the FET, and nets the payments off it', () => {
    const figures = invoiceFigures(invoice({ payments: [{ amount: 2_000 }, { amount: '1000.25' }] }), TODAY);
    expect(figures).toEqual({ total: 10_750, paid: 3_000.25, balance: 7_749.75, state: InvoiceState.PARTIALLY_PAID });
  });

  it('adds in cents, so decimal strings do not drift', () => {
    const figures = invoiceFigures(invoice({ amount: '0.10', fetAmount: '0.20', payments: [] }), TODAY);
    expect(figures.total).toBe(0.3);
  });

  it('is DUE when sent, nothing is in and the day has not passed', () => {
    expect(invoiceFigures(invoice(), TODAY).state).toBe(InvoiceState.DUE);
  });

  it('is DUE on its due date, and OVERDUE the day after', () => {
    expect(invoiceFigures(invoice({ dueDate: day('2026-09-28') }), TODAY).state).toBe(InvoiceState.DUE);
    expect(invoiceFigures(invoice({ dueDate: day('2026-09-27') }), TODAY).state).toBe(InvoiceState.OVERDUE);
  });

  it('is OVERDUE when late even with part of it paid', () => {
    const late = invoice({ dueDate: day('2026-09-01'), payments: [{ amount: 500 }] });
    expect(invoiceFigures(late, TODAY).state).toBe(InvoiceState.OVERDUE);
  });

  it('is PAID once the payments reach the total, however late they came', () => {
    const paid = invoice({ dueDate: day('2026-09-01'), payments: [{ amount: 10_750 }] });
    expect(invoiceFigures(paid, TODAY)).toMatchObject({ balance: 0, state: InvoiceState.PAID });
  });

  it('is never overdue without a due date', () => {
    expect(invoiceFigures(invoice({ dueDate: null }), TODAY).state).toBe(InvoiceState.DUE);
  });

  it('keeps a draft a draft, even past its due date', () => {
    expect(invoiceFigures(invoice({ status: InvoiceStatus.DRAFT, dueDate: day('2026-01-01') }), TODAY).state).toBe(
      InvoiceState.DRAFT,
    );
  });

  it('keeps a cancelled invoice cancelled', () => {
    expect(invoiceFigures(invoice({ status: InvoiceStatus.CANCELLED }), TODAY).state).toBe(InvoiceState.CANCELLED);
  });
});

describe('paymentProblem', () => {
  it('accepts a payment up to what is still owed', () => {
    expect(paymentProblem(1_075_000, 75_000, 1_000_000)).toBeNull();
  });

  it('refuses a payment past the total, naming what is owed', () => {
    expect(paymentProblem(1_075_000, 75_000, 1_000_001)).toContain('$10,000.00');
  });

  it('says so when nothing is owed at all', () => {
    expect(paymentProblem(1_075_000, 1_075_000, 1)).toBe('This invoice is already paid in full.');
  });
});

describe('invoiceNumber and referenceFromSearch', () => {
  it('formats the year of creation and a padded sequence', () => {
    expect(invoiceNumber(42, new Date('2026-03-01T12:00:00.000Z'))).toBe('INV-2026-0042');
    expect(invoiceNumber(12_345, new Date('2027-01-01T00:00:00.000Z'))).toBe('INV-2027-12345');
  });

  it('reads the sequence back from every way a person types it', () => {
    for (const term of ['INV-2026-0042', 'inv-2026-42', 'INV-42', 'INV42', '0042', '42']) {
      expect(referenceFromSearch(term)).toBe(42);
    }
  });

  it('names nothing for a term that is not an invoice number', () => {
    expect(referenceFromSearch('Morgan')).toBeNull();
    expect(referenceFromSearch('INV-0000')).toBeNull();
  });
});

describe('tally', () => {
  it('counts sent invoices as invoiced, drafts as nothing, cancelled as owed by nobody', () => {
    const totals = tally(
      [
        invoice({ payments: [{ amount: 750 }] }),
        invoice({ status: InvoiceStatus.DRAFT }),
        invoice({ status: InvoiceStatus.CANCELLED }),
        invoice({ dueDate: day('2026-09-01') }),
        invoice({ amount: 5_000, fetAmount: 0, payments: [{ amount: 5_000 }] }),
      ],
      TODAY,
    );
    expect(totals).toMatchObject({
      invoiced: 26_500,
      collected: 5_750,
      outstanding: 20_750,
      overdue: 10_750,
      overdueCount: 1,
      count: 5,
    });
    expect(totals.counts).toMatchObject({
      [InvoiceState.PARTIALLY_PAID]: 1,
      [InvoiceState.DRAFT]: 1,
      [InvoiceState.CANCELLED]: 1,
      [InvoiceState.OVERDUE]: 1,
      [InvoiceState.PAID]: 1,
      [InvoiceState.DUE]: 0,
    });
  });
});

describe('tripPayment', () => {
  it('is NOT_INVOICED with only drafts and cancelled invoices', () => {
    const result = tripPayment(
      [invoice({ status: InvoiceStatus.DRAFT }), invoice({ status: InvoiceStatus.CANCELLED })],
      TODAY,
    );
    expect(result).toEqual({ state: TripPaymentState.NOT_INVOICED, invoiced: 0, paid: 0, balance: 0, invoiceCount: 0 });
  });

  it('sums across invoices — a paid deposit and an open balance invoice', () => {
    const result = tripPayment(
      [invoice({ amount: 5_000, fetAmount: 0, payments: [{ amount: 5_000 }] }), invoice()],
      TODAY,
    );
    expect(result).toEqual({
      state: TripPaymentState.PARTIALLY_PAID,
      invoiced: 15_750,
      paid: 5_000,
      balance: 10_750,
      invoiceCount: 2,
    });
  });

  it('is OVERDUE when any invoice is late', () => {
    expect(tripPayment([invoice({ payments: [{ amount: 10_750 }] }), invoice({ dueDate: day('2026-09-01') })], TODAY).state).toBe(
      TripPaymentState.OVERDUE,
    );
  });

  it('is PAID when every sent invoice is', () => {
    expect(tripPayment([invoice({ payments: [{ amount: 10_750 }] })], TODAY).state).toBe(TripPaymentState.PAID);
  });
});

describe('todayUtc', () => {
  it('is midnight UTC on the current UTC day', () => {
    expect(todayUtc(new Date('2026-09-28T23:59:59.000Z')).toISOString()).toBe('2026-09-28T00:00:00.000Z');
  });
});
