import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { MailService } from '../../core/mail/mail.service.js';
import { paginate, type AuthenticatedUser, type Paginated } from '../../common/types/api.types.js';
import { toPrismaPagination } from '../../common/dto/pagination.dto.js';
import { equalsAny, orderByField, searchAcross } from '../../common/database/filters.js';
import { Permission, Scope, can, scopeFor } from '../../common/authorization/permissions.js';
import { EmailMessageStatus } from '../../generated/prisma/enums.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ClientsService } from '../clients/clients.service.js';
import { OperatorsService } from '../operators/operators.service.js';
import { TripsService } from '../trips/trips.service.js';
import { QuotesService } from '../quotes/quotes.service.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { invoiceNumber } from '../receivables/receivables.amounts.js';
import { mergeField } from './email.fields.js';
import {
  airportCode,
  formatDay,
  formatMoney,
  formatRoute,
  formatTime,
  renderMerge,
  unknownTokens,
  type MergeValues,
} from './email.merge.js';
import type { PreviewEmailInput, QueryEmailsInput, SendEmailInput } from './dto/email.dto.js';

const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} satisfies Prisma.UserDefaultArgs;

const EMAIL_LIST_SELECT = {
  id: true,
  toEmail: true,
  toName: true,
  subject: true,
  status: true,
  error: true,
  templateId: true,
  template: { select: { id: true, name: true, category: true } },
  clientId: true,
  client: { select: { id: true, firstName: true, lastName: true, companyName: true } },
  operatorId: true,
  operator: { select: { id: true, name: true } },
  tripId: true,
  trip: { select: { id: true, reference: true } },
  quoteId: true,
  quote: { select: { id: true, reference: true } },
  invoiceId: true,
  invoice: { select: { id: true, reference: true, createdAt: true } },
  createdAt: true,
  createdById: true,
  createdBy: ACTOR_SELECT,
} satisfies Prisma.EmailMessageSelect;

const EMAIL_DETAIL_SELECT = { ...EMAIL_LIST_SELECT, body: true } satisfies Prisma.EmailMessageSelect;

type EmailRow = Prisma.EmailMessageGetPayload<{ select: typeof EMAIL_LIST_SELECT }>;

/** The invoice as its printed number ("INV-2026-0042"), worked out here once rather than in the browser. */
function serialise<T extends EmailRow>({ invoice, ...row }: T) {
  return {
    ...row,
    invoice: invoice ? { id: invoice.id, number: invoiceNumber(invoice.reference, invoice.createdAt) } : null,
  };
}

interface Recipient {
  kind: 'client' | 'operator';
  id: string;
  name: string;
  email: string | null;
}

interface Resolved {
  recipient: Recipient;
  values: MergeValues;
}

/**
 * Sending an email from the CRM (Email Templates, #21; scope §6.17), and the
 * log of every one sent.
 *
 * Every record an email names is read through the module that owns it, under
 * the caller's own scope and capability — so the preview can never fill in a
 * figure its sender could not have opened, and a broker cannot email a client
 * that is not theirs. Each must also belong to the recipient: a client is
 * never sent somebody else's invoice.
 *
 * **Delivery is the system's mail server**, the one that already sends
 * sign-in codes, with the sender's own address as Reply-To. The scope leaves
 * the exact Gmail workflow open (§17); this is the direct implementation
 * until it is decided, and a Gmail transport would replace the delivery here
 * without changing any screen.
 */
