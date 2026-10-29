import {
  AircraftCategory,
  CommissionRecipientType,
  LeadSource,
  OperatorPayableStatus,
  type Prisma,
} from '../../generated/prisma/client.js';
import { documentNumber } from '../../common/database/document-number.js';
import type { Column } from '../../common/export/tabular.js';
import { fromCents, toCents } from '../../common/money/cents.js';
import { paidCents, settlementState, todayUtc } from '../../common/money/settlement.js';
import { commissionValue } from '../commissions/commissions.amounts.js';
import { priceQuote } from '../quotes/quotes.pricing.js';
import { invoiceFigures, invoiceNumber } from '../receivables/receivables.amounts.js';
import {
  IMPORT_TARGET_FIELDS,
  SKIP_COLUMN,
  type ImportType,
} from './dto/settings-data.dto.js';

const MONEY_FORMAT = '#,##0.00';

export const isoDay = (date: Date | null | undefined): string | null =>
  date ? date.toISOString().slice(0, 10) : null;

const personName = (person: { firstName: string; lastName: string } | null | undefined): string | null =>
  person ? `${person.firstName} ${person.lastName}`.trim() || null : null;

const clientDisplayName = (
  client: { firstName: string; lastName: string; companyName: string | null } | null | undefined,
): string | null => {
  if (!client) return null;
  const full = `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  return full || client.companyName || null;
};

const airportCode = (airport: { icao: string; iata: string | null } | null | undefined): string =>
  airport?.icao || airport?.iata || '';

function withArchivedColumn<Row extends { deletedAt: Date | null }>(
  columns: Column<Row>[],
  includeArchived: boolean,
): Column<Row>[] {
  if (!includeArchived) return columns;
  return [
    ...columns,
    {
      header: 'Archived',
      value: (row) => (row.deletedAt ? isoDay(row.deletedAt) : null),
      width: 12,
    },
  ];
}

// ---------------------------------------------------------------------------
// Export row types & column builders
// ---------------------------------------------------------------------------

export interface ExportClientRow {
  firstName: string;
  lastName: string;
  companyName: string | null;
  type: string;
  status: string;
  leadStage: string;
  leadSource: string;
  priority: string;
  email: string | null;
  phone: string | null;
  homeAirport: { icao: string; iata: string | null } | null;
  assignedBroker: { firstName: string; lastName: string } | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export function clientExportColumns(includeArchived: boolean): Column<ExportClientRow>[] {
  return withArchivedColumn(
    [
      { header: 'Client Name', value: (row) => `${row.firstName} ${row.lastName}`.trim(), width: 24 },
      { header: 'Company', value: (row) => row.companyName, width: 22 },
      { header: 'Type', value: (row) => row.type, width: 14 },
      { header: 'Status', value: (row) => row.status, width: 12 },
      { header: 'Lead Stage', value: (row) => row.leadStage, width: 14 },
      { header: 'Lead Source', value: (row) => row.leadSource, width: 16 },
      { header: 'Priority', value: (row) => row.priority, width: 10 },
      { header: 'Primary Email', value: (row) => row.email, width: 26 },
      { header: 'Primary Phone', value: (row) => row.phone, width: 18 },
      { header: 'Preferred Airports', value: (row) => row.homeAirport?.icao ?? null, width: 16 },
      { header: 'Assigned Broker', value: (row) => personName(row.assignedBroker), width: 20 },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

export interface ExportTripRow {
  reference: number;
  status: string;
  type: string;
  departureDate: Date | null;
  passengerCount: number | null;
  aircraftDescription: string | null;
  basePrice: Prisma.Decimal | number | null;
  fetEnabled: boolean;
  fetRate: Prisma.Decimal | number;
  operatorCost: Prisma.Decimal | number | null;
  lineItems: unknown;
  client: { firstName: string; lastName: string; companyName: string | null };
  assignedBroker: { firstName: string; lastName: string } | null;
  operator: { name: string } | null;
  aircraft: { tailNumber: string; model: string } | null;
  legs: {
    originAirport: { icao: string; iata: string | null };
    destinationAirport: { icao: string; iata: string | null };
  }[];
  createdAt: Date;
  deletedAt: Date | null;
}

export function tripExportColumns(includeArchived: boolean): Column<ExportTripRow>[] {
  return withArchivedColumn(
    [
      { header: 'Trip', value: (row) => `TJ-${row.reference}`, width: 12 },
      { header: 'Status', value: (row) => row.status, width: 14 },
      { header: 'Type', value: (row) => row.type, width: 14 },
      { header: 'Departure', value: (row) => isoDay(row.departureDate), width: 12 },
      { header: 'Client', value: (row) => clientDisplayName(row.client), width: 24 },
      { header: 'Broker', value: (row) => personName(row.assignedBroker), width: 20 },
      {
        header: 'Route',
        value: (row) => {
          const first = row.legs[0];
          return first
            ? `${airportCode(first.originAirport)} - ${airportCode(first.destinationAirport)}`
            : null;
        },
        width: 16,
      },
      { header: 'Passengers', value: (row) => row.passengerCount, width: 12 },
      {
        header: 'Aircraft',
        value: (row) =>
          row.aircraft ? `${row.aircraft.tailNumber} (${row.aircraft.model})` : row.aircraftDescription,
        width: 24,
      },
      { header: 'Operator', value: (row) => row.operator?.name ?? null, width: 22 },
      {
        header: 'Base Price',
        value: (row) => (row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).basePrice),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'FET',
        value: (row) => (row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).fetAmount),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Extras',
        value: (row) => (row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).extrasTotal),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Total Price',
        value: (row) => (row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).totalPrice),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Operator Cost',
        value: (row) => (row.operatorCost === null ? null : Number(row.operatorCost)),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Gross Profit',
        value: (row) => (row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).grossProfit),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Margin %',
        value: (row) =>
          row.basePrice === null ? null : priceQuote({ ...row, basePrice: row.basePrice }).marginPercentage,
        numberFormat: '0.0',
      },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

export interface ExportQuoteRow {
  reference: number;
  version: number;
  status: string;
  departureDate: Date | null;
  returnDate: Date | null;
  passengers: number | null;
  quotedAircraft: string | null;
  basePrice: Prisma.Decimal | number;
  fetEnabled: boolean;
  fetRate: Prisma.Decimal | number;
  operatorCost: Prisma.Decimal | number | null;
  lineItems: unknown;
  validUntil: Date | null;
  client: { firstName: string; lastName: string; companyName: string | null };
  assignedBroker: { firstName: string; lastName: string } | null;
  operator: { name: string } | null;
  aircraft: { tailNumber: string; model: string } | null;
  originAirport: { icao: string; iata: string | null } | null;
  destinationAirport: { icao: string; iata: string | null } | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export function quoteExportColumns(includeArchived: boolean): Column<ExportQuoteRow>[] {
  return withArchivedColumn(
    [
      { header: 'Quote', value: (row) => `Q-${row.reference}`, width: 10 },
      { header: 'Version', value: (row) => `V${row.version}`, width: 10 },
      { header: 'Status', value: (row) => row.status, width: 12 },
      { header: 'Client', value: (row) => clientDisplayName(row.client), width: 24 },
      { header: 'Broker', value: (row) => personName(row.assignedBroker), width: 20 },
      {
        header: 'Route',
        value: (row) =>
          row.originAirport && row.destinationAirport
            ? `${airportCode(row.originAirport)} - ${airportCode(row.destinationAirport)}`
            : null,
        width: 16,
      },
      { header: 'Departure', value: (row) => isoDay(row.departureDate), width: 12 },
      { header: 'Return', value: (row) => isoDay(row.returnDate), width: 12 },
      { header: 'Passengers', value: (row) => row.passengers, width: 12 },
      {
        header: 'Aircraft',
        value: (row) =>
          row.aircraft ? `${row.aircraft.tailNumber} (${row.aircraft.model})` : row.quotedAircraft,
        width: 24,
      },
      { header: 'Operator', value: (row) => row.operator?.name ?? null, width: 22 },
      { header: 'Base Price', value: (row) => priceQuote(row).basePrice, numberFormat: MONEY_FORMAT },
      { header: 'FET', value: (row) => priceQuote(row).fetAmount, numberFormat: MONEY_FORMAT },
      { header: 'Extras', value: (row) => priceQuote(row).extrasTotal, numberFormat: MONEY_FORMAT },
      { header: 'Total Price', value: (row) => priceQuote(row).totalPrice, numberFormat: MONEY_FORMAT },
      { header: 'Operator Cost', value: (row) => priceQuote(row).operatorCost, numberFormat: MONEY_FORMAT },
      { header: 'Gross Profit', value: (row) => priceQuote(row).grossProfit, numberFormat: MONEY_FORMAT },
      { header: 'Margin %', value: (row) => priceQuote(row).marginPercentage, numberFormat: '0.0' },
      { header: 'Valid Until', value: (row) => isoDay(row.validUntil), width: 12 },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

export interface ExportReceivableRow {
  reference: number;
  amount: Prisma.Decimal | number;
  fetAmount: Prisma.Decimal | number;
  status: Parameters<typeof invoiceFigures>[0]['status'];
  issuedAt: Date | null;
  dueDate: Date | null;
  trip: { reference: number };
  client: { firstName: string; lastName: string; companyName: string | null };
  payments: { amount: Prisma.Decimal | number }[];
  createdAt: Date;
  deletedAt: Date | null;
}

export function receivableExportColumns(includeArchived: boolean): Column<ExportReceivableRow>[] {
  return withArchivedColumn(
    [
      { header: 'Invoice', value: (row) => invoiceNumber(row.reference, row.createdAt), width: 16 },
      { header: 'Trip', value: (row) => `TJ-${row.trip.reference}`, width: 12 },
      { header: 'Client', value: (row) => clientDisplayName(row.client), width: 24 },
      { header: 'Status', value: (row) => row.status, width: 12 },
      { header: 'Payment State', value: (row) => invoiceFigures(row).state, width: 16 },
      { header: 'Charge', value: (row) => Number(row.amount), numberFormat: MONEY_FORMAT },
      { header: 'FET', value: (row) => Number(row.fetAmount), numberFormat: MONEY_FORMAT },
      { header: 'Total', value: (row) => invoiceFigures(row).total, numberFormat: MONEY_FORMAT },
      { header: 'Paid', value: (row) => invoiceFigures(row).paid, numberFormat: MONEY_FORMAT },
      { header: 'Balance', value: (row) => invoiceFigures(row).balance, numberFormat: MONEY_FORMAT },
      { header: 'Issued', value: (row) => isoDay(row.issuedAt), width: 12 },
      { header: 'Due Date', value: (row) => isoDay(row.dueDate), width: 12 },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

export interface ExportOperatorPaymentRow {
  reference: number;
  amount: Prisma.Decimal | number;
  status: OperatorPayableStatus;
  dueDate: Date | null;
  operatorReference: string | null;
  trip: { reference: number };
  operator: { name: string };
  payments: { amount: Prisma.Decimal | number }[];
  createdAt: Date;
  deletedAt: Date | null;
}

export function operatorPaymentExportColumns(includeArchived: boolean): Column<ExportOperatorPaymentRow>[] {
  const today = todayUtc();
  return withArchivedColumn(
    [
      { header: 'Bill', value: (row) => documentNumber('OP', row.reference, row.createdAt), width: 16 },
      { header: 'Trip', value: (row) => `TJ-${row.trip.reference}`, width: 12 },
      { header: 'Operator', value: (row) => row.operator.name, width: 22 },
      { header: 'Operator Invoice #', value: (row) => row.operatorReference, width: 18 },
      { header: 'Status', value: (row) => row.status, width: 12 },
      {
        header: 'Payment State',
        value: (row) => {
          if (row.status === OperatorPayableStatus.CANCELLED) return 'CANCELLED';
          return settlementState(toCents(row.amount), paidCents(row.payments), row.dueDate, today);
        },
        width: 16,
      },
      { header: 'Amount', value: (row) => Number(row.amount), numberFormat: MONEY_FORMAT },
      {
        header: 'Paid',
        value: (row) => fromCents(paidCents(row.payments)),
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Balance',
        value: (row) =>
          row.status === OperatorPayableStatus.CANCELLED
            ? 0
            : fromCents(Math.max(0, toCents(row.amount) - paidCents(row.payments))),
        numberFormat: MONEY_FORMAT,
      },
      { header: 'Due Date', value: (row) => isoDay(row.dueDate), width: 12 },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

export interface ExportCommissionRow {
  reference: number;
  recipientType: CommissionRecipientType;
  recipientName: string | null;
  recipientCompany: string | null;
  recipientUser: { firstName: string; lastName: string } | null;
  recipientClient: { firstName: string; lastName: string; companyName: string | null } | null;
  broker: { firstName: string; lastName: string } | null;
  basis: Parameters<typeof commissionValue>[0]['basis'];
  percentage: Prisma.Decimal | number | null;
  amount: Prisma.Decimal | number | null;
  finalAmount: Prisma.Decimal | number | null;
  status: string;
  method: string | null;
  paidAt: Date | null;
  trip: {
    reference: number;
    basePrice: Prisma.Decimal | number | null;
    fetEnabled: boolean;
    fetRate: Prisma.Decimal | number;
    operatorCost: Prisma.Decimal | number | null;
    lineItems: unknown;
  };
  createdAt: Date;
  deletedAt: Date | null;
}

export function commissionExportColumns(includeArchived: boolean): Column<ExportCommissionRow>[] {
  return withArchivedColumn(
    [
      { header: 'Commission', value: (row) => `COM-${row.reference}`, width: 14 },
      { header: 'Trip', value: (row) => `TJ-${row.trip.reference}`, width: 12 },
      { header: 'Recipient Type', value: (row) => row.recipientType, width: 16 },
      {
        header: 'Recipient',
        value: (row) => {
          if (row.recipientType === CommissionRecipientType.REFERRAL_AGENT) return personName(row.recipientUser);
          if (row.recipientType === CommissionRecipientType.CLIENT) return clientDisplayName(row.recipientClient);
          return row.recipientCompany
            ? `${row.recipientName ?? ''} (${row.recipientCompany})`.trim()
            : row.recipientName;
        },
        width: 24,
      },
      { header: 'Broker', value: (row) => personName(row.broker), width: 20 },
      { header: 'Basis', value: (row) => row.basis, width: 18 },
      {
        header: 'Percentage %',
        value: (row) => (row.percentage === null ? null : Number(row.percentage)),
        numberFormat: '0.00',
      },
      {
        header: 'Agreed / Settled',
        value: (row) =>
          row.finalAmount !== null
            ? Number(row.finalAmount)
            : row.amount !== null
              ? Number(row.amount)
              : null,
        numberFormat: MONEY_FORMAT,
      },
      {
        header: 'Effective Value',
        value: (row) => {
          const tripProfit =
            row.trip.basePrice === null
              ? null
              : priceQuote({ ...row.trip, basePrice: row.trip.basePrice }).grossProfit;
          return commissionValue(row, tripProfit);
        },
        numberFormat: MONEY_FORMAT,
      },
      { header: 'Status', value: (row) => row.status, width: 12 },
      { header: 'Payment Method', value: (row) => row.method, width: 16 },
      { header: 'Paid Date', value: (row) => isoDay(row.paidAt), width: 12 },
      { header: 'Created', value: (row) => isoDay(row.createdAt), width: 12 },
    ],
    includeArchived,
  );
}

// ---------------------------------------------------------------------------
// Import column mapping & row validation
// ---------------------------------------------------------------------------

const normalizeKey = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const COLUMN_ALIASES: Record<ImportType, Record<string, string>> = {
  CLIENTS: {
    name: 'Client Name',
    fullname: 'Client Name',
    client: 'Client Name',
    email: 'Primary Email',
    emailaddress: 'Primary Email',
    phone: 'Primary Phone',
    phonenumber: 'Primary Phone',
    source: 'Lead Source',
    airport: 'Preferred Airports',
    homeairport: 'Preferred Airports',
    preferredairport: 'Preferred Airports',
  },
  OPERATORS: {
    name: 'Operator Name',
    operator: 'Operator Name',
    company: 'Operator Name',
    emailaddress: 'Email',
    generalemail: 'Email',
    phonenumber: 'Phone',
    generalphone: 'Phone',
    safety: 'Certification',
    cert: 'Certification',
    base: 'Base Airport',
    homebase: 'Base Airport',
  },
  AIRCRAFT: {
    tail: 'Tail Number',
    registration: 'Tail Number',
    reg: 'Tail Number',
    aircraftmodel: 'Model',
    type: 'Category',
    aircraftcategory: 'Category',
    size: 'Category',
    passengers: 'Seats',
    maxpassengers: 'Seats',
    pax: 'Seats',
    operatingcompany: 'Operator',
  },
  AIRPORTS: {
    icaocode: 'ICAO',
    iatacode: 'IATA',
    airportname: 'Name',
    airport: 'Name',
    municipality: 'City',
  },
};

export function guessTargetColumn(sourceColumn: string, type: ImportType): string {
  const targets = IMPORT_TARGET_FIELDS[type];
  const key = normalizeKey(sourceColumn);
  const direct = targets.find((target) => normalizeKey(target) === key);
  if (direct) return direct;
  return COLUMN_ALIASES[type][key] ?? SKIP_COLUMN;
}

export function resolveColumnMapping(
  columns: string[],
  type: ImportType,
  provided?: Record<string, string>,
): Record<string, string> {
  const targets = new Set<string>(IMPORT_TARGET_FIELDS[type]);
  const resolved: Record<string, string> = {};
  for (const column of columns) {
    const choice = provided?.[column];
    if (choice === SKIP_COLUMN || (choice && targets.has(choice))) {
      resolved[column] = choice;
    } else {
      resolved[column] = guessTargetColumn(column, type);
    }
  }
  return resolved;
}

/** Projects a raw row `{ [sourceColumn]: cellText }` onto `{ [targetField]: cellText }`. */
export function mapRowToTargets(
  rawRow: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (!targetField || targetField === SKIP_COLUMN) continue;
    const val = (rawRow[sourceCol] ?? '').trim();
    if (val.length > 0 || !(targetField in out)) {
      out[targetField] = val;
    }
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ICAO_RE = /^[A-Z0-9]{3,4}$/;
const IATA_RE = /^[A-Z0-9]{3}$/;

const AIRCRAFT_CATEGORY_MAP: Record<string, AircraftCategory> = {
  turboprop: AircraftCategory.TURBOPROP,
  lightjet: AircraftCategory.LIGHT_JET,
  light: AircraftCategory.LIGHT_JET,
  midsizejet: AircraftCategory.MIDSIZE_JET,
  midsize: AircraftCategory.MIDSIZE_JET,
  supermidsize: AircraftCategory.SUPER_MIDSIZE,
  supermidsizejet: AircraftCategory.SUPER_MIDSIZE,
  heavyjet: AircraftCategory.HEAVY_JET,
  heavy: AircraftCategory.HEAVY_JET,
  ultralongrange: AircraftCategory.ULTRA_LONG_RANGE,
  ulr: AircraftCategory.ULTRA_LONG_RANGE,
  vipairliner: AircraftCategory.VIP_AIRLINER,
  airliner: AircraftCategory.VIP_AIRLINER,
};

const LEAD_SOURCE_MAP: Record<string, LeadSource> = {
  direct: LeadSource.DIRECT,
  travelagent: LeadSource.TRAVEL_AGENT,
  facebookgroup: LeadSource.FACEBOOK_GROUP_1,
  facebookgroup1: LeadSource.FACEBOOK_GROUP_1,
  facebookgroup2: LeadSource.FACEBOOK_GROUP_2,
  facebook: LeadSource.FACEBOOK_GROUP_1,
  referral: LeadSource.REFERRAL,
  website: LeadSource.WEBSITE,
  other: LeadSource.OTHER,
};

export interface ImportRowPreview {
  rowNumber: number;
  status: 'VALID' | 'DUPLICATE' | 'ERROR';
  summary: string;
  reason: string | null;
  values: Record<string, string>;
}

export interface ValidAirportImport {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  country: string;
}

export interface ValidOperatorImport {
  name: string;
  generalEmail: string | null;
  generalPhone: string | null;
  homeBase: string | null;
  sourcingNotes: string | null;
}

export interface ValidAircraftImport {
  tailNumber: string;
  model: string;
  category: AircraftCategory;
  maxPassengers: number | null;
  operatorId: string | null;
}

export interface ValidClientImport {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  leadSource: LeadSource;
  homeAirportId: string | null;
}

export interface ImportLookupContext {
  /** Existing airport ICAOs (upper-case). */
  existingIcaos: Set<string>;
  /** Existing operator names (lower-case). */
  existingOperatorNames: Set<string>;
  /** Existing aircraft tail numbers (upper-case). */
  existingTails: Set<string>;
  /** Live operators by lower-case name -> id. */
  operatorsByName: Map<string, string>;
  /** Existing client emails (lower-case). */
  existingClientEmails: Set<string>;
  /** Existing client full-name+phone keys (`firstname|lastname|phone`) when no email is given. */
  existingClientNamePhones: Set<string>;
  /** Live airports by upper-case ICAO or IATA -> id. */
  airportsByCode: Map<string, string>;
}

export interface ValidatedImportBatch {
  preview: ImportRowPreview[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
  airports: ValidAirportImport[];
  operators: ValidOperatorImport[];
  aircraft: ValidAircraftImport[];
  clients: ValidClientImport[];
}

export function validateImportBatch(
  type: ImportType,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>,
  context: ImportLookupContext,
): ValidatedImportBatch {
  const preview: ImportRowPreview[] = [];
  const airports: ValidAirportImport[] = [];
  const operators: ValidOperatorImport[] = [];
  const aircraft: ValidAircraftImport[] = [];
  const clients: ValidClientImport[] = [];

  const seenIcaos = new Set<string>();
  const seenOperatorNames = new Set<string>();
  const seenTails = new Set<string>();
  const seenClientEmails = new Set<string>();
  const seenClientNamePhones = new Set<string>();

  for (let idx = 0; idx < rawRows.length; idx += 1) {
    const rowNumber = idx + 2; // Row 1 is the header
    const values = mapRowToTargets(rawRows[idx], mapping);

    if (type === 'AIRPORTS') {
      const icao = (values['ICAO'] ?? '').toUpperCase().trim();
      const iataRaw = (values['IATA'] ?? '').toUpperCase().trim();
      const name = (values['Name'] ?? '').trim();
      const city = (values['City'] ?? '').trim();
      const country = (values['Country'] ?? '').trim();
      const summary = [icao, name || city].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      const missing = [
        !icao && 'ICAO',
        !name && 'Name',
        !city && 'City',
        !country && 'Country',
      ].filter(Boolean);
      if (missing.length > 0) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
          values,
        });
        continue;
      }
      if (!ICAO_RE.test(icao)) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `ICAO "${icao}" must be 3 or 4 alphanumeric characters.`,
          values,
        });
        continue;
      }
      if (iataRaw && !IATA_RE.test(iataRaw)) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `IATA "${iataRaw}" must be 3 alphanumeric characters.`,
          values,
        });
        continue;
      }
      if (context.existingIcaos.has(icao)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Airport ${icao} already exists in the CRM.`,
          values,
        });
        continue;
      }
      if (seenIcaos.has(icao)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Airport ${icao} appears more than once in this file.`,
          values,
        });
        continue;
      }

      seenIcaos.add(icao);
      airports.push({ icao, iata: iataRaw || null, name, city, country });
      preview.push({ rowNumber, status: 'VALID', summary, reason: null, values });
      continue;
    }

    if (type === 'OPERATORS') {
      const name = (values['Operator Name'] ?? '').trim();
      const email = (values['Email'] ?? '').trim();
      const phone = (values['Phone'] ?? '').trim();
      const certification = (values['Certification'] ?? '').trim();
      const homeBase = (values['Base Airport'] ?? '').trim();
      const summary = name || email || `Row ${rowNumber}`;

      if (!name) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: 'Missing required field: Operator Name',
          values,
        });
        continue;
      }
      if (email && !EMAIL_RE.test(email)) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Invalid email address: "${email}"`,
          values,
        });
        continue;
      }
      const lowerName = name.toLowerCase();
      if (context.existingOperatorNames.has(lowerName)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Operator "${name}" already exists in the CRM.`,
          values,
        });
        continue;
      }
      if (seenOperatorNames.has(lowerName)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Operator "${name}" appears more than once in this file.`,
          values,
        });
        continue;
      }

      seenOperatorNames.add(lowerName);
      operators.push({
        name,
        generalEmail: email || null,
        generalPhone: phone || null,
        homeBase: homeBase || null,
        sourcingNotes: certification ? `Certification: ${certification}` : null,
      });
      preview.push({ rowNumber, status: 'VALID', summary, reason: null, values });
      continue;
    }

    if (type === 'AIRCRAFT') {
      const tailNumber = (values['Tail Number'] ?? '').toUpperCase().trim();
      const model = (values['Model'] ?? '').trim();
      const categoryRaw = (values['Category'] ?? '').trim();
      const seatsRaw = (values['Seats'] ?? '').trim();
      const operatorRaw = (values['Operator'] ?? '').trim();
      const summary = [tailNumber, model].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      const missing = [
        !tailNumber && 'Tail Number',
        !model && 'Model',
        !categoryRaw && 'Category',
      ].filter(Boolean);
      if (missing.length > 0) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
          values,
        });
        continue;
      }
      if (tailNumber.length > 12) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Tail Number "${tailNumber}" exceeds 12 characters.`,
          values,
        });
        continue;
      }
      const category = AIRCRAFT_CATEGORY_MAP[normalizeKey(categoryRaw)];
      if (!category) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Unrecognised aircraft category "${categoryRaw}". Use Light Jet, Midsize Jet, Super Midsize, Heavy Jet, Ultra Long Range, VIP Airliner, or Turboprop.`,
          values,
        });
        continue;
      }

      let maxPassengers: number | null = null;
      if (seatsRaw) {
        const parsedSeats = Number(seatsRaw);
        if (!Number.isInteger(parsedSeats) || parsedSeats < 1 || parsedSeats > 500) {
          preview.push({
            rowNumber,
            status: 'ERROR',
            summary,
            reason: `Seats "${seatsRaw}" must be a whole number between 1 and 500.`,
            values,
          });
          continue;
        }
        maxPassengers = parsedSeats;
      }

      let operatorId: string | null = null;
      if (operatorRaw) {
        operatorId = context.operatorsByName.get(operatorRaw.toLowerCase()) ?? null;
        if (!operatorId) {
          preview.push({
            rowNumber,
            status: 'ERROR',
            summary,
            reason: `Operator "${operatorRaw}" was not found in the CRM. Import or add the operator first.`,
            values,
          });
          continue;
        }
      }

      if (context.existingTails.has(tailNumber)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Aircraft ${tailNumber} already exists in the CRM.`,
          values,
        });
        continue;
      }
      if (seenTails.has(tailNumber)) {
        preview.push({
          rowNumber,
          status: 'DUPLICATE',
          summary,
          reason: `Aircraft ${tailNumber} appears more than once in this file.`,
          values,
        });
        continue;
      }

      seenTails.add(tailNumber);
      aircraft.push({ tailNumber, model, category, maxPassengers, operatorId });
      preview.push({ rowNumber, status: 'VALID', summary, reason: null, values });
      continue;
    }

    // CLIENTS
    const clientName = (values['Client Name'] ?? '').trim();
    const email = (values['Primary Email'] ?? '').trim();
    const phone = (values['Primary Phone'] ?? '').trim();
    const leadSourceRaw = (values['Lead Source'] ?? '').trim();
    const airportRaw = (values['Preferred Airports'] ?? '').trim();
    const summary = [clientName, email].filter(Boolean).join(' • ') || `Row ${rowNumber}`;

    if (!clientName) {
      preview.push({
        rowNumber,
        status: 'ERROR',
        summary,
        reason: 'Missing required field: Client Name',
        values,
      });
      continue;
    }
    if (email && !EMAIL_RE.test(email)) {
      preview.push({
        rowNumber,
        status: 'ERROR',
        summary,
        reason: `Invalid email address: "${email}"`,
        values,
      });
      continue;
    }

    let leadSource: LeadSource = LeadSource.DIRECT;
    if (leadSourceRaw) {
      const mapped = LEAD_SOURCE_MAP[normalizeKey(leadSourceRaw)];
      if (!mapped) {
        preview.push({
          rowNumber,
          status: 'ERROR',
          summary,
          reason: `Unrecognised lead source "${leadSourceRaw}". Use Direct, Travel Agent, Facebook Group, Referral, Website, or Other.`,
          values,
        });
        continue;
      }
      leadSource = mapped;
    }

    let homeAirportId: string | null = null;
    if (airportRaw) {
      const firstCode = airportRaw.split(/[,;/\s]+/)[0]?.toUpperCase() ?? '';
      if (firstCode) {
        homeAirportId = context.airportsByCode.get(firstCode) ?? null;
        if (!homeAirportId) {
          preview.push({
            rowNumber,
            status: 'ERROR',
            summary,
            reason: `Airport "${firstCode}" was not found in the CRM. Import or add the airport first.`,
            values,
          });
          continue;
        }
      }
    }

    const nameParts = clientName.split(/\s+/);
    const firstName = nameParts[0] ?? clientName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    const lowerEmail = email.toLowerCase();
    const namePhoneKey = phone ? `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${phone}` : '';

    if (lowerEmail && context.existingClientEmails.has(lowerEmail)) {
      preview.push({
        rowNumber,
        status: 'DUPLICATE',
        summary,
        reason: `A client with email "${email}" already exists in the CRM.`,
        values,
      });
      continue;
    }
    if (lowerEmail && seenClientEmails.has(lowerEmail)) {
      preview.push({
        rowNumber,
        status: 'DUPLICATE',
        summary,
        reason: `Email "${email}" appears more than once in this file.`,
        values,
      });
      continue;
    }
    if (!lowerEmail && namePhoneKey && context.existingClientNamePhones.has(namePhoneKey)) {
      preview.push({
        rowNumber,
        status: 'DUPLICATE',
        summary,
        reason: `Client "${clientName}" (${phone}) already exists in the CRM.`,
        values,
      });
      continue;
    }
    if (!lowerEmail && namePhoneKey && seenClientNamePhones.has(namePhoneKey)) {
      preview.push({
        rowNumber,
        status: 'DUPLICATE',
        summary,
        reason: `Client "${clientName}" (${phone}) appears more than once in this file.`,
        values,
      });
      continue;
    }

    if (lowerEmail) seenClientEmails.add(lowerEmail);
    if (namePhoneKey) seenClientNamePhones.add(namePhoneKey);

    clients.push({
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      leadSource,
      homeAirportId,
    });
    preview.push({ rowNumber, status: 'VALID', summary, reason: null, values });
  }

  const validCount = preview.filter((row) => row.status === 'VALID').length;
  const duplicateCount = preview.filter((row) => row.status === 'DUPLICATE').length;
  const errorCount = preview.filter((row) => row.status === 'ERROR').length;

  return {
    preview,
    validCount,
    duplicateCount,
    errorCount,
    airports,
    operators,
    aircraft,
    clients,
  };
}

