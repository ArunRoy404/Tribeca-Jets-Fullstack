import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Action, canDo, Module } from '../../common/authorization/access.js';
import { createPaymentSchema } from '../../common/dto/payments.js';
import { toCents } from '../../common/money/cents.js';
import { formatDollars } from '../../common/money/settlement.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TaskStatus } from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';
import { createClientSchema, updateClientSchema } from '../clients/dto/client.dto.js';
import { NotesService } from '../notes/notes.service.js';
import { QuotesService } from '../quotes/quotes.service.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { updateTaskSchema } from '../tasks/dto/task.dto.js';
import { TasksService } from '../tasks/tasks.service.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { rejectTripSchema, updateTripSchema } from '../trips/dto/trip.dto.js';
import { TripsService } from '../trips/trips.service.js';
import {
  clientAssignPayload, clientFollowUpPayload, noteCreatePayload, quoteSendPayload, taskCreatePayload,
  tripAssignPayload, tripStatusPayload, type PendingAction,
} from './whatsapp.pending.js';

export const ACTION_ACCESS = {
  TRIP_APPROVE: { module: Module.TRIPS, action: Action.APPROVE },
  TRIP_DECLINE: { module: Module.TRIPS, action: Action.APPROVE },
  TASK_COMPLETE: { module: Module.TASKS, action: Action.EDIT },
  PAYMENT_RECORD: { module: Module.RECEIVABLES, action: Action.PAY },
  TASK_CREATE: { module: Module.TASKS, action: Action.CREATE },
  CLIENT_FOLLOW_UP: { module: Module.CLIENTS, action: Action.EDIT },
  NOTE_CREATE: { module: Module.CLIENTS, action: Action.EDIT },
  TRIP_STATUS: { module: Module.TRIPS, action: Action.EDIT },
  TRIP_ASSIGN: { module: Module.TRIPS, action: Action.EDIT },
  CLIENT_ASSIGN: { module: Module.CLIENTS, action: Action.EDIT },
  QUOTE_SEND: { module: Module.QUOTES, action: Action.SEND },
} as const;

/** The same alternative CREATE permission as the Clients and Trip Requests routes. */
export function canCreate(user: AuthenticatedUser, module: typeof Module.CLIENTS | typeof Module.TRIP_REQUESTS): boolean {
  return canDo(user.access, module, Action.CREATE) || canDo(user.access, Module.LEADS_AGENTS, Action.CREATE);
}

export function canAssignTask(user: AuthenticatedUser, assigneeId: string | undefined): boolean {
  return !assigneeId || assigneeId === user.id || canDo(user.access, Module.TASKS, Action.ASSIGN);
}

export function canReassign(user: AuthenticatedUser, kind: 'TRIP_ASSIGN' | 'CLIENT_ASSIGN'): boolean {
  const { module, action } = ACTION_ACCESS[kind];
  return canDo(user.access, module, action) && (
    canDo(user.access, module, Action.ASSIGN) ||
    (kind === 'CLIENT_ASSIGN' && canDo(user.access, Module.LEADS_AGENTS, Action.ASSIGN))
  );
}

function canRun(user: AuthenticatedUser, action: PendingAction): boolean {
  if (action.kind === 'LEAD_CREATE') {
    const { lead } = action;
    return (lead.type === 'existing' || canCreate(user, Module.CLIENTS)) &&
      (!lead.request || canCreate(user, Module.TRIP_REQUESTS));
  }
  if (action.kind === 'TRIP_ASSIGN' || action.kind === 'CLIENT_ASSIGN') return canReassign(user, action.kind);
  const { module, action: capability } = ACTION_ACCESS[action.kind];
  return canDo(user.access, module, capability) &&
    (action.kind !== 'TASK_CREATE' || canAssignTask(user, action.payload.assigneeId));
}

/** The placeholder is only for validation, before a new client has an id. */
export function parseLeadRequest(
  request: NonNullable<Extract<PendingAction, { kind: 'LEAD_CREATE' }>['lead']['request']>,
  clientId = '00000000-0000-4000-8000-000000000000',
) {
  const parsed = createTripRequestSchema.safeParse({ ...request, clientId });
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join('; '));
  }
  return parsed.data;
}

@Injectable()
export class WhatsappActions {
  private readonly logger = new Logger(WhatsappActions.name);

  constructor(
    private readonly trips: TripsService,
    private readonly clients: ClientsService,
    private readonly requests: TripRequestsService,
    private readonly tasks: TasksService,
    private readonly receivables: ReceivablesService,
    private readonly notes: NotesService,
    private readonly quotes: QuotesService,
  ) {}