@Injectable()
export class EmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly clients: ClientsService,
    private readonly operators: OperatorsService,
    private readonly trips: TripsService,
    private readonly quotes: QuotesService,
    private readonly receivables: ReceivablesService,
  ) {}

  // ---- Scope ------------------------------------------------------------

  /** Emails I sent, or about a client or a trip I may see. ALL sees the lot. */
  private scopeWhere(user: AuthenticatedUser): Prisma.EmailMessageWhereInput {
    if (scopeFor(user.role, Permission.SEND_EMAILS) === Scope.ALL) return {};
    return {
      OR: [
        { createdById: user.id },
        { client: { is: this.clients.visibleWhere(user) } },
        { trip: { is: this.trips.visibleWhere(user) } },
      ],
    };
  }

  /** "Sent" means a mail server accepted it — LOGGED and FAILED are not counted. */
  countSent(user: AuthenticatedUser, from: Date, to: Date): Promise<number> {
    return this.prisma.emailMessage.count({
      where: { AND: [this.scopeWhere(user), { status: EmailMessageStatus.SENT, createdAt: { gte: from, lt: to } }] },
    });
  }

  // ---- Resolving what an email is about ----------------------------------

  /** A capability the email needs, beyond SEND_EMAILS: reading what it quotes. */
  private assertMayRead(user: AuthenticatedUser, permission: Permission, what: string): void {
    if (!can(user.role, permission)) {
      throw new ForbiddenException(`Your role cannot read ${what}, so it cannot email about one.`);
    }
  }

  /**
   * An owner module's 404 as a 400 naming the problem — the compose form
   * needs a reason — and an archived record refused, like any other write.
   */
  private async resolve<T extends { deletedAt?: Date | null; archived?: boolean }>(
    noun: string,
    read: () => Promise<T>,
  ): Promise<T> {
    let row: T;
    try {
      row = await read();
    } catch (error) {
      if (error instanceof NotFoundException) throw new BadRequestException(`That ${noun} does not exist`);
      throw error;
    }
    if (row.archived || row.deletedAt) {
      throw new BadRequestException(`That ${noun} has been archived. Restore it first.`);
    }
    return row;
  }

  private notTheirs(noun: string, recipient: Recipient): never {
    throw new BadRequestException(`That ${noun} is not ${recipient.name}'s`);
  }

  private async context(user: AuthenticatedUser, input: PreviewEmailInput): Promise<Resolved> {
    const values: MergeValues = {};
    let recipient: Recipient;

    if (input.clientId) {
      this.assertMayRead(user, Permission.VIEW_CLIENTS, 'clients');
      const client = await this.resolve('client', () => this.clients.emailRecipient(user, input.clientId!));
      recipient = { kind: 'client', id: client.id, name: client.name, email: client.email };
      values.client_name = client.name;
      values.client_first_name = client.firstName;
    } else {
      this.assertMayRead(user, Permission.MANAGE_OPERATORS, 'operators');
      const operator = await this.resolve('operator', () => this.operators.emailRecipient(input.operatorId!));
      recipient = { kind: 'operator', id: operator.id, name: operator.name, email: operator.email };
      values.operator_name = operator.name;
      values.operator_contact = operator.contact;
    }

    if (input.tripId) {
      this.assertMayRead(user, Permission.VIEW_TRIPS, 'trips');
      const trip = await this.resolve('trip', () => this.trips.findOne(user, input.tripId!));
      const owner = recipient.kind === 'client' ? trip.clientId : trip.operatorId;
      if (owner !== recipient.id) this.notTheirs('trip', recipient);
      const first = trip.legs[0];
      const last = trip.legs[trip.legs.length - 1];
      values.trip_id = `TJ-${trip.reference}`;
      values.route = formatRoute(trip.legs);
      values.origin = airportCode(first?.originAirport);
      values.destination = airportCode(last?.destinationAirport);
      values.departure_date = formatDay(first?.departureDate ?? trip.departureDate);
      values.departure_time = formatTime(first?.departureTime);
      values.aircraft = trip.aircraft?.model ?? trip.aircraftDescription ?? null;
      values.tail_number = trip.aircraft?.tailNumber ?? null;
      values.passenger_count = trip.passengerCount ? String(trip.passengerCount) : null;
    }

    if (input.quoteId) {
      if (recipient.kind !== 'client') throw new BadRequestException('A quote is sent to its client, not an operator');
      this.assertMayRead(user, Permission.VIEW_TRIPS, 'quotes');
      const quote = await this.resolve('quote', () => this.quotes.findOne(user, input.quoteId!));
      if (quote.clientId !== recipient.id) this.notTheirs('quote', recipient);
      values.quote_id = `Q-${quote.reference}`;
      values.total_price = formatMoney(quote.totalPrice);
      values.fet_amount = formatMoney(quote.fetAmount);
      values.quote_valid_until = formatDay(quote.validUntil);
      // The offer's own route, date and aircraft stand in only while no trip
      // is named — once one is, the booking is the fact.
      if (!input.tripId) {
        const from = airportCode(quote.originAirport);
        const to = airportCode(quote.destinationAirport);
        values.route = from && to ? [from, to, ...(quote.returnDate ? [from] : [])].join(' → ') : null;
        values.origin = from;
        values.destination = to;
        values.departure_date = formatDay(quote.departureDate);
        values.aircraft = quote.aircraft?.model ?? quote.quotedAircraft ?? null;
        values.passenger_count = quote.passengers ? String(quote.passengers) : null;
      }
    }

    if (input.invoiceId) {
      if (recipient.kind !== 'client') throw new BadRequestException('An invoice is sent to its client, not an operator');
      this.assertMayRead(user, Permission.VIEW_RECEIVABLES, 'invoices');
      const invoice = await this.resolve('invoice', () => this.receivables.findOne(user, input.invoiceId!));
      if (invoice.clientId !== recipient.id) this.notTheirs('invoice', recipient);
      values.invoice_id = invoice.number;
      values.invoice_total = formatMoney(invoice.total);
      values.amount_due = formatMoney(invoice.balance);
      values.due_date = formatDay(invoice.dueDate);
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { firstName: true, lastName: true, email: true },
    });
    values.broker_name = sender ? `${sender.firstName} ${sender.lastName}`.trim() || null : null;
    values.broker_email = sender?.email ?? user.email;

    return { recipient, values };
  }

  private async template(id: string | undefined) {
    if (!id) return null;
    const row = await this.prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true, subject: true, body: true, active: true, deletedAt: true },
    });
    if (!row || row.deletedAt) throw new BadRequestException('That template does not exist');
    if (!row.active) throw new BadRequestException(`"${row.name}" is switched off. Turn it on to use it.`);
    return row;
  }

  /** Missing fields, with their labels, for the compose form to list. */
  private describeMissing(keys: string[]) {
    return keys.map((key) => ({ key, label: mergeField(key)?.label ?? key, source: mergeField(key)?.source ?? null }));
  }

  // ---- Preview and send --------------------------------------------------

  /**
   * The template filled in for this recipient — what the compose form opens
   * with. Nothing is sent and nothing is written. Fields that could not be
   * filled stay as their tokens and are listed, so the broker can pick the
   * record they need or type the fact in.
   */
  async preview(user: AuthenticatedUser, input: PreviewEmailInput) {
    const { recipient, values } = await this.context(user, input);
    const template = await this.template(input.templateId);
    const subject = renderMerge(template?.subject ?? '', values);
    const body = renderMerge(template?.body ?? '', values);
    return {
      to: { kind: recipient.kind, id: recipient.id, name: recipient.name, email: recipient.email },
      templateId: template?.id ?? null,
      subject: subject.text,
      body: body.text,
      missing: this.describeMissing([...new Set([...subject.missing, ...body.missing])]),
    };
  }

  async send(user: AuthenticatedUser, input: SendEmailInput) {
    const { recipient, values } = await this.context(user, input);
    const template = await this.template(input.templateId);

    if (!recipient.email) {
      throw new BadRequestException(`${recipient.name} has no email address on file. Add one to their record first.`);
    }
    const unknown = unknownTokens(input.subject, input.body);
    if (unknown.length) {
      throw new BadRequestException(`Unknown merge field: ${unknown.map((t) => `{${t}}`).join(', ')}`);
    }
    const subject = renderMerge(input.subject, values);
    const body = renderMerge(input.body, values);
    const missing = [...new Set([...subject.missing, ...body.missing])];
    if (missing.length) {
      throw new BadRequestException(
        `Not on file for this email: ${this.describeMissing(missing)
          .map((m) => m.label)
          .join(', ')}. Pick the record it comes from, or type it in.`,
      );
    }

    // Written first as QUEUED, then handed to the mail queue, so the broker
    // gets an answer at once. The worker moves the row to SENT (a mail server
    // took it), LOGGED (none configured) or FAILED, and writes the timeline
    // entries then — `email.sent` means sent, not "about to be".
    const row = await this.prisma.emailMessage.create({
      data: {
        toEmail: recipient.email,
        toName: recipient.name,
        subject: subject.text,
        body: body.text,
        status: EmailMessageStatus.QUEUED,
        templateId: template?.id ?? null,
        clientId: recipient.kind === 'client' ? recipient.id : null,
        operatorId: recipient.kind === 'operator' ? recipient.id : null,
        tripId: input.tripId ?? null,
        quoteId: input.quoteId ?? null,
        invoiceId: input.invoiceId ?? null,
        createdById: user.id,
      },
      select: EMAIL_DETAIL_SELECT,
    });

    try {
      await this.mail.enqueue(
        { to: recipient.email, subject: subject.text, text: body.text, replyTo: values.broker_email ?? undefined },
        row.id,
      );
    } catch {
      await this.prisma.emailMessage.update({
        where: { id: row.id },
        data: { status: EmailMessageStatus.FAILED, error: 'The email could not be queued for sending' },
      });
      throw new BadGatewayException(
        `The email to ${recipient.name} could not be queued, so nothing was sent. The attempt is in the sent log.`,
      );
    }

    // QUEUED alone cannot say whether it will reach anyone: without a mail
    // server the worker records it LOGGED. `willDeliver` tells the compose
    // form, which marks a quote or itinerary sent only when it is true.
    return { ...serialise(row), willDeliver: this.mail.driverName === 'smtp' };
  }

  // ---- The sent log -------------------------------------------------------

  async findAll(user: AuthenticatedUser, query: QueryEmailsInput): Promise<Paginated<unknown>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.EmailMessageWhereInput = {
      AND: [
        this.scopeWhere(user),
        equalsAny(query, ['status', 'clientId', 'operatorId', 'tripId', 'templateId']),
        searchAcross(query.search, ['subject', 'toName', 'toEmail']),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.emailMessage.findMany({
        where,
        skip,
        take,
        orderBy: [orderByField(query.sortBy, query.sortOrder), { id: 'desc' }],
        select: EMAIL_LIST_SELECT,
      }),
      this.prisma.emailMessage.count({ where }),
    ]);
    return paginate(rows.map(serialise), total, query.page, query.limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.emailMessage.findFirst({
      where: { AND: [{ id }, this.scopeWhere(user)] },
      select: EMAIL_DETAIL_SELECT,
    });
    if (!row) throw new NotFoundException('Email not found');
    return serialise(row);
  }
}
