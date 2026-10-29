import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { uploadIdFrom } from '../../common/dto/uploads.js';
import {
  EXPORT_CONTENT_TYPES,
  EXPORT_EXTENSIONS,
  readTabular,
  toFile,
  toMultiSheetXlsx,
  type WorksheetSpec,
} from '../../common/export/tabular.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { UploadsService, type IncomingFile } from '../uploads/uploads.service.js';
import type { SettingsExportInput, SettingsImportFieldsInput, ImportType } from './dto/settings-data.dto.js';
import type { UpdateSettingsInput } from './dto/settings.dto.js';
import {
  clientExportColumns,
  commissionExportColumns,
  isoDay,
  operatorPaymentExportColumns,
  quoteExportColumns,
  receivableExportColumns,
  resolveColumnMapping,
  tripExportColumns,
  validateImportBatch,
  type ImportLookupContext,
} from './settings.data.js';
import {
  brandingView,
  settingsDiff,
  settingsView,
  type SettingsRow,
} from './settings.view.js';

/** The one row's key — held to 1 by a CHECK constraint. */
const SETTINGS_ID = 1;

/**
 * How long a read may be served from memory. Short, so a second API process
 * (a rolling deploy, a second instance) agrees within seconds; a save on this
 * process refreshes it at once.
 */
const CACHE_MS = 15_000;

/**
 * The company's settings — one row, for the whole company.
 *
 * Global: a setting is read by the module it governs (AGENTS.md), so every
 * module may inject this. **Read it when deciding**, never copy a value into
 * a constant: `idleTimeoutMinutes` replaced the `AUTH_IDLE_TIMEOUT_MINUTES`
 * env var precisely so there is one number.
 *
 * `current()` is synchronous for the few callers that decide inside a
 * synchronous rule (the idle limit); it is loaded at boot and refreshed
 * behind reads. Everything else awaits `read()`.
 */
