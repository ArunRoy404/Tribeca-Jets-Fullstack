import { describe, expect, it } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { Action, Module, Reach } from '../../common/authorization/access.js';
import type { AuthenticatedUser } from '../../common/types/api.types.js';
import { NoteSubjectType } from '../../generated/prisma/enums.js';
import { NoteSubjectsService } from './notes.subjects.js';

function makeUser(
  role: UserRole,
  grants?: Partial<Record<Module, Action[]>>,
  reach: Reach = Reach.ALL,
): AuthenticatedUser {
  const access: AuthenticatedUser['access'] = {};
  if (grants) {
    for (const [mod, actions] of Object.entries(grants)) {
      access[mod as Module] = { reach, actions };
    }
  }
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@tribecajets.com`,
    role,
    access,
  };
}

describe('NoteSubjectsService Access', () => {
  const mockClientsService = {} as any;
  const mockTripsService = {} as any;
  const mockReferralsService = {} as any;

  const subjects = new NoteSubjectsService(
    mockClientsService,
    mockTripsService,
    mockReferralsService,
  );

  it('allows staff with VIEW on CLIENTS to read client timelines', () => {
    const broker = makeUser(UserRole.BROKER, {
      [Module.CLIENTS]: [Action.VIEW, Action.CREATE, Action.EDIT],
    });
    expect(subjects.mayRead(broker, NoteSubjectType.CLIENT)).toBe(true);
  });

  it('refuses timeline read if user lacks VIEW on the subject module', () => {
    const userWithoutClients = makeUser(UserRole.BROKER, {
      [Module.AIRPORTS]: [Action.VIEW],
    });
    expect(subjects.mayRead(userWithoutClients, NoteSubjectType.CLIENT)).toBe(false);
  });

  it('allows staff with EDIT on CLIENTS to write notes', () => {
    const broker = makeUser(UserRole.BROKER, {
      [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
    });
    expect(subjects.mayWrite(broker, NoteSubjectType.CLIENT)).toBe(true);
  });

  it('refuses note writing when staff has only VIEW (e.g. read-only assistant)', () => {
    const assistant = makeUser(UserRole.ASSISTANT, {
      [Module.CLIENTS]: [Action.VIEW],
    });
    expect(subjects.mayWrite(assistant, NoteSubjectType.CLIENT)).toBe(false);
  });

  it('allows administrator to administer notes across any subject', () => {
    const admin = makeUser(UserRole.ADMIN, {
      [Module.CLIENTS]: [Action.VIEW, Action.EDIT, Action.ARCHIVE],
    }, Reach.ALL);
    expect(subjects.administers(admin, NoteSubjectType.CLIENT)).toBe(true);
  });

  it('restricts non-admin broker from administering others notes', () => {
    const broker = makeUser(UserRole.BROKER, {
      [Module.CLIENTS]: [Action.VIEW, Action.EDIT],
    }, Reach.ASSIGNED);
    expect(subjects.administers(broker, NoteSubjectType.CLIENT)).toBe(false);
  });

  it('checks FLIGHT timeline access through FLIGHT_TRACKING or TRIPS', () => {
    const ops = makeUser(UserRole.BROKER, {
      [Module.FLIGHT_TRACKING]: [Action.VIEW, Action.EDIT],
    });
    expect(subjects.mayRead(ops, NoteSubjectType.FLIGHT)).toBe(true);
    expect(subjects.mayWrite(ops, NoteSubjectType.FLIGHT)).toBe(true);

    const tripOnly = makeUser(UserRole.BROKER, {
      [Module.TRIPS]: [Action.VIEW, Action.EDIT],
    });
    expect(subjects.mayRead(tripOnly, NoteSubjectType.FLIGHT)).toBe(true);
    expect(subjects.mayWrite(tripOnly, NoteSubjectType.FLIGHT)).toBe(true);
  });
});
