import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ClientType,
  LeadSource,
  LeadStage,
  OperatorStatus,
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

  // Reference data: the ten airports and four operators the frontend's mock
  // data used, so the tables have realistic rows to page, filter and sort.
  // Upserted on their natural keys, so re-running the seed neither duplicates
  // them nor overwrites edits made through the API.
  const airports = [
    { icao: 'KTEB', iata: 'TEB', name: 'Teterboro Airport', city: 'Teterboro', state: 'NJ', country: 'USA', latitude: 40.8508, longitude: -74.0613, longestRunwayFt: 7000, assignedFbo: 'Signature Flight Support', notes: 'Primary departure airport for NYC clients.' },
    { icao: 'KPBI', iata: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', country: 'USA', latitude: 26.6832, longitude: -80.0956, longestRunwayFt: 10008, assignedFbo: 'Atlantic Aviation', notes: 'Key winter hub for South Florida private aviation traffic.' },
    { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7959, longitude: -80.287, longestRunwayFt: 13016, assignedFbo: 'Signature Aviation', notes: 'Heavy commercial and cargo traffic; prefer KOPF for light jets.' },
    { icao: 'KLAS', iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', country: 'USA', latitude: 36.084, longitude: -115.1537, longestRunwayFt: 14515, assignedFbo: 'Signature Flight Support', notes: 'High traffic during major conventions and events.' },
    { icao: 'KVNY', iata: 'VNY', name: 'Van Nuys Airport', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.2098, longitude: -118.4899, longestRunwayFt: 8001, assignedFbo: 'Castle & Cooke Aviation', notes: "World's busiest dedicated general aviation airport." },
    { icao: 'KASE', iata: 'ASE', name: 'Aspen/Pitkin County', city: 'Aspen', state: 'CO', country: 'USA', latitude: 39.2232, longitude: -106.8688, longestRunwayFt: 8006, assignedFbo: 'Atlantic Aviation', notes: 'High altitude mountain airport with strict curfew.' },
    { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 33.9416, longitude: -118.4085, longestRunwayFt: 12091, assignedFbo: 'Atlantic Aviation', notes: 'Major West Coast international gateway.' },
    { icao: 'KJFK', iata: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', state: 'NY', country: 'USA', latitude: 40.6413, longitude: -73.7781, longestRunwayFt: 14511, assignedFbo: 'Sheltair Aviation', notes: 'Slot controlled during afternoon peak hours.' },
    { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow Airport', city: 'London', state: 'ENG', country: 'United Kingdom', latitude: 51.47, longitude: -0.4543, longestRunwayFt: 12799, assignedFbo: 'Signature Flight Support', notes: 'Slot controlled. 24/7 UK Border Force available.' },
    { icao: 'LFPB', iata: 'LBG', name: 'Paris Le Bourget', city: 'Paris', state: 'IDF', country: 'France', latitude: 48.9694, longitude: 2.4414, longestRunwayFt: 9843, assignedFbo: 'Jetex Paris Le Bourget', notes: 'Premier private aviation airport serving Paris.' },
  ];

  for (const airport of airports) {
    await prisma.airport.upsert({
      where: { icao: airport.icao },
      update: {},
      create: { ...airport, createdById: admin.id, updatedById: admin.id },
    });
  }

  const operators = [
    { name: 'FlexJet', status: OperatorStatus.PREFERRED, homeBase: 'Cleveland, OH', website: 'www.flexjet.com', primaryContact: 'James Miller', contactEmail: 'jmiller@flexjet.com', contactPhone: '+1 (212) 555-0184', aircraftTypes: ['Global 7500', 'Challenger 350'], serviceRoutes: ['KTEB ↔ KMIA', 'KJFK ↔ EGLL', 'KLAX ↔ KLAS'], reliabilityRating: 4.8, safetyRating: 'ARG/US Platinum', responseSpeed: '< 15 min', paymentTerms: 'Net 30', cancellationPolicy: 'Full refund up to 72 hours prior to departure. 50% fee within 48-72h. 100% fee within 24h.', sourcingNotes: 'Preferred long-range partner with direct dispatch line. High reliability on transcontinental routes.' },
    { name: 'VistaJet', status: OperatorStatus.ACTIVE, homeBase: 'Luton, UK', website: 'www.vistajet.com', primaryContact: 'Sarah Blake', contactEmail: 'sblake@vistajet.com', contactPhone: '+44 20 7946 0912', aircraftTypes: ['Global 7500', 'Global 6000'], serviceRoutes: ['EGLL ↔ KJFK', 'EGGW ↔ OMDB', 'LFMN ↔ KTEB'], reliabilityRating: 4.7, safetyRating: 'Wyvern Wingman', responseSpeed: '< 20 min', paymentTerms: 'Net 15', cancellationPolicy: 'Standard international charter terms. 10% non-refundable deposit.', sourcingNotes: 'Excellent global coverage with distinctive silver and red stripe fleet.' },
    { name: 'ExecuJet', status: OperatorStatus.ACTIVE, homeBase: 'Zurich, CH', website: 'www.execujet.com', primaryContact: 'Mark Hughes', contactEmail: 'mhughes@execujet.com', contactPhone: '+41 44 804 1616', aircraftTypes: ['Gulfstream G550', 'Falcon 7X'], serviceRoutes: ['LSZH ↔ LFMN', 'LSGG ↔ EGLL'], reliabilityRating: 4.6, safetyRating: 'IS-BAO Stage 3', responseSpeed: '< 30 min', paymentTerms: 'Due upon receipt', cancellationPolicy: 'Standard European business aviation contract.', sourcingNotes: 'Premier European charter operator with heavy jet capabilities.' },
    { name: 'NetJets', status: OperatorStatus.PREFERRED, homeBase: 'Columbus, OH', website: 'www.netjets.com', primaryContact: 'Jennifer Vance', contactEmail: 'jvance@netjets.com', contactPhone: '+1 (877) 356-5825', aircraftTypes: ['Citation Latitude', 'Challenger 650', 'Global 6000'], serviceRoutes: ['KCMH ↔ KTEB', 'KTEB ↔ KPBI', 'KLAX ↔ KSFO'], reliabilityRating: 4.9, safetyRating: 'ARG/US Platinum', responseSpeed: '< 10 min', paymentTerms: 'Net 30', cancellationPolicy: 'NetJets broker agreement terms with 48-hour cancellation grace period.', sourcingNotes: 'Largest private jet operator globally. Instant guaranteed availability.' },
    // One INACTIVE row so the status filter has something to exclude.
    { name: 'Clay Lacy Aviation', status: OperatorStatus.INACTIVE, homeBase: 'Van Nuys, CA', website: 'www.claylacy.com', primaryContact: 'Dana Ruiz', contactEmail: 'druiz@claylacy.com', contactPhone: '+1 (800) 423-2904', aircraftTypes: ['Citation X'], serviceRoutes: ['KVNY ↔ KLAS'], reliabilityRating: 4.2, safetyRating: 'IS-BAO Stage 2', responseSpeed: '< 45 min', paymentTerms: 'Net 30', cancellationPolicy: 'Standard domestic terms.', sourcingNotes: 'Dormant since the West Coast desk moved to NetJets.' },
  ];

  for (const operator of operators) {
    const existing = await prisma.operator.findFirst({
      where: { name: operator.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.operator.create({
        data: { ...operator, createdById: admin.id, updatedById: admin.id },
      });
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
  console.log(`  ${airports.length} airports, ${operators.length} operators`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
