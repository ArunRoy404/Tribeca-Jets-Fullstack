import type { AuditService } from '../../core/audit/audit.service.js';
import type { SessionContext } from '../auth/token.service.js';

export const WhatsappEvent = {
  QUESTION_ANSWERED: 'whatsapp.question_answered',
  ACTION_PROPOSED: 'whatsapp.action_proposed',
  ACTION_CONFIRMED: 'whatsapp.action_confirmed',
  ACTION_CANCELLED: 'whatsapp.action_cancelled',
  DOCUMENT_SENT: 'whatsapp.document_sent',
  REPLY_FAILED: 'whatsapp.reply_failed',
  PHONE_LINKED: 'user.whatsapp_linked',
  PHONE_UNLINKED: 'user.whatsapp_unlinked',
  PHONE_RENAMED: 'user.whatsapp_phone_renamed',
  SWITCHED_ON: 'whatsapp_assistant.switched_on',
  SWITCHED_OFF: 'whatsapp_assistant.switched_off',
  SETTINGS_UPDATED: 'whatsapp_settings.updated',
  SETTINGS_REVEALED: 'whatsapp_settings.revealed',
} as const;

const {
  QUESTION_ANSWERED, ACTION_PROPOSED, ACTION_CONFIRMED, ACTION_CANCELLED, DOCUMENT_SENT, REPLY_FAILED,
  PHONE_LINKED, PHONE_UNLINKED, PHONE_RENAMED, SWITCHED_ON, SWITCHED_OFF, SETTINGS_UPDATED, SETTINGS_REVEALED,
} = WhatsappEvent;

export const LEGACY_PHONE_EVENTS = [PHONE_LINKED, PHONE_UNLINKED];
const PHONE_SETTINGS_EVENTS = [...LEGACY_PHONE_EVENTS, PHONE_RENAMED];
export const SETTINGS_ROW_EVENTS = [SWITCHED_ON, SWITCHED_OFF, SETTINGS_UPDATED, SETTINGS_REVEALED];
export const WHATSAPP_HISTORY_GROUPS = {
  messages: [QUESTION_ANSWERED, REPLY_FAILED],
  actions: [ACTION_PROPOSED, ACTION_CONFIRMED, ACTION_CANCELLED],
  documents: [DOCUMENT_SENT],
  settings: [...PHONE_SETTINGS_EVENTS, ...SETTINGS_ROW_EVENTS],
};
export const PHONE_EVENTS = [
  ...WHATSAPP_HISTORY_GROUPS.messages, ...WHATSAPP_HISTORY_GROUPS.actions,
  ...WHATSAPP_HISTORY_GROUPS.documents, ...PHONE_SETTINGS_EVENTS,
];

export type PhoneSnapshot = { id: string; label: string; last4: string };
export type ProposalDetails = { proposalId: string; kind: string; ref: string | null };
export type DocumentDetails = { kind: 'itinerary' | 'quote' | 'invoice'; ref: string };
type PhoneEventDetails = {
  [QUESTION_ANSWERED]: { tools: string[] };
  [ACTION_PROPOSED]: ProposalDetails;
  [ACTION_CONFIRMED]: ProposalDetails & { outcome: 'done' | 'refused' };
  [ACTION_CANCELLED]: ProposalDetails;
  [DOCUMENT_SENT]: DocumentDetails;
  [REPLY_FAILED]: undefined;
  [PHONE_LINKED]: undefined;
  [PHONE_UNLINKED]: { phoneId: string };
  [PHONE_RENAMED]: undefined;
};

export function phoneSnapshot(row: { id: string; label: string; phone: string }): PhoneSnapshot {
  return { id: row.id, label: row.label, last4: row.phone.slice(-4) };
}

export function recordPhoneEvent<A extends keyof PhoneEventDetails>(
  audit: AuditService, actorId: string, phone: PhoneSnapshot, action: A,
  details: PhoneEventDetails[A], context: SessionContext = {},
) {
  return audit.record({
    actorId, action, entityType: 'WhatsappPhone', entityId: phone.id,
    metadata: { ...details, last4: phone.last4, label: phone.label },
    ...context,
  });
}
