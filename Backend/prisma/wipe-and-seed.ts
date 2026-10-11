import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  UserRole,
  UserStatus,
  OperatorStatus,
  ResponseSpeed,
  PaymentTerms,
  LeadStage,
  CommissionBasis,
  FollowUpMethod,
} from '../src/generated/prisma/enums.js';
import argon2 from 'argon2';
import { defaultGrants } from '../src/common/authorization/access.js';

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
  console.log('1. Wiping database tables...');

  // Truncate all application tables with CASCADE
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "audit_logs",
      "verification_codes",
      "refresh_tokens",
      "email_messages",
      "invoice_payments",
      "invoices",
      "operator_payable_payments",
      "operator_payables",
      "operator_quotes",
      "quote_versions",
      "quotes",
      "trip_passengers",
      "trip_legs",
      "trips",
      "itineraries",
      "tasks",
      "notes",
      "documents",
      "empty_legs",
      "commissions",
      "referrals",
      "referral_resources",
      "client_credits",
      "trip_requests",
      "clients",
      "aircraft",
      "charter_rates",
      "operators",
      "airports",
      "uploads",
      "email_templates",
      "users",
      "company_settings"
    CASCADE;
  `);

  console.log('   Tables wiped successfully.');

  console.log('2. Seeding company settings...');
  await prisma.companySettings.create({
    data: {
      id: 1,
      companyName: 'Tribeca Jets',
      companyEmail: 'operations@tribecajets.com',
      website: 'https://tribecajets.com',
      phone: '+1 (212) 555-0100',
      address: 'One World Trade Center, Suite 8500, New York, NY 10007',
      clientServicesLabel: 'Private Client Desk',
      showContactBlock: true,
      logoOnDocuments: true,
      showBrokerContact: true,
      defaultMarkupPercent: 15.0,
      quoteValidityHours: 24,
      defaultFetPercent: 7.5,
      applyFetByDefault: true,
      followUpIntervalDays: 3,
      defaultLeadStage: LeadStage.NEW,
      defaultQuoteTerms:
        'Standard charter terms apply. Catering and de-icing billed at cost. 100% cancellation within 48h of departure.',
      idleTimeoutMinutes: 10,
      idleWarningMinutes: 1,
      showIdleWarning: true,
      requireAdminTwoFactor: false,
      emailNotifications: true,
      inAppNotifications: true,
      flightAlertsToBrokers: true,
      followUpReminders: true,
      paymentReminders: true,
      quoteExpiryReminders: true,
      quoteExpiryWarningHours: 4,
      paymentReminderDays: 1,
      followUpReminderMinutes: 0,
    },
  });

  console.log('3. Seeding users (one user per role)...');
  const password = await hash('ChangeMe123!');

  // 1) Super Admin: roy.techreion@gmail.com / ChangeMe123!
  const superAdmin = await prisma.user.create({
    data: {
      email: 'roy.techreion@gmail.com',
      passwordHash: password,
      firstName: 'Roy',
      lastName: 'Techreion',
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      permissions: defaultGrants(UserRole.SUPER_ADMIN),
    },
  });

  // 2) Admin: admin@tribecajets.com / ChangeMe123!
  await prisma.user.create({
    data: {
      email: 'admin@tribecajets.com',
      passwordHash: password,
      firstName: 'Alex',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: defaultGrants(UserRole.ADMIN),
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  // 3) Broker: broker@tribecajets.com / ChangeMe123!
  await prisma.user.create({
    data: {
      email: 'broker@tribecajets.com',
      passwordHash: password,
      firstName: 'Jordan',
      lastName: 'Broker',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
      maxActiveLeads: 20,
      defaultFollowUpMethod: FollowUpMethod.CALL,
      permissions: defaultGrants(UserRole.BROKER),
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  // 4) Assistant: assistant@tribecajets.com / ChangeMe123!
  await prisma.user.create({
    data: {
      email: 'assistant@tribecajets.com',
      passwordHash: password,
      firstName: 'Avery',
      lastName: 'Assistant',
      role: UserRole.ASSISTANT,
      status: UserStatus.ACTIVE,
      permissions: defaultGrants(UserRole.ASSISTANT),
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  // 5) Referral Agent: agent@tribecajets.com / ChangeMe123!
  await prisma.user.create({
    data: {
      email: 'agent@tribecajets.com',
      passwordHash: password,
      firstName: 'Sam',
      lastName: 'Partner',
      role: UserRole.REFERRAL_AGENT,
      status: UserStatus.ACTIVE,
      commissionBasis: CommissionBasis.PERCENT_OF_PROFIT,
      commissionPercentage: 10.0,
      permissions: defaultGrants(UserRole.REFERRAL_AGENT),
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  console.log('4. Seeding airports (curated set)...');
  const airports = [
    {
      icao: 'KTEB',
      iata: 'TEB',
      name: 'Teterboro Airport',
      city: 'Teterboro',
      state: 'NJ',
      country: 'USA',
      latitude: 40.8508,
      longitude: -74.0613,
      longestRunwayFt: 7000,
      assignedFbo: 'Signature Flight Support',
      notes: 'Primary departure airport for NYC clients.',
    },
    {
      icao: 'KPBI',
      iata: 'PBI',
      name: 'Palm Beach International',
      city: 'West Palm Beach',
      state: 'FL',
      country: 'USA',
      latitude: 26.6832,
      longitude: -80.0956,
      longestRunwayFt: 10008,
      assignedFbo: 'Atlantic Aviation',
      notes: 'Key winter hub for South Florida private aviation traffic.',
    },
    {
      icao: 'KMIA',
      iata: 'MIA',
      name: 'Miami International',
      city: 'Miami',
      state: 'FL',
      country: 'USA',
      latitude: 25.7959,
      longitude: -80.287,
      longestRunwayFt: 13016,
      assignedFbo: 'Signature Aviation',
      notes: 'Heavy commercial and cargo traffic hub.',
    },
    {
      icao: 'KVNY',
      iata: 'VNY',
      name: 'Van Nuys Airport',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      latitude: 34.2098,
      longitude: -118.4899,
      longestRunwayFt: 8001,
      assignedFbo: 'Castle & Cooke Aviation',
      notes: "World's busiest dedicated general aviation airport.",
    },
    {
      icao: 'KLAS',
      iata: 'LAS',
      name: 'Harry Reid International',
      city: 'Las Vegas',
      state: 'NV',
      country: 'USA',
      latitude: 36.084,
      longitude: -115.1537,
      longestRunwayFt: 14515,
      assignedFbo: 'Signature Flight Support',
      notes: 'High traffic during major conventions and events.',
    },
    {
      icao: 'EGLL',
      iata: 'LHR',
      name: 'London Heathrow Airport',
      city: 'London',
      state: 'ENG',
      country: 'United Kingdom',
      latitude: 51.47,
      longitude: -0.4543,
      longestRunwayFt: 12799,
      assignedFbo: 'Signature Flight Support',
      notes: 'Slot controlled. 24/7 UK Border Force available.',
    },
  ];

  for (const airport of airports) {
    await prisma.airport.create({
      data: { ...airport, createdById: superAdmin.id, updatedById: superAdmin.id },
    });
  }

  console.log('5. Seeding operators (curated set)...');
  const operators = [
    {
      name: 'NetJets',
      status: OperatorStatus.PREFERRED,
      homeBase: 'Columbus, OH',
      website: 'www.netjets.com',
      primaryContact: 'Jennifer Vance',
      contactEmail: 'jvance@netjets.example.com',
      contactPhone: '+1 (877) 356-5825',
      aircraftTypes: ['Citation Latitude', 'Challenger 650', 'Global 6000'],
      serviceRoutes: ['KCMH ↔ KTEB', 'KTEB ↔ KPBI', 'KLAX ↔ KSFO'],
      reliabilityRating: 4.9,
      safetyRating: 4.9,
      responseSpeed: ResponseSpeed.FAST,
      paymentTerms: PaymentTerms.NET_30,
      cancellationPolicy:
        'NetJets broker agreement terms with 48-hour cancellation grace period.',
      sourcingNotes:
        'Largest private jet operator globally. Instant guaranteed availability.',
    },
    {
      name: 'FlexJet',
      status: OperatorStatus.PREFERRED,
      homeBase: 'Cleveland, OH',
      website: 'www.flexjet.com',
      primaryContact: 'James Miller',
      contactEmail: 'jmiller@flexjet.example.com',
      contactPhone: '+1 (212) 555-0184',
      aircraftTypes: ['Global 7500', 'Challenger 350'],
      serviceRoutes: ['KTEB ↔ KMIA', 'KJFK ↔ EGLL', 'KLAX ↔ KLAS'],
      reliabilityRating: 4.8,
      safetyRating: 4.9,
      responseSpeed: ResponseSpeed.FAST,
      paymentTerms: PaymentTerms.NET_30,
      cancellationPolicy:
        'Full refund up to 72 hours prior to departure. 50% fee within 48-72h. 100% fee within 24h.',
      sourcingNotes:
        'Preferred long-range partner with direct dispatch line. High reliability on transcontinental routes.',
    },
    {
      name: 'VistaJet',
      status: OperatorStatus.ACTIVE,
      homeBase: 'Luton, UK',
      website: 'www.vistajet.com',
      primaryContact: 'Sarah Blake',
      contactEmail: 'sblake@vistajet.example.com',
      contactPhone: '+44 20 7946 0912',
      aircraftTypes: ['Global 7500', 'Global 6000'],
      serviceRoutes: ['EGLL ↔ KJFK', 'EGGW ↔ OMDB', 'LFMN ↔ KTEB'],
      reliabilityRating: 4.7,
      safetyRating: 4.8,
      responseSpeed: ResponseSpeed.FAST,
      paymentTerms: PaymentTerms.NET_15,
      cancellationPolicy:
        'Standard international charter terms. 10% non-refundable deposit.',
      sourcingNotes:
        'Excellent global coverage with distinctive silver and red stripe fleet.',
    },
    {
      name: 'ExecuJet',
      status: OperatorStatus.ACTIVE,
      homeBase: 'Zurich, CH',
      website: 'www.execujet.com',
      primaryContact: 'Mark Hughes',
      contactEmail: 'mhughes@execujet.example.com',
      contactPhone: '+41 44 804 1616',
      aircraftTypes: ['Gulfstream G550', 'Falcon 7X'],
      serviceRoutes: ['LSZH ↔ LFMN', 'LSGG ↔ EGLL'],
      reliabilityRating: 4.6,
      safetyRating: 4.7,
      responseSpeed: ResponseSpeed.FAST,
      paymentTerms: PaymentTerms.DUE_ON_RECEIPT,
      cancellationPolicy: 'Standard European business aviation contract.',
      sourcingNotes:
        'Premier European charter operator with heavy jet capabilities.',
    },
  ];

  for (const operator of operators) {
    await prisma.operator.create({
      data: { ...operator, createdById: superAdmin.id, updatedById: superAdmin.id },
    });
  }

  console.log('✅ Database wipe and fresh seed complete!');
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
