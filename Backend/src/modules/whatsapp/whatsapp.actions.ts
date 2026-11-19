import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Action, canDo, Module } from '../../common/authorization/access.js';
import { createPaymentSchema } from '../../common/dto/payments.js';
import { toCents } from '../../common/money/cents.js';
import { formatDollars } from '../../common/money/settlement.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { TaskStatus } from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';
import { createClientSchema } from '../clients/dto/client.dto.js';
import { ReceivablesService } from '../receivables/receivables.service.js';
import { updateTaskSchema } from '../tasks/dto/task.dto.js';
import { TasksService } from '../tasks/tasks.service.js';
import { createTripRequestSchema } from '../trip-requests/dto/trip-request.dto.js';
import { TripRequestsService } from '../trip-requests/trip-requests.service.js';
import { rejectTripSchema } from '../trips/dto/trip.dto.js';
import { TripsService } from '../trips/trips.service.js';
import type { PendingAction } from './whatsapp.pending.js';

export const ACTION_ACCESS = {
  TRIP_APPROVE: { module: Module.TRIPS, action: Action.APPROVE },
  TRIP_DECLINE: { module: Module.TRIPS, action: Action.APPROVE },
  TASK_COMPLETE: { module: Module.TASKS, action: Action.EDIT },
  PAYMENT_RECORD: { module: Module.RECEIVABLES, action: Action.PAY },
} as const;

/** The same alternative CREATE permission as the Clients and Trip Requests routes. */
export function canCreate(user: AuthenticatedUser, module: typeof Module.CLIENTS | typeof Module.TRIP_REQUESTS): boolean {
  return canDo(user.access, module, Action.CREATE) || canDo(user.access, Module.LEADS_AGENTS, Action.CREATE);
}

function canRun(user: AuthenticatedUser, action: PendingAction): boolean {
  if (action.kind === 'LEAD_CREATE') {
    const { lead } = action;
    return (lead.type === 'existing' || canCreate(user, Module.CLIENTS)) &&
      (!lead.request || canCreate(user, Module.TRIP_REQUESTS));
  }
  const { module, action: capability } = ACTION_ACCESS[action.kind];
  return canDo(user.access, module, capability);
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
