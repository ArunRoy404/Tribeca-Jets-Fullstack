import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Permission,
  Scope,
  canWrite,
  isAdministrator,
  scopeFor,
} from '../../common/authorization/permissions.js';
import {
  Action,
  Module,
  Reach,
  canDo,
  reachOf,
} from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { NoteSubjectType } from '../../generated/prisma/enums.js';
import { ClientsService } from '../clients/clients.service.js';
import { TripsService } from '../trips/trips.service.js';
import { ReferralsService } from '../referrals/referrals.service.js';

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
  /** The per-person permission module governance. */
  module: Module;
  /** Reading the subject's timeline needs this (legacy matrix). */
  view: Permission;
  /** Writing on it needs this, at a scope that is not READ (legacy matrix). */
  manage: Permission;
}

const SUBJECTS: Record<NoteSubjectType, SubjectDefinition> = {
  [NoteSubjectType.CLIENT]: {
    noun: 'client',
    entityType: 'Client',
    module: Module.CLIENTS,
    view: Permission.VIEW_CLIENTS,
    manage: Permission.MANAGE_CLIENTS,
  },
  [NoteSubjectType.TRIP]: {
    noun: 'trip',
    // Matches the `entityType` the trips service writes to the audit log, so
    // a trip's timeline merges its status changes with its notes.
    entityType: 'Trip',
    module: Module.TRIPS,
    view: Permission.VIEW_TRIPS,
    manage: Permission.MANAGE_TRIPS,
  },
  [NoteSubjectType.REFERRAL]: {
    noun: 'referral',
    entityType: 'Referral',
    module: Module.REFERRALS,
    // A referral agent holds both at OWN; `NotesService` narrows them to
    // reading SHARED notes on their own referrals and writing nothing.
    view: Permission.VIEW_REFERRALS,
    manage: Permission.MANAGE_REFERRALS,
  },
  [NoteSubjectType.FLIGHT]: {
    noun: 'flight',
    // A trip leg (Flight Tracking, #14). Matches the `entityType` the trips
    // service writes when a flight's status is reported, so a flight's
    // updates and its status changes read as one feed.
    entityType: 'TripLeg',
    module: Module.FLIGHT_TRACKING,
    view: Permission.VIEW_TRIPS,
    manage: Permission.MANAGE_TRIPS,
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
  constructor(
    private readonly clients: ClientsService,
    private readonly trips: TripsService,
    private readonly referrals: ReferralsService,
  ) {}

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
      case NoteSubjectType.TRIP:
        return this.trips.subjectRef(user, id);
      case NoteSubjectType.REFERRAL:
        return this.referrals.subjectRef(user, id);
      case NoteSubjectType.FLIGHT:
        return this.trips.flightSubjectRef(user, id);
      default:
        // Unreachable while the DTO validates against the enum; kept so adding
        // a subject type without registering it fails loudly rather than
        // returning everyone's notes.
        throw new NotFoundException('That record does not exist');
    }
  }

  /** Whether this caller may read timelines of this kind at all. */
  mayRead(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    if (user.access) {
      if (type === NoteSubjectType.FLIGHT) {
        return (
          canDo(user.access, Module.FLIGHT_TRACKING, Action.VIEW) ||
          canDo(user.access, Module.TRIPS, Action.VIEW)
        );
      }
      return canDo(user.access, subjectDefinition(type).module, Action.VIEW);
    }
    return scopeFor(user.role, subjectDefinition(type).view) !== Scope.NONE;
  }

  /**
   * Whether this caller may write on timelines of this kind at all.
   *
   * Coarse, not row-level — `resolve` handles the row.
   */
  mayWrite(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    if (user.access) {
      if (type === NoteSubjectType.FLIGHT) {
        return (
          canDo(user.access, Module.FLIGHT_TRACKING, Action.EDIT) ||
          canDo(user.access, Module.TRIPS, Action.EDIT)
        );
      }
      return canDo(user.access, subjectDefinition(type).module, Action.EDIT);
    }
    return canWrite(user.role, subjectDefinition(type).manage);
  }

  /** Whether this caller reaches every row of this kind — an administrator. */
  administers(user: AuthenticatedUser, type: NoteSubjectType): boolean {
    if (user.access) {
      return (
        reachOf(user.access, subjectDefinition(type).module) === Reach.ALL ||
        isAdministrator(user.role)
      );
    }
    return scopeFor(user.role, subjectDefinition(type).manage) === Scope.ALL;
  }
}
