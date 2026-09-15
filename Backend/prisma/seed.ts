import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ClientType, LeadSource, LeadStage, UserRole } from '../src/generated/prisma/enums.js';
import argon2 from 'argon2';

/**
 * Idempotent development seed. Safe to run repeatedly — every write is an
 * upsert keyed on a natural unique field.
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
    update: {},
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
    update: {},
    create: {
      email: 'broker@tribecajets.com',
      passwordHash: password,
      firstName: 'Jordan',
      lastName: 'Broker',
      role: UserRole.BROKER,
    },
  });

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
