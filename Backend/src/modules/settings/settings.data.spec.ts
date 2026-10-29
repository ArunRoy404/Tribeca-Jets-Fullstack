import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ACCESS_KEY } from '../../common/constants/auth.constants.js';
import { Action, Module } from '../../common/authorization/access.js';
import { AircraftCategory, LeadSource } from '../../generated/prisma/client.js';
import { settingsExportSchema, settingsImportFieldsSchema } from './dto/settings-data.dto.js';
import { SettingsController } from './settings.controller.js';
import {
  clientExportColumns,
  resolveColumnMapping,
  validateImportBatch,
  type ImportLookupContext,
} from './settings.data.js';

function emptyContext(overrides: Partial<ImportLookupContext> = {}): ImportLookupContext {
  return {
    existingIcaos: new Set(),
    existingOperatorNames: new Set(),
    existingTails: new Set(),
    operatorsByName: new Map(),
    existingClientEmails: new Set(),
    existingClientNamePhones: new Set(),
    airportsByCode: new Map(),
    ...overrides,
  };
}

describe('SettingsController import/export access decorators (#31)', () => {
  const handler = (name: keyof SettingsController) =>
    Object.getOwnPropertyDescriptor(SettingsController.prototype, name)?.value as object;

  it('requires SETTINGS · VIEW on exportData and SETTINGS · EDIT on validateImport and commitImport', () => {
    expect(Reflect.getMetadata(ACCESS_KEY, handler('exportData'))).toEqual({
      module: Module.SETTINGS,
      action: Action.VIEW,
      altModule: undefined,
    });
    expect(Reflect.getMetadata(ACCESS_KEY, handler('validateImport'))).toEqual({
      module: Module.SETTINGS,
      action: Action.EDIT,
      altModule: undefined,
    });
    expect(Reflect.getMetadata(ACCESS_KEY, handler('commitImport'))).toEqual({
      module: Module.SETTINGS,
      action: Action.EDIT,
      altModule: undefined,
    });
  });
});

describe('settingsExportSchema', () => {
  it('accepts ALL with XLSX and refuses ALL with CSV', () => {
    expect(settingsExportSchema.safeParse({ scope: 'ALL', format: 'XLSX' }).success).toBe(true);
    expect(settingsExportSchema.safeParse({ scope: 'ALL', format: 'CSV' }).success).toBe(false);
    expect(settingsExportSchema.safeParse({ scope: 'CLIENTS', format: 'CSV', includeArchived: 'true' }).success).toBe(
      true,
    );
  });

  it('refuses a start date after the end date', () => {
    expect(
      settingsExportSchema.safeParse({
        scope: 'TRIPS',
        format: 'XLSX',
        from: '2026-10-15',
        to: '2026-10-01',
      }).success,
    ).toBe(false);
  });
});

describe('settingsImportFieldsSchema', () => {
  it('parses optional JSON mapping and rejects malformed mapping JSON', () => {
    const parsed = settingsImportFieldsSchema.parse({
      type: 'AIRPORTS',
      mapping: JSON.stringify({ ICAO: 'ICAO', Airport: 'Name' }),
    });
    expect(parsed.mapping).toEqual({ ICAO: 'ICAO', Airport: 'Name' });
    expect(settingsImportFieldsSchema.safeParse({ type: 'AIRPORTS', mapping: '{bad' }).success).toBe(false);
  });
});

describe('clientExportColumns', () => {
  it('appends the Archived column only when includeArchived is true', () => {
    expect(clientExportColumns(false).map((c) => c.header)).not.toContain('Archived');
    expect(clientExportColumns(true).map((c) => c.header)).toContain('Archived');
  });
});

