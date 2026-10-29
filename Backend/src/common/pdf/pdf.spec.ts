import { describe, expect, it } from 'vitest';
import {
  clientDisplayName,
  DASH,
  formatPdfDate,
  formatPdfMoney,
  formatPdfPercent,
  type PdfCompanyBrand,
} from './pdf.document.js';
import {
  renderBrandingPreviewPdf,
  renderInvoicePdf,
  renderItineraryPdf,
  renderOperationsReportPdf,
  renderQuotePdf,
} from './pdf.templates.js';

const BRAND_FULL: PdfCompanyBrand = {
  companyName: 'Tribeca Jets',
  contact: {
    email: 'fly@example.com',
    website: 'www.example.com',
    phone: '+1 (212) 555-0100',
    address: 'New York, NY',
    clientServicesLabel: 'Tribeca Jets Client Services',
  },
  showLogo: true,
  showBrokerContact: true,
  defaultQuoteTerms: 'Subject to owner approval and slot availability.',
  logoBuffer: null,
};

const BRAND_MINIMAL: PdfCompanyBrand = {
  companyName: 'Tribeca Jets',
  contact: null,
  showLogo: false,
  showBrokerContact: false,
  defaultQuoteTerms: null,
  logoBuffer: null,
};

describe('common/pdf', () => {
  it('formats dates, money, percentages and client names with honest dashes for missing values', () => {
    expect(formatPdfDate(null)).toBe(DASH);
    expect(formatPdfDate('2026-10-29T00:00:00.000Z')).toBe('Oct 29, 2026');
    expect(formatPdfMoney(null)).toBe(DASH);
    expect(formatPdfMoney(82500)).toBe('$82,500.00');
    expect(formatPdfPercent(null)).toBe(DASH);
    expect(formatPdfPercent(15.25)).toBe('15.3%');
    expect(clientDisplayName({ firstName: 'Jane', lastName: 'Doe', companyName: 'Acme Corp' })).toBe(
      'Jane Doe (Acme Corp)',
    );
  });

  it('renders a valid Quote PDF with built-in vector logo and full branding', async () => {
    const pdf = await renderQuotePdf(
      {
        reference: 1042,
        version: 2,
        status: 'SENT',
        validUntil: '2026-11-05T00:00:00.000Z',
        departureDate: '2026-11-12T00:00:00.000Z',
        returnDate: '2026-11-15T00:00:00.000Z',
        passengers: 6,
        basePrice: 82500,
        fetEnabled: true,
        fetRate: 0.075,
        fetAmount: 6187.5,
        extrasTotal: 1200,
        totalPrice: 89887.5,
        depositAmount: 20000,
        lineItems: [{ description: 'De-icing Allowance', amount: 1200 }],
        client: { firstName: 'Alexander', lastName: 'Sterling', companyName: 'Sterling Capital', email: 'alex@example.com' },
        assignedBroker: { firstName: 'Barry', lastName: 'Broker', email: 'barry@example.com', phone: '+1 212 555 0199' },
        originAirport: { icao: 'KTEB', name: 'Teterboro', city: 'Teterboro' },
        destinationAirport: { icao: 'EGGW', name: 'London Luton', city: 'London' },
        aircraft: { tailNumber: 'N650TJ', model: 'Gulfstream G650ER', category: 'ULTRA_LONG_RANGE', maxPassengers: 14 },
        operator: { name: 'Executive Jet Management' },
      },
      BRAND_FULL,
    );

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });

  it('renders a valid Passenger Itinerary PDF with legs, FBOs and passenger manifest', async () => {
    const pdf = await renderItineraryPdf(
      {
        tripReference: 'TJ-1048',
        status: 'CONFIRMED',
        tripStatus: 'CONFIRMED',
        departureDate: '2026-11-12T00:00:00.000Z',
        departureTime: '09:30',
        arrivalTime: '21:15',
        flightTime: '6h 45m',
        miles: '3,465',
        departureFbo: 'Signature Flight Support South',
        arrivalFbo: 'Harrods Aviation',
        catering: 'Cold poached salmon & seasonal fruit platter',
        groundTransport: 'Chauffeured Mercedes-Maybach S680 planeside',
        client: { firstName: 'Alexander', lastName: 'Sterling' },
        assignedBroker: { firstName: 'Barry', lastName: 'Broker', email: 'barry@example.com' },
        operator: { name: 'Executive Jet Management' },
        aircraft: { tailNumber: 'N650TJ', model: 'Gulfstream G650ER' },
        originAirport: { icao: 'KTEB', city: 'Teterboro', name: 'Teterboro' },
        destinationAirport: { icao: 'EGGW', city: 'London', name: 'Luton' },
        legs: [
          {
            sequence: 1,
            originAirport: { icao: 'KTEB' },
            destinationAirport: { icao: 'EGGW' },
            departureDate: '2026-11-12T00:00:00.000Z',
            departureTime: '09:30',
          },
          {
            sequence: 2,
            originAirport: { icao: 'EGGW' },
            destinationAirport: { icao: 'KTEB' },
            departureDate: '2026-11-15T00:00:00.000Z',
            departureTime: '14:00',
          },
        ],
        passengers: [
          { fullName: 'Alexander Sterling', dateOfBirth: '1978-04-12T00:00:00.000Z', passportNumber: 'US99887766' },
          { fullName: 'Victoria Sterling', dateOfBirth: null, passportNumber: null },
        ],
        notes: 'Crew will greet passengers at main FBO reception 20 minutes prior to departure.',
      },
      BRAND_MINIMAL,
    );

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1200);
  });

  it('renders a valid Client Invoice PDF with payment ledger', async () => {
    const pdf = await renderInvoicePdf(
      {
        number: 'INV-2026-0042',
        status: 'SENT',
        state: 'PARTIALLY_PAID',
        amount: 82500,
        fetAmount: 6187.5,
        total: 88687.5,
        paid: 40000,
        balance: 48687.5,
        issuedAt: '2026-10-20T00:00:00.000Z',
        dueDate: '2026-11-01T00:00:00.000Z',
        client: { firstName: 'Alexander', lastName: 'Sterling', email: 'alex@example.com' },
        trip: {
          reference: 1048,
          departureDate: '2026-11-12T00:00:00.000Z',
          assignedBroker: { firstName: 'Barry', lastName: 'Broker', email: 'barry@example.com' },
        },
        payments: [
          { amount: 40000, paidAt: '2026-10-22T00:00:00.000Z', method: 'WIRE', reference: 'WT-882910' },
        ],
        notes: 'Please remit remaining balance via wire transfer 48 hours prior to departure.',
      },
      BRAND_FULL,
    );

    expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1200);
  });

  it('renders a valid Operations Report PDF and Branding Preview PDF', async () => {
    const reportPdf = await renderOperationsReportPdf(
      {
        periodLabel: '2026-10-01 to 2026-10-31',
        totals: {
          tripCount: 1,
          revenue: 88687.5,
          fet: 6187.5,
          profit: 16687.5,
          marginPercentage: 18.8,
        },
        rows: [
          {
            reference: 'TJ-1048',
            departure: '2026-10-15',
            status: 'COMPLETED',
            client: 'Alexander Sterling',
            broker: 'Barry Broker',
            route: 'KTEB \u2192 EGGW',
            aircraft: 'Gulfstream G650ER',
            operator: 'Executive Jet Management',
            revenue: 88687.5,
            fet: 6187.5,
            operatorCost: 72000,
            profit: 16687.5,
            marginPercentage: 18.8,
          },
        ],
      },
      BRAND_FULL,
    );
    expect(reportPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    const previewPdf = await renderBrandingPreviewPdf(BRAND_FULL);
    expect(previewPdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