  async run(user: AuthenticatedUser, action: PendingAction): Promise<string> {
    const { kind } = action;
    if (action.userId !== user.id) {
      this.logger.warn(`WhatsApp action ${kind} refused (${HttpStatus.FORBIDDEN})`);
      return 'Not done — that action belongs to another session.';
    }
    if (!canRun(user, action)) {
      this.logger.warn(`WhatsApp action ${kind} refused (${HttpStatus.FORBIDDEN})`);
      return 'Not done — your account can no longer do this.';
    }

    let createdLead: string | undefined;
    let reply: string;
    try {
      switch (kind) {
        case 'TRIP_APPROVE': {
          const trip = await this.trips.approve(user, action.tripId);
          reply = `✅ Trip TJ-${trip.reference} approved.`;
          break;
        }
        case 'TRIP_DECLINE': {
          const trip = await this.trips.reject(user, action.tripId, rejectTripSchema.parse(action.payload));
          reply = `✅ Trip TJ-${trip.reference} declined.`;
          break;
        }
        case 'LEAD_CREATE': {
          const { lead } = action;
          if (lead.type === 'existing') {
            const client = await this.clients.subjectRef(user, lead.clientId);
            if (client.archived) throw new BadRequestException('That client has been archived.');
            await this.requests.create(user, parseLeadRequest(lead.request, client.id));
            reply = `✅ Trip request filed for ${client.label}.`;
            break;
          }
          const request = lead.request && parseLeadRequest(lead.request);
          const client = await this.clients.create(user, createClientSchema.parse(lead.client));
          createdLead = `${client.firstName} ${client.lastName}`.trim();
          if (request) await this.requests.create(user, { ...request, clientId: client.id });
          reply = `✅ Lead ${createdLead} created${request ? ', trip request filed' : ''}.`;
          break;
        }
        case 'TASK_COMPLETE': {
          const payload = updateTaskSchema.parse({ status: TaskStatus.COMPLETED });
          const task = await this.tasks.update(user, action.taskId, payload);
          reply = `✅ Task "${task.title}" completed.`;
          break;
        }
        case 'PAYMENT_RECORD': {
          const payment = createPaymentSchema.parse(action.payload);
          const invoice = await this.receivables.recordPayment(user, action.invoiceId, payment);
          reply = `✅ ${formatDollars(toCents(payment.amount))} recorded on ${invoice.number} — balance ${formatDollars(toCents(invoice.balance))}.`;
          break;
        }
        case 'TASK_CREATE': {
          const task = await this.tasks.create(user, taskCreatePayload.parse(action.payload));
          reply = `✅ Task "${task.title}" created.`;
          break;
        }
        case 'CLIENT_FOLLOW_UP': {
          await this.clients.update(user, action.clientId, clientFollowUpPayload.parse(action.payload));
          reply = '✅ Client follow-up scheduled.';
          break;
        }
        case 'NOTE_CREATE': {
          await this.notes.create(user, noteCreatePayload.parse(action.payload));
          reply = '✅ Internal client note added.';
          break;
        }
        case 'TRIP_STATUS': {
          const trip = await this.trips.changeStatus(user, action.tripId, tripStatusPayload.parse(action.payload));
          reply = `✅ Trip TJ-${trip.reference} moved to ${trip.status}.`;
          break;
        }
        case 'TRIP_ASSIGN': {
          const payload = updateTripSchema.parse(tripAssignPayload.parse(action.payload));
          const trip = await this.trips.update(user, action.tripId, payload);
          reply = `✅ Trip TJ-${trip.reference} reassigned.`;
          break;
        }
        case 'CLIENT_ASSIGN': {
          const payload = updateClientSchema.parse(clientAssignPayload.parse(action.payload));
          await this.clients.update(user, action.clientId, payload);
          reply = '✅ Client reassigned.';
          break;
        }
        case 'QUOTE_SEND': {
          const quote = await this.quotes.send(user, action.quoteId, quoteSendPayload.parse(action.payload));
          reply = `✅ Quote Q-${quote.reference} marked as sent. No email was sent.`;
          break;
        }
      }
    } catch (error: unknown) {
      const partial = createdLead && `Created lead ${createdLead}, but the trip request was not filed:`;
      if (error instanceof HttpException) {
        this.logger.warn(`WhatsApp action ${kind} refused (${error.getStatus()})`);
        return `${partial || '❌ Not done:'} ${error.message}`;
      }
      this.logger.error(`WhatsApp action ${kind} failed (${error instanceof Error ? error.constructor.name : 'UnknownError'})`);
      return partial
        ? `${partial} The CRM could not complete it.`
        : '❌ Not done — the CRM could not complete it.';
    }
    this.logger.log(`WhatsApp action ${kind} confirmed`);
    return reply;
  }
}