@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private cached: SettingsRow | null = null;
  private cachedAt = 0;
  private refreshing: Promise<SettingsRow> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly uploads: UploadsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  /** The settings now, from memory — refreshed in the background when stale. */
  current(): SettingsRow {
    if (!this.cached) {
      throw new Error('Settings read before the module initialised');
    }
    if (Date.now() - this.cachedAt > CACHE_MS) void this.load().catch(() => undefined);
    return this.cached;
  }

  /** The settings, fresh within `CACHE_MS`. */
  async read(): Promise<SettingsRow> {
    if (this.cached && Date.now() - this.cachedAt <= CACHE_MS) return this.cached;
    return this.load();
  }

  /** One database read at a time, however many requests ask at once. */
  private load(): Promise<SettingsRow> {
    this.refreshing ??= this.fetch()
      .then((row) => {
        this.cached = row;
        this.cachedAt = Date.now();
        return row;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  private async fetch(): Promise<SettingsRow> {
    // The migration inserts the row; the upsert is the backstop for a
    // database restored without it, so a read never fails for want of one.
    const row = await this.prisma.companySettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
    return {
      ...row,
      defaultMarkupPercent: Number(row.defaultMarkupPercent),
      defaultFetPercent: Number(row.defaultFetPercent),
    };
  }

  /** `GET /settings`. */
  async view() {
    return settingsView(await this.read());
  }

  /** `GET /settings/branding` — public. */
  async branding() {
    return brandingView(await this.read());
  }

  /**
   * The logo's bytes for the public route. Vouched for by the settings row:
   * only the one upload it names is ever served without a session, so this
   * is not a way to read any other file.
   */
  async openLogo() {
    const id = uploadIdFrom((await this.read()).logoUrl);
    if (!id) throw new NotFoundException('No logo has been set.');
    return this.uploads.openVouched(id);
  }

  /** `PATCH /settings` — each screen saves its own section. */
  async update(actor: AuthenticatedUser, input: UpdateSettingsInput) {
    const before = await this.load();

    const security = input.security ?? {};
    const timeout = security.idleTimeoutMinutes ?? before.idleTimeoutMinutes;
    const warning = security.idleWarningMinutes ?? before.idleWarningMinutes;
    if (warning >= timeout) {
      throw new BadRequestException({
        idleWarningMinutes: 'The warning must come before the timeout.',
      });
    }

    const logoUrl = input.company?.logoUrl;
    if (logoUrl && logoUrl !== before.logoUrl) {
      await this.uploads.assertUsableImage(actor, uploadIdFrom(logoUrl)!, 'logoUrl');
    }

    const changes = settingsDiff(before, input as Parameters<typeof settingsDiff>[1]);
    if (Object.keys(changes).length === 0) return settingsView(before);

    await this.prisma.companySettings.update({
      where: { id: SETTINGS_ID },
      data: {
        ...input.company,
        ...input.defaults,
        ...input.security,
        ...input.rateLimits,
        ...input.notifications,
        updatedById: actor.id,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'settings.updated',
      entityType: 'CompanySettings',
      entityId: String(SETTINGS_ID),
      metadata: { changes },
    });
    this.logger.log(`Settings changed by ${actor.id}: ${Object.keys(changes).join(', ')}`);

    return settingsView(await this.load());
  }

  /**
   * `GET /settings/export` (#31). Exports one scope as CSV or XLSX, or all six
   * scopes into a multi-sheet XLSX workbook.
   */
  async exportData(query: SettingsExportInput) {
    const archiveWhere = query.includeArchived ? {} : { deletedAt: null };
    const hasSpan = Boolean(query.from || query.to);
    const createdAtSpan = hasSpan
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: new Date(query.to.getTime() + 86_399_999) } : {}),
        }
      : undefined;
    const daySpan = hasSpan
      ? {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        }
      : undefined;

    const fetchClients = () =>
      this.prisma.client.findMany({
        where: { ...archiveWhere, ...(createdAtSpan ? { createdAt: createdAtSpan } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          type: true,
          status: true,
          leadStage: true,
          leadSource: true,
          priority: true,
          email: true,
          phone: true,
          homeAirport: { select: { icao: true, iata: true } },
          assignedBroker: { select: { firstName: true, lastName: true } },
          createdAt: true,
          deletedAt: true,
        },
      });

    const fetchTrips = () =>
      this.prisma.trip.findMany({
        where: {
          ...archiveWhere,
          ...(daySpan && createdAtSpan
            ? { OR: [{ departureDate: daySpan }, { departureDate: null, createdAt: createdAtSpan }] }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          status: true,
          type: true,
          departureDate: true,
          passengerCount: true,
          aircraftDescription: true,
          basePrice: true,
          fetEnabled: true,
          fetRate: true,
          operatorCost: true,
          lineItems: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          assignedBroker: { select: { firstName: true, lastName: true } },
          operator: { select: { name: true } },
          aircraft: { select: { tailNumber: true, model: true } },
          legs: {
            where: { deletedAt: null },
            orderBy: { sequence: 'asc' },
            select: {
              originAirport: { select: { icao: true, iata: true } },
              destinationAirport: { select: { icao: true, iata: true } },
            },
          },
          createdAt: true,
          deletedAt: true,
        },
      });

    const fetchQuotes = () =>
      this.prisma.quote.findMany({
        where: { ...archiveWhere, ...(createdAtSpan ? { createdAt: createdAtSpan } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          version: true,
          status: true,
          departureDate: true,
          returnDate: true,
          passengers: true,
          quotedAircraft: true,
          basePrice: true,
          fetEnabled: true,
          fetRate: true,
          operatorCost: true,
          lineItems: true,
          validUntil: true,
          client: { select: { firstName: true, lastName: true, companyName: true } },
          assignedBroker: { select: { firstName: true, lastName: true } },
          operator: { select: { name: true } },
          aircraft: { select: { tailNumber: true, model: true } },
          originAirport: { select: { icao: true, iata: true } },
          destinationAirport: { select: { icao: true, iata: true } },
          createdAt: true,
          deletedAt: true,
        },
      });

    const fetchReceivables = () =>
      this.prisma.invoice.findMany({
        where: { ...archiveWhere, ...(createdAtSpan ? { createdAt: createdAtSpan } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          amount: true,
          fetAmount: true,
          status: true,
          issuedAt: true,
          dueDate: true,
          trip: { select: { reference: true } },
          client: { select: { firstName: true, lastName: true, companyName: true } },
          payments: { where: { deletedAt: null }, select: { amount: true } },
          createdAt: true,
          deletedAt: true,
        },
      });

    const fetchOperatorPayments = () =>
      this.prisma.operatorPayable.findMany({
        where: { ...archiveWhere, ...(createdAtSpan ? { createdAt: createdAtSpan } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          amount: true,
          status: true,
          dueDate: true,
          operatorReference: true,
          trip: { select: { reference: true } },
          operator: { select: { name: true } },
          payments: { where: { deletedAt: null }, select: { amount: true } },
          createdAt: true,
          deletedAt: true,
        },
      });

    const fetchCommissions = () =>
      this.prisma.commission.findMany({
        where: { ...archiveWhere, ...(createdAtSpan ? { createdAt: createdAtSpan } : {}) },
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          recipientType: true,
          recipientName: true,
          recipientCompany: true,
          recipientUser: { select: { firstName: true, lastName: true } },
          recipientClient: { select: { firstName: true, lastName: true, companyName: true } },
          broker: { select: { firstName: true, lastName: true } },
          basis: true,
          percentage: true,
          amount: true,
          finalAmount: true,
          status: true,
          method: true,
          paidAt: true,
          trip: {
            select: {
              reference: true,
              basePrice: true,
              fetEnabled: true,
              fetRate: true,
              operatorCost: true,
              lineItems: true,
            },
          },
          createdAt: true,
          deletedAt: true,
        },
      });

    let body: Buffer;
    if (query.scope === 'ALL') {
      const [clients, trips, quotes, receivables, operatorPayments, commissions] = await Promise.all([
        fetchClients(),
        fetchTrips(),
        fetchQuotes(),
        fetchReceivables(),
        fetchOperatorPayments(),
        fetchCommissions(),
      ]);
      const sheets: WorksheetSpec<any>[] = [
        { sheetName: 'Clients', columns: clientExportColumns(query.includeArchived), rows: clients },
        { sheetName: 'Trips', columns: tripExportColumns(query.includeArchived), rows: trips },
        { sheetName: 'Quotes', columns: quoteExportColumns(query.includeArchived), rows: quotes },
        { sheetName: 'Receivables', columns: receivableExportColumns(query.includeArchived), rows: receivables },
        {
          sheetName: 'Operator Payments',
          columns: operatorPaymentExportColumns(query.includeArchived),
          rows: operatorPayments,
        },
        { sheetName: 'Commissions', columns: commissionExportColumns(query.includeArchived), rows: commissions },
      ];
      body = await toMultiSheetXlsx(sheets);
    } else if (query.scope === 'CLIENTS') {
      body = await toFile(query.format, clientExportColumns(query.includeArchived), await fetchClients(), 'Clients');
    } else if (query.scope === 'TRIPS') {
      body = await toFile(query.format, tripExportColumns(query.includeArchived), await fetchTrips(), 'Trips');
    } else if (query.scope === 'QUOTES') {
      body = await toFile(query.format, quoteExportColumns(query.includeArchived), await fetchQuotes(), 'Quotes');
    } else if (query.scope === 'RECEIVABLES') {
      body = await toFile(
        query.format,
        receivableExportColumns(query.includeArchived),
        await fetchReceivables(),
        'Receivables',
      );
    } else if (query.scope === 'OPERATOR_PAYMENTS') {
      body = await toFile(
        query.format,
        operatorPaymentExportColumns(query.includeArchived),
        await fetchOperatorPayments(),
        'Operator Payments',
      );
    } else {
      body = await toFile(
        query.format,
        commissionExportColumns(query.includeArchived),
        await fetchCommissions(),
        'Commissions',
      );
    }

    const span =
      query.from && query.to
        ? `${isoDay(query.from)}-to-${isoDay(query.to)}`
        : query.from
          ? `from-${isoDay(query.from)}`
          : query.to
            ? `until-${isoDay(query.to)}`
            : 'all';
    const slug = query.scope.toLowerCase().replace(/_/g, '-');

    return {
      body,
      contentType: EXPORT_CONTENT_TYPES[query.format],
      filename: `tribeca-${slug}-${span}.${EXPORT_EXTENSIONS[query.format]}`,
    };
  }

  /**
   * `POST /settings/import/validate` (#31). Parses a CSV or XLSX file, maps
   * columns onto target fields, checks required fields and database duplicates,
   * and returns the row-by-row preview without writing to the database.
   */
  async validateImport(file: IncomingFile, fields: SettingsImportFieldsInput) {
    const parsed = await readTabular(file.buffer, file.mimetype);
    if (!parsed) {
      throw new BadRequestException('Use a CSV or XLSX file. Legacy .xls files are not accepted.');
    }
    if (parsed.columns.length === 0) {
      throw new BadRequestException('The uploaded file has no header row.');
    }

    const mapping = resolveColumnMapping(parsed.columns, fields.type, fields.mapping);
    const context = await this.loadImportContext(fields.type);
    const batch = validateImportBatch(fields.type, parsed.rows, mapping, context);

    return {
      type: fields.type,
      format: parsed.format,
      columns: parsed.columns,
      mapping,
      totalRows: parsed.rows.length,
      validCount: batch.validCount,
      duplicateCount: batch.duplicateCount,
      errorCount: batch.errorCount,
      preview: batch.preview,
    };
  }

  /**
   * `POST /settings/import/commit` (#31). Re-validates the uploaded file and
   * inserts all valid, non-duplicate rows inside a transaction.
   */
  async commitImport(actor: AuthenticatedUser, file: IncomingFile, fields: SettingsImportFieldsInput) {
    const parsed = await readTabular(file.buffer, file.mimetype);
    if (!parsed) {
      throw new BadRequestException('Use a CSV or XLSX file. Legacy .xls files are not accepted.');
    }
    if (parsed.columns.length === 0) {
      throw new BadRequestException('The uploaded file has no header row.');
    }

    const mapping = resolveColumnMapping(parsed.columns, fields.type, fields.mapping);
    const context = await this.loadImportContext(fields.type);
    const batch = validateImportBatch(fields.type, parsed.rows, mapping, context);

    if (batch.validCount === 0) {
      throw new BadRequestException('There are no valid new rows to import in this file.');
    }

    const settings = await this.read();
    const nextFollowUpAt = new Date(Date.now() + settings.followUpIntervalDays * 86_400_000);

    await this.prisma.$transaction(async (tx) => {
      if (fields.type === 'AIRPORTS' && batch.airports.length > 0) {
        await tx.airport.createMany({
          data: batch.airports.map((row) => ({
            ...row,
            createdById: actor.id,
            updatedById: actor.id,
          })),
        });
      } else if (fields.type === 'OPERATORS' && batch.operators.length > 0) {
        await tx.operator.createMany({
          data: batch.operators.map((row) => ({
            ...row,
            createdById: actor.id,
            updatedById: actor.id,
          })),
        });
      } else if (fields.type === 'AIRCRAFT' && batch.aircraft.length > 0) {
        await tx.aircraft.createMany({
          data: batch.aircraft.map((row) => ({
            ...row,
            createdById: actor.id,
            updatedById: actor.id,
          })),
        });
      } else if (fields.type === 'CLIENTS' && batch.clients.length > 0) {
        await tx.client.createMany({
          data: batch.clients.map((row) => ({
            ...row,
            leadStage: settings.defaultLeadStage,
            nextFollowUpAt,
            createdById: actor.id,
            updatedById: actor.id,
          })),
        });
      }
    });

    await this.audit.record({
      actorId: actor.id,
      action: 'settings.data_imported',
      entityType: 'CompanySettings',
      entityId: String(SETTINGS_ID),
      metadata: {
        type: fields.type,
        importedCount: batch.validCount,
        duplicateCount: batch.duplicateCount,
        errorCount: batch.errorCount,
      },
    });
    this.logger.log(
      `Imported ${batch.validCount} ${fields.type} records by ${actor.id} (${batch.duplicateCount} duplicates, ${batch.errorCount} errors skipped)`,
    );

    return {
      type: fields.type,
      importedCount: batch.validCount,
      duplicateCount: batch.duplicateCount,
      errorCount: batch.errorCount,
    };
  }

  private async loadImportContext(type: ImportType): Promise<ImportLookupContext> {
    const context: ImportLookupContext = {
      existingIcaos: new Set(),
      existingOperatorNames: new Set(),
      existingTails: new Set(),
      operatorsByName: new Map(),
      existingClientEmails: new Set(),
      existingClientNamePhones: new Set(),
      airportsByCode: new Map(),
    };

    if (type === 'AIRPORTS') {
      const rows = await this.prisma.airport.findMany({ select: { icao: true } });
      for (const r of rows) context.existingIcaos.add(r.icao.toUpperCase());
    } else if (type === 'OPERATORS') {
      const rows = await this.prisma.operator.findMany({ select: { name: true } });
      for (const r of rows) context.existingOperatorNames.add(r.name.toLowerCase());
    } else if (type === 'AIRCRAFT') {
      const [tails, ops] = await Promise.all([
        this.prisma.aircraft.findMany({ select: { tailNumber: true } }),
        this.prisma.operator.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      ]);
      for (const t of tails) context.existingTails.add(t.tailNumber.toUpperCase());
      for (const o of ops) context.operatorsByName.set(o.name.toLowerCase(), o.id);
    } else if (type === 'CLIENTS') {
      const [clients, airports] = await Promise.all([
        this.prisma.client.findMany({ select: { firstName: true, lastName: true, email: true, phone: true } }),
        this.prisma.airport.findMany({ where: { deletedAt: null }, select: { id: true, icao: true, iata: true } }),
      ]);
      for (const c of clients) {
        if (c.email) context.existingClientEmails.add(c.email.toLowerCase());
        if (c.phone) {
          context.existingClientNamePhones.add(
            `${c.firstName.toLowerCase()}|${c.lastName.toLowerCase()}|${c.phone}`,
          );
        }
      }
      for (const a of airports) {
        context.airportsByCode.set(a.icao.toUpperCase(), a.id);
        if (a.iata) context.airportsByCode.set(a.iata.toUpperCase(), a.id);
      }
    }

    return context;
  }
}
