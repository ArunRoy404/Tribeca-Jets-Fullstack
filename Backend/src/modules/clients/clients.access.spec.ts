import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_KEY,
  PERMISSIONS_KEY,
  STAFF_ONLY_KEY,
} from '../../common/constants/auth.constants.js';
import {
  Action,
  Module,
  Reach,
} from '../../common/authorization/access.js';
import { AccessGuard } from '../../common/guards/access.guard.js';
import { LeadStage, UserRole } from '../../generated/prisma/enums.js';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { createClientSchema, updateClientSchema } from './dto/client.dto.js';

const handler = (name: keyof ClientsController) =>
  ClientsController.prototype[name] as unknown as object;

/** A request context for the guard, as `name` on the clients controller, called by `role`. */
const contextFor = (name: keyof ClientsController, role: UserRole) =>
  ({
    getHandler: () => handler(name),
    getClass: () => ClientsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'u', email: 'x@example.com', role, access: {} },
      }),
    }),
  }) as never;

describe('clients routes (Clients review, 9 Oct 2026)', () => {
  it('reads need only a session, nothing from the old matrix', () => {
    for (const name of [
      'findAll',
      'stats',
      'brokerPerformance',
      'findOne',
    ] as const) {
      expect(Reflect.getMetadata(ACCESS_KEY, handler(name)), name).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, handler(name)),
        name,
      ).toBeUndefined();
    }
  });

  it('each write needs its Clients permission', () => {
    const expected = {
      create: Action.CREATE,
      update: Action.EDIT,
      remove: Action.ARCHIVE,
      removeMany: Action.ARCHIVE,
      restore: Action.ARCHIVE,
      restoreMany: Action.ARCHIVE,
    } as const;
    for (const [name, action] of Object.entries(expected)) {
      expect(
        Reflect.getMetadata(ACCESS_KEY, handler(name as keyof ClientsController)),
        name,
      ).toEqual({
        module: Module.CLIENTS,
        action,
      });
    }
  });

  it('is staff only: a referral agent is refused even an open read', () => {
    expect(Reflect.getMetadata(STAFF_ONLY_KEY, ClientsController)).toBe(true);
    const guard = new AccessGuard(new Reflector());
    expect(() =>
      guard.canActivate(contextFor('findAll', UserRole.REFERRAL_AGENT)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(contextFor('findAll', UserRole.ASSISTANT))).toBe(true);
  });
});

