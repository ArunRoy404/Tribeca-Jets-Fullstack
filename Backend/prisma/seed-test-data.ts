import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  AircraftCategory,
  AircraftStatus,
  ClientType,
  ClientStatus,
  CreditEntryType,
  LeadSource,
  LeadStage,
  ClientPriority,
  FollowUpMethod,
  NoteSubjectType,
  NoteVisibility,
  UserRole,
  UserStatus,
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
  console.log('Seeding consistent test data for Notes, Client Credits, and Leads & Agents...');

  // Ensure reference accounts exist (password: ChangeMe123!)
  const passwordHash = await hash('ChangeMe123!');

  // Super Admin
  let superAdmin = await prisma.user.findFirst({
    where: { email: 'roy.techreion@gmail.com' },
  });
  if (!superAdmin) {
    superAdmin = await prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });
  }

  // Broker
  let broker = await prisma.user.findFirst({
    where: { email: { in: ['broker@example.com', 'broker@tribecajets.com'] } },
  });
  if (!broker) {
    broker = await prisma.user.create({
      data: {
        email: 'broker@tribecajets.com',
        passwordHash,
        firstName: 'Jordan',
        lastName: 'Broker',
        role: UserRole.BROKER,
        status: UserStatus.ACTIVE,
        maxActiveLeads: 20,
        defaultFollowUpMethod: FollowUpMethod.CALL,
        permissions: defaultGrants(UserRole.BROKER),
      },
    });
  }

  // Admin
  let admin = await prisma.user.findFirst({
    where: { email: { in: ['admin@example.com', 'security@example.com', 'admin@tribecajets.com'] } },
  });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@tribecajets.com',
        passwordHash,
        firstName: 'Alex',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: defaultGrants(UserRole.ADMIN),
      },
    });
  }

  // Assistant
  let assistant = await prisma.user.findFirst({
    where: { email: { in: ['assistant@example.com', 'assistant@tribecajets.com'] } },
  });
  if (!assistant) {
    assistant = await prisma.user.create({
      data: {
        email: 'assistant@tribecajets.com',
        passwordHash,
        firstName: 'Avery',
        lastName: 'Assist',
        role: UserRole.ASSISTANT,
        status: UserStatus.ACTIVE,
        permissions: defaultGrants(UserRole.ASSISTANT),
      },
    });
  }

  // Referral Agent
  let agent = await prisma.user.findFirst({
    where: { email: { in: ['agent@example.com', 'agent@tribecajets.com'] } },
  });
  if (!agent) {
    agent = await prisma.user.create({
      data: {
        email: 'agent@tribecajets.com',
        passwordHash,
        firstName: 'Riley',
        lastName: 'Partner',
        role: UserRole.REFERRAL_AGENT,
        status: UserStatus.ACTIVE,
        permissions: defaultGrants(UserRole.REFERRAL_AGENT),
      },
    });
  }

  // Airports
  const kteb = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KTEB' } });
  const kopf = await prisma.airport.findFirst({ where: { icao: { in: ['KOPF', 'KPBI', 'KMIA'] } } }) ?? kteb;
  const kvny = await prisma.airport.findFirst({ where: { icao: 'KVNY' } }) ?? kteb;
  const khpn = await prisma.airport.findFirst({ where: { icao: 'KHPN' } }) ?? kteb;
  const eggw = await prisma.airport.findFirst({ where: { icao: { in: ['EGGW', 'EGLL'] } } }) ?? kteb;

  // Operator
  let operator = await prisma.operator.findFirst({ where: { status: 'ACTIVE' } });
  if (!operator) {
    operator = await prisma.operator.create({
      data: {
        name: 'NetJets Aviation',
        status: 'ACTIVE',
        createdById: superAdmin?.id,
        updatedById: superAdmin?.id,
      },
    });
  }

  // Ensure aircraft exist if empty
  const aircraftCount = await prisma.aircraft.count();
  if (aircraftCount === 0) {
    await prisma.aircraft.createMany({
      data: [
        {
          tailNumber: 'N101NJ',
          model: 'Citation Latitude',
          manufacturer: 'Cessna',
          category: AircraftCategory.MIDSIZE_JET,
          status: AircraftStatus.AVAILABLE,
          operatorId: operator.id,
          homeBaseId: kteb.id,
          maxPassengers: 8,
          rangeNm: 2700,
          yearBuilt: 2021,
          createdById: superAdmin?.id,
          updatedById: superAdmin?.id,
        },
        {
          tailNumber: 'N350FJ',
          model: 'Challenger 350',
          manufacturer: 'Bombardier',
          category: AircraftCategory.SUPER_MIDSIZE,
          status: AircraftStatus.AVAILABLE,
          operatorId: operator.id,
          homeBaseId: kopf.id,
          maxPassengers: 9,
          rangeNm: 3200,
          yearBuilt: 2020,
          createdById: superAdmin?.id,
          updatedById: superAdmin?.id,
        },
      ],
    });
    console.log('✅ Seeded baseline aircraft.');
  }

  // Clean existing test clients, notes, and credits to ensure fresh consistent data
  await prisma.clientCredit.deleteMany();
  await prisma.note.deleteMany();
  await prisma.tripRequest.deleteMany();
  await prisma.client.deleteMany();

  // 1. Seed Clients & Leads
  const client1 = await prisma.client.create({
    data: {
      type: ClientType.DIRECT,
      status: ClientStatus.VIP,
      firstName: 'Arthur',
      lastName: 'Pendelton',
      companyName: 'Apex Capital Holdings',
      email: 'arthur.pendelton@apexcapital.example.com',
      phone: '+1 (212) 555-0199',
      homeAirportId: kteb.id,
      leadSource: LeadSource.DIRECT,
      leadStage: LeadStage.WON,
      priority: ClientPriority.HIGH,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.CALL,
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      followUpNote: 'Check in regarding Thanksgiving flight to Aspen.',
      notes: 'Managing partner at Apex Capital. Prefers super-mid and heavy jets for family trips.',
      labels: ['VIP', 'Repeat Flyer', 'East Coast Hub'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      type: ClientType.DIRECT,
      status: ClientStatus.ACTIVE,
      firstName: 'Elena',
      lastName: 'Rostova',
      companyName: 'Rostova Design Atelier',
      email: 'elena.rostova@rostovadesign.example.com',
      phone: '+1 (305) 555-0144',
      homeAirportId: kopf.id,
      leadSource: LeadSource.WEBSITE,
      leadStage: LeadStage.QUOTED,
      priority: ClientPriority.HIGH,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.WHATSAPP,
      nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      followUpNote: 'Send updated quote for Palm Beach to Teterboro weekend charter.',
      notes: 'Interior designer. Responsive via WhatsApp; prefers quiet cabins.',
      labels: ['Art Basel', 'South Florida', 'Responsive'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  // Leads
  const lead1 = await prisma.client.create({
    data: {
      type: ClientType.DIRECT,
      status: ClientStatus.LEAD,
      firstName: 'Marcus',
      lastName: 'Vance',
      companyName: 'Vance Technologies',
      email: 'mvance@vancetech.example.com',
      phone: '+1 (310) 555-0177',
      homeAirportId: kvny.id,
      leadSource: LeadSource.REFERRAL,
      leadStage: LeadStage.NEW,
      priority: ClientPriority.HIGH,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.EMAIL,
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      followUpNote: 'Initial outreach with light jet options for West Coast meetings.',
      notes: 'Tech founder. Inquired through referral about chartering Phenom 300 or Citation Latitude.',
      labels: ['New Prospect', 'West Coast Tech'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  const lead2 = await prisma.client.create({
    data: {
      type: ClientType.TRAVEL_AGENT,
      status: ClientStatus.LEAD,
      companyName: 'Horizon Luxury Travel Ltd',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.j@horizontravel.example.co.uk',
      phone: '+44 20 7946 0881',
      homeAirportId: eggw.id,
      leadSource: LeadSource.TRAVEL_AGENT,
      leadStage: LeadStage.PROPOSAL,
      priority: ClientPriority.HIGH,
      assignedBrokerId: admin.id,
      originatingBrokerId: admin.id,
      followUpMethod: FollowUpMethod.EMAIL,
      nextFollowUpAt: new Date(Date.now() + 18 * 60 * 60 * 1000), // In 18 hours
      followUpNote: 'Review transatlantic holiday proposals and catering requests.',
      notes: 'High-end concierge travel agency managing bookings for European family offices.',
      labels: ['Travel Agent', 'Transatlantic', 'High Volume'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  const lead3 = await prisma.client.create({
    data: {
      type: ClientType.DIRECT,
      status: ClientStatus.LEAD,
      firstName: 'Julian',
      lastName: 'Sterling',
      companyName: 'Sterling Media Capital',
      email: 'jsterling@sterlingholding.example.com',
      phone: '+1 (702) 555-0133',
      homeAirportId: khpn.id,
      leadSource: LeadSource.DIRECT,
      leadStage: LeadStage.QUALIFIED,
      priority: ClientPriority.MEDIUM,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.SMS,
      nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      followUpNote: 'Follow up on proposed dates for annual shareholder conference in New York.',
      notes: 'Real estate and media investor. Non-stop flights preferred.',
      labels: ['Corporate', 'East Coast Hub'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  const lead4Unassigned = await prisma.client.create({
    data: {
      type: ClientType.DIRECT,
      status: ClientStatus.LEAD,
      firstName: 'David',
      lastName: 'Chen',
      companyName: 'Pacific Ventures',
      email: 'dchen@pacificventures.example.com',
      phone: '+1 (415) 555-0128',
      homeAirportId: kvny.id,
      leadSource: LeadSource.WEBSITE,
      leadStage: LeadStage.CONTACTED,
      priority: ClientPriority.MEDIUM,
      assignedBrokerId: null, // UNASSIGNED! Perfect for testing broker assignment
      originatingBrokerId: null,
      followUpMethod: FollowUpMethod.EMAIL,
      nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      followUpNote: 'Assign broker to qualify inbound website request.',
      notes: 'Inbound enquiry from website for Bay Area to Las Vegas weekend charter.',
      labels: ['Inbound Web', 'Unassigned'],
      createdById: superAdmin?.id,
      updatedById: superAdmin?.id,
    },
  });

  console.log(`✅ Seeded 6 Clients & Leads: 2 Active/VIP clients and 4 Leads (1 unassigned).`);

  // 2. Seed Client Credits (Ledger Movements)
  // Client 1 (Arthur Pendelton): Retainer Deposit + Application -> Balance: $31,500
  await prisma.clientCredit.create({
    data: {
      clientId: client1.id,
      type: CreditEntryType.CREDIT,
      amount: 50000,
      occurredAt: new Date('2026-10-01'),
      reason: 'Wire transfer retainer deposit for Q4 charters',
      reference: 'WIRE-89412',
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  await prisma.clientCredit.create({
    data: {
      clientId: client1.id,
      type: CreditEntryType.APPLICATION,
      amount: 18500,
      occurredAt: new Date('2026-10-06'),
      reason: 'Applied towards KTEB → KASE charter leg',
      reference: 'INV-10492',
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  // Client 2 (Elena Rostova): Retainer Deposit -> Balance: $25,000
  await prisma.clientCredit.create({
    data: {
      clientId: client2.id,
      type: CreditEntryType.CREDIT,
      amount: 25000,
      occurredAt: new Date('2026-10-08'),
      reason: 'Credit card pre-authorization retainer deposit',
      reference: 'CC-AUT-4402',
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  console.log(`✅ Seeded Client Credits for Arthur Pendelton ($31,500 net) and Elena Rostova ($25,000 net).`);

  // 3. Seed Notes / Timeline
  // Client 1 Notes
  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: client1.id,
      body: 'Arthur confirmed priority for heavy jet or ultra-long range airframes. Prefers Gulfstream G550 or Global 7500 for transcon flights.',
      visibility: NoteVisibility.INTERNAL,
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: client1.id,
      body: 'Spoke with executive assistant regarding passenger manifests and dietary preferences for Aspen trip.',
      visibility: NoteVisibility.INTERNAL,
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: client1.id,
      body: 'Client confirmed preferred FBO at Teterboro is Meridian. Ground transport required at destination.',
      visibility: NoteVisibility.SHARED,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  // Client 2 Notes
  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: client2.id,
      body: 'Elena prefers WhatsApp for urgent updates and quotes. Cabin must be quiet; espresso machine on board requested.',
      visibility: NoteVisibility.INTERNAL,
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  // Lead 1 (Marcus Vance) Notes
  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: lead1.id,
      body: 'Inbound referral from partner network. Looking for recurring West Coast shuttle between Van Nuys and San Jose.',
      visibility: NoteVisibility.INTERNAL,
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  // Lead 2 (Sarah Jenkins) Notes
  await prisma.note.create({
    data: {
      subjectType: NoteSubjectType.CLIENT,
      subjectId: lead2.id,
      body: 'London concierge travel desk. Client family travelling to Miami for Art Basel. Needs 10+ seats and large baggage capacity.',
      visibility: NoteVisibility.INTERNAL,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  console.log(`✅ Seeded 6 Timeline Notes across clients and leads.`);
  console.log(`\n🎉 Data seeding completed successfully!`);
}

main()
  .catch((err) => {
    console.error('Failed to seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
