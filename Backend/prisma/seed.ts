import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ClientType,
  LeadSource,
  LeadStage,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import argon2 from 'argon2';

/**
 * Idempotent development seed. Safe to run repeatedly — every write is an
 * upsert keyed on a natural unique field.
 *
 * "Idempotent" here means *restores a known state*, not *leaves whatever is
 * there*. Every seeded account has its password reset on each run, because a
 * test that rotates a password would otherwise strand that account with a
 * credential nobody knows and no way to recover it short of editing the
 * database by hand. This has already happened twice.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

const hash = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
  });

async function main(): Promise<void> {
  const password = await hash('ChangeMe123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@tribecajets.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'admin@tribecajets.com',
      passwordHash: password,
      firstName: 'Ari',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    },
  });

  const broker = await prisma.user.upsert({
    where: { email: 'broker@tribecajets.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'broker@tribecajets.com',
      passwordHash: password,
      firstName: 'Jordan',
      lastName: 'Broker',
      role: UserRole.BROKER,
    },
  });

  // Dedicated target for password-reset testing, so exercising that flow (from
  // the Postman collection or by hand) never disturbs the accounts the sign-in
  // and scoping tests depend on. Its password is force-reset on every seed run.
  await prisma.user.upsert({
    where: { email: 'reset-demo@tribecajets.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'reset-demo@tribecajets.com',
      passwordHash: password,
      firstName: 'Riley',
      lastName: 'Reset',
      role: UserRole.BROKER,
    },
  });

  // Two-factor is off for the accounts above so the common path stays quick to
  // test; this one exercises the challenge flow.
  await prisma.user.upsert({
    where: { email: 'security@tribecajets.com' },
    update: {
      passwordHash: password,
      twoFactorEnabled: true,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      email: 'security@tribecajets.com',
      passwordHash: password,
      firstName: 'Sam',
      lastName: 'Secure',
      role: UserRole.ADMIN,
      twoFactorEnabled: true,
    },
  });

  /**
   * One account per remaining role, so the Users directory has something to
   * page, filter and sort against, and so the permission matrix can be
   * exercised end to end rather than only reasoned about.
   */
  const directory = [
    {
      email: 'senior@tribecajets.com',
      firstName: 'Sasha',
      lastName: 'Senior',
      role: UserRole.SENIOR_BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'assistant@tribecajets.com',
      firstName: 'Avery',
      lastName: 'Assist',
      role: UserRole.ASSISTANT,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'barry@tribecajets.com',
      firstName: 'Barry',
      lastName: 'Wilson',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'mark@tribecajets.com',
      firstName: 'Mark',
      lastName: 'Evans',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'tom@tribecajets.com',
      firstName: 'Tom',
      lastName: 'Walsh',
      role: UserRole.BROKER,
      // A suspended account, so the status filter has a non-empty result and
      // sign-in refusal for revoked staff is testable.
      status: UserStatus.SUSPENDED,
    },
    {
      email: 'newhire@tribecajets.com',
      firstName: 'Nina',
      lastName: 'Newhire',
      role: UserRole.BROKER,
      // Never signed in: exercises the INVITED branch of the directory.
      status: UserStatus.INVITED,
    },
  ];

  for (const member of directory) {
    await prisma.user.upsert({
      where: { email: member.email },
      update: {
        passwordHash: password,
        role: member.role,
        status: member.status,
        deletedAt: null,
      },
      create: {
        ...member,
        passwordHash: password,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  // Two clients on different brokers, so row-level scoping is observable:
  // signing in as the broker must return exactly one of these.
  const clients = [
    {
      firstName: 'Marcus',
      lastName: 'Chen',
      email: 'marcus.chen@example.com',
      type: ClientType.DIRECT,
      leadStage: LeadStage.BOOKED,
      leadSource: LeadSource.REFERRAL,
      homeAirport: 'KTEB',
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      preferences: { pets: true, noRedEye: true, preferredFbo: 'Signature' },
      labels: ['VIP'],
    },
    {
      firstName: 'Dana',
      lastName: 'Whitfield',
      companyName: 'Whitfield Travel Group',
      email: 'dana@whitfieldtravel.com',
      type: ClientType.TRAVEL_AGENT,
      leadStage: LeadStage.QUOTED,
      leadSource: LeadSource.FACEBOOK_GROUP_1,
      homeAirport: 'KOPF',
      assignedBrokerId: admin.id,
      originatingBrokerId: admin.id,
      preferences: { catering: 'Kosher on request' },
      labels: ['Agency'],
    },
  ];

  for (const client of clients) {
    const existing = await prisma.client.findFirst({
      where: { email: client.email },
      select: { id: true },
    });
    if (!existing) {
      await prisma.client.create({ data: client });
    }
  }

  console.log('Seed complete.');
  console.log('  admin@tribecajets.com  / ChangeMe123!  (SUPER_ADMIN)');
  console.log('  broker@tribecajets.com / ChangeMe123!  (BROKER)');
  console.log('  security@tribecajets.com / ChangeMe123!  (ADMIN, 2FA on)');
  console.log('  reset-demo@tribecajets.com / ChangeMe123!  (BROKER, password-reset target)');
  console.log('  senior@tribecajets.com / ChangeMe123!  (SENIOR_BROKER)');
  console.log('  assistant@tribecajets.com / ChangeMe123!  (ASSISTANT)');
  console.log('  + barry / mark (BROKER, active), tom (SUSPENDED), newhire (INVITED)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