describe('resolveColumnMapping and validateImportBatch', () => {
  it('validates AIRPORTS, flags database and in-file duplicates, and reports missing/invalid ICAOs', () => {
    const columns = ['ICAO Code', 'IATA', 'Airport Name', 'City', 'Country'];
    const mapping = resolveColumnMapping(columns, 'AIRPORTS');
    expect(mapping).toEqual({
      'ICAO Code': 'ICAO',
      IATA: 'IATA',
      'Airport Name': 'Name',
      City: 'City',
      Country: 'Country',
    });

    const batch = validateImportBatch(
      'AIRPORTS',
      [
        { 'ICAO Code': 'kjfk', IATA: 'jfk', 'Airport Name': 'John F Kennedy Intl', City: 'New York', Country: 'USA' },
        { 'ICAO Code': 'KJFK', IATA: 'JFK', 'Airport Name': 'Duplicate in file', City: 'New York', Country: 'USA' },
        { 'ICAO Code': 'KTEB', IATA: 'TEB', 'Airport Name': 'Teterboro', City: 'Teterboro', Country: 'USA' },
        { 'ICAO Code': 'BAD_ICAO', IATA: '', 'Airport Name': 'Bad Code', City: 'Nowhere', Country: 'USA' },
      ],
      mapping,
      emptyContext({ existingIcaos: new Set(['KTEB']) }),
    );

    expect(batch.validCount).toBe(1);
    expect(batch.duplicateCount).toBe(2);
    expect(batch.errorCount).toBe(1);
    expect(batch.airports).toEqual([
      { icao: 'KJFK', iata: 'JFK', name: 'John F Kennedy Intl', city: 'New York', country: 'USA' },
    ]);
    expect(batch.preview.map((r) => r.status)).toEqual(['VALID', 'DUPLICATE', 'DUPLICATE', 'ERROR']);
  });

  it('validates OPERATORS and formats certification into sourcingNotes', () => {
    const columns = ['Operator Name', 'Email', 'Phone', 'Certification', 'Base Airport'];
    const mapping = resolveColumnMapping(columns, 'OPERATORS');
    const batch = validateImportBatch(
      'OPERATORS',
      [
        {
          'Operator Name': 'Jet Aviation',
          Email: 'ops@example.com',
          Phone: '+1 555 0100',
          Certification: 'ARG/US Platinum',
          'Base Airport': 'KTEB',
        },
        {
          'Operator Name': 'NetJets',
          Email: 'netjets@example.com',
          Phone: '',
          Certification: '',
          'Base Airport': '',
        },
      ],
      mapping,
      emptyContext({ existingOperatorNames: new Set(['netjets']) }),
    );

    expect(batch.validCount).toBe(1);
    expect(batch.duplicateCount).toBe(1);
    expect(batch.operators[0]).toEqual({
      name: 'Jet Aviation',
      generalEmail: 'ops@example.com',
      generalPhone: '+1 555 0100',
      homeBase: 'KTEB',
      sourcingNotes: 'Certification: ARG/US Platinum',
    });
  });

  it('validates AIRCRAFT, normalizes categories, and verifies operator names', () => {
    const columns = ['Tail Number', 'Model', 'Category', 'Seats', 'Operator'];
    const mapping = resolveColumnMapping(columns, 'AIRCRAFT');
    const batch = validateImportBatch(
      'AIRCRAFT',
      [
        {
          'Tail Number': 'n909tj',
          Model: 'Gulfstream G650',
          Category: 'Ultra Long Range',
          Seats: '14',
          Operator: 'VistaJet',
        },
        {
          'Tail Number': 'N910TJ',
          Model: 'Phenom 300',
          Category: 'Light Jet',
          Seats: '8',
          Operator: 'Unknown Operator',
        },
      ],
      mapping,
      emptyContext({ operatorsByName: new Map([['vistajet', 'op-vista-id']]) }),
    );

    expect(batch.validCount).toBe(1);
    expect(batch.errorCount).toBe(1);
    expect(batch.aircraft[0]).toEqual({
      tailNumber: 'N909TJ',
      model: 'Gulfstream G650',
      category: AircraftCategory.ULTRA_LONG_RANGE,
      maxPassengers: 14,
      operatorId: 'op-vista-id',
    });
    expect(batch.preview[1].reason).toContain('Unknown Operator');
  });

  it('validates CLIENTS, splits full name, maps lead source, and resolves preferred airport', () => {
    const columns = ['Client Name', 'Primary Email', 'Primary Phone', 'Lead Source', 'Preferred Airports'];
    const mapping = resolveColumnMapping(columns, 'CLIENTS');
    const batch = validateImportBatch(
      'CLIENTS',
      [
        {
          'Client Name': 'Elena Vance',
          'Primary Email': 'elena@example.com',
          'Primary Phone': '+1 212 555 0144',
          'Lead Source': 'Referral',
          'Preferred Airports': 'KTEB, KPBI',
        },
        {
          'Client Name': 'Existing Person',
          'Primary Email': 'existing@example.com',
          'Primary Phone': '',
          'Lead Source': '',
          'Preferred Airports': '',
        },
      ],
      mapping,
      emptyContext({
        existingClientEmails: new Set(['existing@example.com']),
        airportsByCode: new Map([['KTEB', 'apt-kteb-id']]),
      }),
    );

    expect(batch.validCount).toBe(1);
    expect(batch.duplicateCount).toBe(1);
    expect(batch.clients[0]).toEqual({
      firstName: 'Elena',
      lastName: 'Vance',
      email: 'elena@example.com',
      phone: '+1 212 555 0144',
      leadSource: LeadSource.REFERRAL,
      homeAirportId: 'apt-kteb-id',
    });
  });
});