describe('clients service scoping & rules (Clients review, 9 Oct 2026)', () => {
  const createMockService = ({
    clientFind = async () => null,
    clientCreate = async (args: any) => ({ id: 'c1', ...args.data }),
    clientUpdate = async (args: any) => ({ id: 'c1', ...args.data }),
    userFind = async () => ({ id: 'b1', status: 'ACTIVE' }),
    airportUsable = async () => ({ id: 'ap1', icao: 'KTEB' }),
    defaultLeadStage = LeadStage.CONTACTED,
  }: {
    clientFind?: (args: any) => Promise<any>;
    clientCreate?: (args: any) => Promise<any>;
    clientUpdate?: (args: any) => Promise<any>;
    userFind?: (args: any) => Promise<any>;
    airportUsable?: (id: string, label: string) => Promise<any>;
    defaultLeadStage?: LeadStage;
  } = {}) => {
    const prisma = {
      client: {
        findFirst: clientFind,
        create: clientCreate,
        update: clientUpdate,
      },
      user: {
        findFirst: userFind,
      },
    };
    const audit = { record: async () => undefined };
    const trips = { activeCountByBroker: async () => new Map() };
    const airports = { usable: airportUsable };
    const settings = {
      read: async () => ({
        defaultLeadStage,
        followUpIntervalDays: 3,
      }),
    };

    return new ClientsService(
      prisma as never,
      audit as never,
      trips as never,
      airports as never,
      settings as never,
    );
  };

  it('applies defaultLeadStage from settings when omitted on create', async () => {
    let capturedData: any = null;
    const service = createMockService({
      clientCreate: async (args) => {
        capturedData = args.data;
        return { id: 'c1', ...args.data };
      },
      defaultLeadStage: LeadStage.QUALIFIED,
    });

    const user = {
      id: 'admin1',
      role: UserRole.ADMIN,
      access: { [Module.CLIENTS]: { reach: Reach.ALL, actions: [Action.CREATE] } },
    } as any;

    await service.create(user, {
      firstName: 'Alice',
      lastName: 'Smith',
    } as any);

    expect(capturedData.leadStage).toBe(LeadStage.QUALIFIED);
  });

  it('verifies home airport with airports.usable when set on create', async () => {
    let checkedId = '';
    const service = createMockService({
      airportUsable: async (id) => {
        checkedId = id;
        throw new BadRequestException('That home airport does not exist');
      },
    });

    const user = {
      id: 'admin1',
      role: UserRole.ADMIN,
      access: { [Module.CLIENTS]: { reach: Reach.ALL, actions: [Action.CREATE] } },
    } as any;

    await expect(
      service.create(user, {
        firstName: 'Alice',
        lastName: 'Smith',
        homeAirportId: 'bad-airport-id',
      } as any),
    ).rejects.toThrow(/That home airport does not exist/);
    expect(checkedId).toBe('bad-airport-id');
  });

  it('refuses broker reassigning a client without ASSIGN action', async () => {
    const service = createMockService({
      clientFind: async () => ({
        id: 'c1',
        assignedBrokerId: 'broker1',
        homeAirportId: null,
      }),
    });

    const brokerUser = {
      id: 'broker1',
      role: UserRole.BROKER,
      access: {
        [Module.CLIENTS]: {
          reach: Reach.ASSIGNED,
          actions: [Action.VIEW, Action.CREATE, Action.EDIT],
        },
      },
    } as any;

    await expect(
      service.update(brokerUser, 'c1', {
        assignedBrokerId: 'broker2',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows administrator with ASSIGN action to reassign a client', async () => {
    let updatedData: any = null;
    const service = createMockService({
      clientFind: async () => ({
        id: 'c1',
        assignedBrokerId: 'broker1',
        homeAirportId: null,
      }),
      clientUpdate: async (args) => {
        updatedData = args.data;
        return { id: 'c1', ...args.data };
      },
    });

    const adminUser = {
      id: 'admin1',
      role: UserRole.ADMIN,
      access: {
        [Module.CLIENTS]: {
          reach: Reach.ALL,
          actions: [Action.VIEW, Action.CREATE, Action.EDIT, Action.ASSIGN],
        },
      },
    } as any;

    await service.update(adminUser, 'c1', {
      assignedBrokerId: 'broker2',
    } as any);

    expect(updatedData.assignedBrokerId).toBe('broker2');
  });

  it('refuses reassigning to a non-existent broker', async () => {
    const service = createMockService({
      clientFind: async () => ({
        id: 'c1',
        assignedBrokerId: 'broker1',
        homeAirportId: null,
      }),
      userFind: async () => null,
    });

    const adminUser = {
      id: 'admin1',
      role: UserRole.ADMIN,
      access: {
        [Module.CLIENTS]: {
          reach: Reach.ALL,
          actions: [Action.VIEW, Action.CREATE, Action.EDIT, Action.ASSIGN],
        },
      },
    } as any;

    await expect(
      service.update(adminUser, 'c1', {
        assignedBrokerId: 'non-existent-broker',
      } as any),
    ).rejects.toThrow(/That broker does not exist/);
  });
});

describe('clients DTO validation', () => {
  it('requires companyName for TRAVEL_AGENT on create', () => {
    expect(() =>
      createClientSchema.parse({
        firstName: 'Bob',
        lastName: 'Agent',
        type: 'TRAVEL_AGENT',
      }),
    ).toThrow(/Company name is required for travel agents/);

    expect(
      createClientSchema.parse({
        firstName: 'Bob',
        lastName: 'Agent',
        type: 'TRAVEL_AGENT',
        companyName: 'Luxury Travel Ltd',
      }).companyName,
    ).toBe('Luxury Travel Ltd');
  });

  it('allows partial updates without resetting defaults', () => {
    const parsed = updateClientSchema.parse({
      phone: '+1 555 0199',
    });
    expect(parsed.phone).toBe('+1 555 0199');
    expect(parsed.type).toBeUndefined();
    expect(parsed.status).toBeUndefined();
    expect(parsed.leadStage).toBeUndefined();
  });
});
