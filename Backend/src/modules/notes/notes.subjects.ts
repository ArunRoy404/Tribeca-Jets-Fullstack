import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Permission,
  Scope,
  canWrite,
  scopeFor,
} from '../../common/authorization/permissions.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { NoteSubjectType } from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';

/** What a subject is, once it has been resolved and found readable. */
export interface SubjectRef {
  id: string;
  label: string;
  /** Archived subjects can still be read. They cannot be written on. */
  archived: boolean;
}

/**
 * What a timeline needs to know about the kind of record it hangs on.
 *
 * `entityType` is the string the audit log already stores in its own
 * `entityType` column, and it has to match exactly — the timeline reads both
 * tables and joins them on nothing but this value and the subject id.
 */
interface SubjectDefinition {
  /** How to name it in an error message. Lower case; it appears mid-sentence. */
  noun: string;
  /** The `AuditLog.entityType` value for this kind of record. */
  entityType: string;
  /** Reading the subject's timeline needs this. */
  view: Permission;
  /** Writing on it needs this, at a scope that is not READ. */
  manage: Permission;
}

const SUBJECTS: Record<NoteSubjectType, SubjectDefinition> = {
  [NoteSubjectType.CLIENT]: {
    noun: 'client',
    entityType: 'Client',
    view: Permission.VIEW_CLIENTS,
    manage: Permission.MANAGE_CLIENTS,
  },
};

export function subjectDefinition(type: NoteSubjectType): SubjectDefinition {
  return SUBJECTS[type];
}

/**
 * Resolves a note's subject through the module that owns it.
 *
 * A polymorphic `subjectId` is a column the database cannot check, so this is
 * where the check lives instead. It deliberately does **not** query the other
 * module's table: `ClientsService.subjectRef` applies the same row-level scope
 * a broker gets everywhere else, so a note about a client a broker may not see
 * is unreachable by exactly the rule that already hides the client — not by a
 * second copy of that rule written here, which is the copy that drifts.
 *
 * One `case` per subject type. When Trips ships, this gains three lines and
 * nothing else in the notes module changes.
 */
@Injectable()
export class NoteSubjectsService {
  constructor(private readonly clients: ClientsService) {}

  /**
   * The subject, or 404 — including when it exists and the caller may not see
   * it. A 403 would confirm the record, which turns an id into an oracle.
   */
  async resolve(
    user: AuthenticatedUser,
    type: NoteSubjectType,
    id: string,
  ): Promise<SubjectRef> {
    switch (type) {
      case NoteSubjectType.CLIENT:
        return this.clients.subjectRef(user, id);
      default:
        // Unreachable while the DTO validates against the enum; kept so adding
        // a subject type without registering it fails loudly rather than
        // returning everyone's notes.
        throw new NotFoundException('That record does not exist');
    }
  }

  /** Whether this role may read timelines of this kind at all. */
  mayRead(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    return scopeFor(user.role, subjectDefinition(type).view) !== Scope.NONE;
  }

  /**
   * Whether this role may write on timelines of this kind at all.
   *
   * Coarse, not row-level — `resolve` handles the row. An assistant holds
   * MANAGE_CLIENTS at NONE, so they read a client's timeline and cannot add to
   * it, which is the same line the Clients screen already draws around Edit.
   */
  mayWrite(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    return canWrite(user.role, subjectDefinition(type).manage);
  }

  /** Whether this role reaches every row of this kind — an administrator. */
  administers(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    return scopeFor(user.role, subjectDefinition(type).manage) === Scope.ALL;
  }
}
