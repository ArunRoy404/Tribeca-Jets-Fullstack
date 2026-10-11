import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ClientType,
  CommissionBasis,
  LeadSource,
  LeadStage,
  OperatorStatus,
  PaymentTerms,
  ResponseSpeed,
  AircraftCategory,
  AircraftStatus,
  FollowUpMethod,
  TripRequestStatus,
  UserRole,
  UserStatus,
  OperatorQuoteStatus,
  QuoteStatus,
  TripStatus,
  TripType,
  EmailTemplateCategory,
} from '../src/generated/prisma/enums.js';
import argon2 from 'argon2';
import {
  Action,
  Module,
  defaultGrants,
  type AccessGrants,
} from '../src/common/authorization/access.js';

/**
 * Tribeca Jets Command Center — Development Seed & Reset
 *
 * Preserves the 5 core user accounts (and directory members).
 * Wipes business data in reverse dependency order.
 * Seeds linked, consistent, production-grade test data (< 10 per module).
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
  console.log('--- Cleaning database (preserving users) ---');

  // 1. Wipe business tables in reverse foreign key order
  await prisma.document.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.emailMessage.deleteMany({});
  await prisma.itinerary.deleteMany({});
  await prisma.clientCredit.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.commission.deleteMany({});
  await prisma.invoicePayment.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.operatorPayablePayment.deleteMany({});
  await prisma.operatorPayable.deleteMany({});
  await prisma.tripPassenger.deleteMany({});
  await prisma.tripLeg.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.quoteVersion.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.operatorQuote.deleteMany({});
  await prisma.tripRequest.deleteMany({});
  await prisma.aircraft.deleteMany({});
  await prisma.operator.deleteMany({});
  await prisma.charterRate.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.airport.deleteMany({});
  await prisma.emailTemplate.deleteMany({});

  console.log('--- Upserting standard users ---');
  const password = await hash('ChangeMe123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'admin@example.com',
      passwordHash: password,
      firstName: 'Ari',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
    },
  });

  const broker = await prisma.user.upsert({
    where: { email: 'broker@example.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'broker@example.com',
      passwordHash: password,
      firstName: 'Jordan',
      lastName: 'Broker',
      role: UserRole.BROKER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reset-demo@example.com' },
    update: { passwordHash: password, status: UserStatus.ACTIVE, deletedAt: null },
    create: {
      email: 'reset-demo@example.com',
      passwordHash: password,
      firstName: 'Riley',
      lastName: 'Reset',
      role: UserRole.BROKER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'security@example.com' },
    update: {
      passwordHash: password,
      twoFactorEnabled: true,
      status: UserStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      email: 'security@example.com',
      passwordHash: password,
      firstName: 'Sam',
      lastName: 'Secure',
      role: UserRole.ADMIN,
      twoFactorEnabled: true,
    },
  });

  const directory = [
    {
      email: 'senior@example.com',
      firstName: 'Sasha',
      lastName: 'Senior',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'assistant@example.com',
      firstName: 'Avery',
      lastName: 'Assist',
      role: UserRole.ASSISTANT,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'barry@example.com',
      firstName: 'Barry',
      lastName: 'Wilson',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'mark@example.com',
      firstName: 'Mark',
      lastName: 'Evans',
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'tom@example.com',
      firstName: 'Tom',
      lastName: 'Walsh',
      role: UserRole.BROKER,
      status: UserStatus.SUSPENDED,
    },
    {
      email: 'newhire@example.com',
      firstName: 'Nina',
      lastName: 'Newhire',
      role: UserRole.BROKER,
      status: UserStatus.INVITED,
    },
    {
      email: 'agent@example.com',
      firstName: 'Riley',
      lastName: 'Partner',
      role: UserRole.REFERRAL_AGENT,
      status: UserStatus.ACTIVE,
      commissionBasis: CommissionBasis.PERCENT_OF_PROFIT,
      commissionPercentage: '10.00',
    },
  ];

  const brokerDefaults = defaultGrants(UserRole.BROKER);
  const adjusted: Record<string, AccessGrants> = {
    'barry@example.com': {
      ...brokerDefaults,
      [Module.TRIPS]: [...(brokerDefaults.TRIPS ?? []), Action.ARCHIVE],
      [Module.REPORTS]: [Action.VIEW, Action.EXPORT],
    },
    'mark@example.com': Object.fromEntries(
      Object.entries({
        ...brokerDefaults,
        [Module.QUOTES]: (brokerDefaults.QUOTES ?? []).filter((a) => a !== Action.VIEW_MONEY),
      }).filter(([module]) => module !== Module.RECEIVABLES && module !== Module.REPORTS),
    ),
  };

  for (const member of directory) {
    const permissions = adjusted[member.email] ?? defaultGrants(member.role);
    await prisma.user.upsert({
      where: { email: member.email },
      update: {
        passwordHash: password,
        role: member.role,
        status: member.status,
        permissions,
        deletedAt: null,
      },
      create: {
        ...member,
        permissions,
        passwordHash: password,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  await prisma.user.update({
    where: { id: broker.id },
    data: { maxActiveLeads: 15, defaultFollowUpMethod: FollowUpMethod.CALL },
  });

  console.log('--- Upserting company settings ---');
  await prisma.companySettings.upsert({
    where: { id: 1 },
    update: {
      companyName: 'Tribeca Jets',
      defaultFetPercent: 7.5,
      applyFetByDefault: true,
      defaultMarkupPercent: 15,
      quoteValidityHours: 24,
      requireAdminTwoFactor: false,
    },
    create: {
      id: 1,
      companyName: 'Tribeca Jets',
      defaultFetPercent: 7.5,
      applyFetByDefault: true,
      defaultMarkupPercent: 15,
      quoteValidityHours: 24,
      requireAdminTwoFactor: false,
    },
  });

  console.log('--- Seeding reference airports (6 rows) ---');
  const airports = [
    { icao: 'KTEB', iata: 'TEB', name: 'Teterboro Airport', city: 'Teterboro', state: 'NJ', country: 'USA', latitude: 40.8508, longitude: -74.0613, longestRunwayFt: 7000, assignedFbo: 'Signature Flight Support', notes: 'Primary departure airport for NYC clients.' },
    { icao: 'KPBI', iata: 'PBI', name: 'Palm Beach International', city: 'West Palm Beach', state: 'FL', country: 'USA', latitude: 26.6832, longitude: -80.0956, longestRunwayFt: 10008, assignedFbo: 'Atlantic Aviation', notes: 'Key winter hub for South Florida private aviation traffic.' },
    { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', state: 'FL', country: 'USA', latitude: 25.7959, longitude: -80.287, longestRunwayFt: 13016, assignedFbo: 'Signature Aviation', notes: 'Heavy commercial and cargo traffic; prefer KOPF for light jets.' },
    { icao: 'KLAS', iata: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', state: 'NV', country: 'USA', latitude: 36.084, longitude: -115.1537, longestRunwayFt: 14515, assignedFbo: 'Signature Flight Support', notes: 'High traffic during major conventions and events.' },
    { icao: 'KVNY', iata: 'VNY', name: 'Van Nuys Airport', city: 'Los Angeles', state: 'CA', country: 'USA', latitude: 34.2098, longitude: -118.4899, longestRunwayFt: 8001, assignedFbo: 'Castle & Cooke Aviation', notes: "World's busiest dedicated general aviation airport." },
    { icao: 'KASE', iata: 'ASE', name: 'Aspen/Pitkin County', city: 'Aspen', state: 'CO', country: 'USA', latitude: 39.2232, longitude: -106.8688, longestRunwayFt: 8006, assignedFbo: 'Atlantic Aviation', notes: 'High altitude mountain airport with strict curfew.' },
  ];

  for (const airport of airports) {
    await prisma.airport.create({
      data: { ...airport, createdById: admin.id, updatedById: admin.id },
    });
  }

  console.log('--- Seeding charter rates (4 rows) ---');
  const rates = [
    { category: AircraftCategory.LIGHT_JET, hourlyRate: 3200, averageSpeedKnots: 420, typicalSeats: 6, minimumHours: 2.0, notes: 'Ideal for light domestic hops under 2 hours.' },
    { category: AircraftCategory.MIDSIZE_JET, hourlyRate: 4500, averageSpeedKnots: 450, typicalSeats: 8, minimumHours: 2.0, notes: 'Coast to midwest range.' },
    { category: AircraftCategory.SUPER_MIDSIZE, hourlyRate: 5800, averageSpeedKnots: 470, typicalSeats: 9, minimumHours: 2.0, notes: 'Coast-to-coast nonstop capability.' },
    { category: AircraftCategory.HEAVY_JET, hourlyRate: 7900, averageSpeedKnots: 490, typicalSeats: 14, minimumHours: 2.5, notes: 'Transcontinental & transoceanic luxury cabins.' },
  ];

  for (const rate of rates) {
    await prisma.charterRate.create({
      data: { ...rate, createdById: admin.id, updatedById: admin.id },
    });
  }

  console.log('--- Seeding operators (4 rows) ---');
  const operators = [
    { name: 'FlexJet', status: OperatorStatus.PREFERRED, homeBase: 'Cleveland, OH', website: 'www.flexjet.com', primaryContact: 'James Miller', contactEmail: 'jmiller@flexjet.example.com', contactPhone: '+1 (212) 555-0184', aircraftTypes: ['Global 7500', 'Challenger 350'], serviceRoutes: ['KTEB ↔ KMIA', 'KJFK ↔ EGLL', 'KLAX ↔ KLAS'], reliabilityRating: 4.8, safetyRating: 4.9, responseSpeed: ResponseSpeed.FAST, paymentTerms: PaymentTerms.NET_30, cancellationPolicy: 'Full refund up to 72 hours prior to departure. 50% fee within 48-72h. 100% fee within 24h.', sourcingNotes: 'Preferred long-range partner with direct dispatch line.' },
    { name: 'VistaJet', status: OperatorStatus.ACTIVE, homeBase: 'Luton, UK', website: 'www.vistajet.com', primaryContact: 'Sarah Blake', contactEmail: 'sblake@vistajet.example.com', contactPhone: '+44 20 7946 0912', aircraftTypes: ['Global 7500', 'Global 6000'], serviceRoutes: ['EGLL ↔ KJFK', 'LFMN ↔ KTEB'], reliabilityRating: 4.7, safetyRating: 4.8, responseSpeed: ResponseSpeed.FAST, paymentTerms: PaymentTerms.NET_15, cancellationPolicy: 'Standard international charter terms. 10% non-refundable deposit.', sourcingNotes: 'Excellent global coverage with distinctive silver and red stripe fleet.' },
    { name: 'ExecuJet', status: OperatorStatus.ACTIVE, homeBase: 'Zurich, CH', website: 'www.execujet.com', primaryContact: 'Mark Hughes', contactEmail: 'mhughes@execujet.example.com', contactPhone: '+41 44 804 1616', aircraftTypes: ['Gulfstream G550', 'Falcon 7X'], serviceRoutes: ['LSZH ↔ LFMN', 'LSGG ↔ EGLL'], reliabilityRating: 4.6, safetyRating: 4.7, responseSpeed: ResponseSpeed.FAST, paymentTerms: PaymentTerms.DUE_ON_RECEIPT, cancellationPolicy: 'Standard European business aviation contract.', sourcingNotes: 'Premier European charter operator with heavy jet capabilities.' },
    { name: 'NetJets', status: OperatorStatus.PREFERRED, homeBase: 'Columbus, OH', website: 'www.netjets.com', primaryContact: 'Jennifer Vance', contactEmail: 'jvance@netjets.example.com', contactPhone: '+1 (877) 356-5825', aircraftTypes: ['Citation Latitude', 'Challenger 650', 'Global 6000'], serviceRoutes: ['KCMH ↔ KTEB', 'KTEB ↔ KPBI', 'KLAX ↔ KSFO'], reliabilityRating: 4.9, safetyRating: 4.9, responseSpeed: ResponseSpeed.FAST, paymentTerms: PaymentTerms.NET_30, cancellationPolicy: 'NetJets broker agreement terms with 48-hour cancellation grace period.', sourcingNotes: 'Largest private jet operator globally. Instant guaranteed availability.' },
  ];

  for (const operator of operators) {
    await prisma.operator.create({
      data: { ...operator, createdById: admin.id, updatedById: admin.id },
    });
  }

  console.log('--- Seeding fleet aircraft (5 rows) ---');
  const aircraft = [
    { tailNumber: 'N780EX', model: 'Gulfstream G550', manufacturer: 'Gulfstream Aerospace', category: AircraftCategory.HEAVY_JET, status: AircraftStatus.AVAILABLE, operatorName: 'ExecuJet', homeBaseIcao: 'KTEB', maxPassengers: 14, rangeNm: 6750, yearBuilt: 2019, maxSpeed: 'Mach 0.885', cruiseSpeed: 'Mach 0.80', serviceCeilingFt: 51000, baggageCapacityCuFt: 226, cabinLengthFt: 50.1, maxTakeoffWeightLb: 91000, emptyWeightLb: 48300, fuelCapacityGal: 6325, takeoffDistanceFt: 5910, landingDistanceFt: 2770, amenities: ['WiFi', 'Satellite Phone', 'Full Galley', 'Private Lavatory', 'Lie-flat Seats'], notes: 'Gogo ATG-5000 WiFi. Premium interior configuration.' },
    { tailNumber: 'N785EX', model: 'Global 7500', manufacturer: 'Bombardier Aviation', category: AircraftCategory.ULTRA_LONG_RANGE, status: AircraftStatus.AVAILABLE, operatorName: 'FlexJet', homeBaseIcao: 'KTEB', maxPassengers: 14, rangeNm: 7700, yearBuilt: 2021, maxSpeed: 'Mach 0.925', cruiseSpeed: 'Mach 0.85', serviceCeilingFt: 51000, baggageCapacityCuFt: 195, cabinLengthFt: 54.4, maxTakeoffWeightLb: 114850, emptyWeightLb: 63000, fuelCapacityGal: 7500, takeoffDistanceFt: 5800, landingDistanceFt: 2520, amenities: ['Ka-band WiFi', 'Satellite Phone', 'Full Galley', 'Private Lavatory', 'Master Suite'], notes: 'Four living zones. Flagship ultra-long-range tail.' },
    { tailNumber: 'N680EX', model: 'Challenger 350', manufacturer: 'Bombardier Aviation', category: AircraftCategory.SUPER_MIDSIZE, status: AircraftStatus.IN_SERVICE, operatorName: 'FlexJet', homeBaseIcao: 'KVNY', maxPassengers: 9, rangeNm: 3200, yearBuilt: 2020, maxSpeed: 'Mach 0.83', cruiseSpeed: 'Mach 0.80', serviceCeilingFt: 45000, baggageCapacityCuFt: 106, cabinLengthFt: 25.2, maxTakeoffWeightLb: 40600, emptyWeightLb: 23200, fuelCapacityGal: 2100, takeoffDistanceFt: 4835, landingDistanceFt: 2364, amenities: ['WiFi', 'Full Galley', 'Private Lavatory'], notes: 'Coast-to-coast US capability.' },
    { tailNumber: 'N600VJ', model: 'Global 6000', manufacturer: 'Bombardier Aviation', category: AircraftCategory.ULTRA_LONG_RANGE, status: AircraftStatus.AVAILABLE, operatorName: 'VistaJet', homeBaseIcao: 'KMIA', maxPassengers: 13, rangeNm: 6000, yearBuilt: 2018, maxSpeed: 'Mach 0.89', cruiseSpeed: 'Mach 0.85', serviceCeilingFt: 51000, baggageCapacityCuFt: 195, cabinLengthFt: 43.3, maxTakeoffWeightLb: 99500, emptyWeightLb: 56000, fuelCapacityGal: 6600, takeoffDistanceFt: 6476, landingDistanceFt: 2670, amenities: ['WiFi', 'Full Galley', 'Private Lavatory', 'Lie-flat Seats'], notes: 'Silver and red stripe livery. Transatlantic workhorse.' },
    { tailNumber: 'N421NJ', model: 'Citation Latitude', manufacturer: 'Textron Aviation', category: AircraftCategory.MIDSIZE_JET, status: AircraftStatus.AVAILABLE, operatorName: 'NetJets', homeBaseIcao: 'KPBI', maxPassengers: 9, rangeNm: 2700, yearBuilt: 2022, maxSpeed: 'Mach 0.80', cruiseSpeed: 'Mach 0.72', serviceCeilingFt: 45000, baggageCapacityCuFt: 100, cabinLengthFt: 21.9, maxTakeoffWeightLb: 30800, emptyWeightLb: 18800, fuelCapacityGal: 1600, takeoffDistanceFt: 3580, landingDistanceFt: 2480, amenities: ['WiFi', 'Refreshment Centre', 'Private Lavatory'], notes: 'Flat-floor cabin. Popular for short Florida hops.' },
  ];

  for (const { operatorName, homeBaseIcao, ...tail } of aircraft) {
    const operator = await prisma.operator.findFirst({ where: { name: operatorName } });
    const homeBase = await prisma.airport.findUnique({ where: { icao: homeBaseIcao } });
    await prisma.aircraft.create({
      data: {
        ...tail,
        operatorId: operator?.id ?? null,
        homeBaseId: homeBase?.id ?? null,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  console.log('--- Seeding clients (3 rows) ---');
  const clients = [
    {
      firstName: 'Marcus',
      lastName: 'Chen',
      email: 'marcus.chen@example.com',
      phone: '+1 (212) 555-0142',
      type: ClientType.DIRECT,
      leadStage: LeadStage.WON,
      leadSource: LeadSource.REFERRAL,
      homeAirportIcao: 'KTEB',
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      preferences: { pets: true, noRedEye: true, preferredFbo: 'Signature' },
      labels: ['VIP', 'Repeat Client'],
    },
    {
      firstName: 'Dana',
      lastName: 'Whitfield',
      companyName: 'Whitfield Travel Group',
      email: 'dana@whitfieldtravel.example.com',
      phone: '+1 (305) 555-0199',
      type: ClientType.TRAVEL_AGENT,
      leadStage: LeadStage.QUOTED,
      leadSource: LeadSource.DIRECT,
      homeAirportIcao: 'KPBI',
      assignedBrokerId: admin.id,
      originatingBrokerId: admin.id,
      preferences: { catering: 'Kosher on request' },
      labels: ['Agency', 'High Volume'],
    },
    {
      firstName: 'Harrison',
      lastName: 'Vance',
      companyName: 'Vance Capital',
      email: 'hvance@vancecap.example.com',
      phone: '+1 (702) 555-0188',
      type: ClientType.DIRECT,
      leadStage: LeadStage.QUALIFIED,
      leadSource: LeadSource.WEBSITE,
      homeAirportIcao: 'KLAS',
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      preferences: { cabinService: 'Flight attendant required' },
      labels: ['Corporate'],
    },
  ];

  for (const { homeAirportIcao, ...client } of clients) {
    const homeAirport = await prisma.airport.findUnique({ where: { icao: homeAirportIcao } });
    await prisma.client.create({
      data: { ...client, homeAirportId: homeAirport?.id ?? null },
    });
  }

  console.log('--- Seeding trip requests (2 rows) ---');
  const day = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  const chenClient = await prisma.client.findFirstOrThrow({ where: { email: 'marcus.chen@example.com' } });
  const whitfieldClient = await prisma.client.findFirstOrThrow({ where: { email: 'dana@whitfieldtravel.example.com' } });

  const teb = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KTEB' } });
  const mia = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KMIA' } });
  const ase = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KASE' } });
  const pbi = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KPBI' } });

  const req1 = await prisma.tripRequest.create({
    data: {
      clientId: chenClient.id,
      assignedBrokerId: broker.id,
      originAirportId: teb.id,
      destinationAirportId: mia.id,
      departureDate: new Date(`${day(14)}T00:00:00.000Z`),
      returnDate: null,
      passengers: 4,
      aircraftPreference: AircraftCategory.HEAVY_JET,
      estimatedValue: '35000.00',
      status: TripRequestStatus.QUOTED,
      source: LeadSource.REFERRAL,
      summary: 'NYC → Miami, executive travel',
      requirements: 'Catering and ground transport at both ends.',
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  const req2 = await prisma.tripRequest.create({
    data: {
      clientId: chenClient.id,
      assignedBrokerId: broker.id,
      originAirportId: mia.id,
      destinationAirportId: ase.id,
      departureDate: new Date(`${day(30)}T00:00:00.000Z`),
      returnDate: new Date(`${day(37)}T00:00:00.000Z`),
      passengers: 6,
      aircraftPreference: AircraftCategory.SUPER_MIDSIZE,
      estimatedValue: '52000.00',
      status: TripRequestStatus.OPEN,
      source: LeadSource.DIRECT,
      summary: 'Miami ↔ Aspen, winter retreat',
      requirements: 'Ski gear storage, in-flight WiFi.',
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  console.log('--- Seeding operator sourcing quotes (3 rows) ---');
  const flexjet = await prisma.operator.findFirstOrThrow({ where: { name: 'FlexJet' } });
  const vistajet = await prisma.operator.findFirstOrThrow({ where: { name: 'VistaJet' } });
  const execujet = await prisma.operator.findFirstOrThrow({ where: { name: 'ExecuJet' } });
  const netjets = await prisma.operator.findFirstOrThrow({ where: { name: 'NetJets' } });

  const tailFlex = await prisma.aircraft.findUniqueOrThrow({ where: { tailNumber: 'N785EX' } });
  const tailExec = await prisma.aircraft.findUniqueOrThrow({ where: { tailNumber: 'N780EX' } });
  const tailNet = await prisma.aircraft.findUniqueOrThrow({ where: { tailNumber: 'N421NJ' } });

  const opQuote1 = await prisma.operatorQuote.create({
    data: {
      tripRequestId: req1.id,
      operatorId: flexjet.id,
      aircraftId: tailFlex.id,
      suggestedAircraft: 'Global 7500, flagship ultra-long range',
      price: '27400.00',
      status: OperatorQuoteStatus.RECEIVED,
      amenities: ['Ka-band WiFi', 'Full Galley', 'Master Suite'],
      terms: 'Net 30. 50% cancellation fee within 48h of departure.',
      requestedAt: new Date(Date.now() - 36 * 3_600_000),
      respondedAt: new Date(Date.now() - 30 * 3_600_000),
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  await prisma.operatorQuote.create({
    data: {
      tripRequestId: req1.id,
      operatorId: vistajet.id,
      aircraftId: null,
      suggestedAircraft: 'Global 6000, heavy jet',
      price: '31250.00',
      status: OperatorQuoteStatus.RECEIVED,
      amenities: ['WiFi', 'Flight Attendant'],
      terms: 'Net 15. 10% non-refundable deposit.',
      requestedAt: new Date(Date.now() - 36 * 3_600_000),
      respondedAt: new Date(Date.now() - 25 * 3_600_000),
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  await prisma.operatorQuote.create({
    data: {
      tripRequestId: req1.id,
      operatorId: execujet.id,
      aircraftId: null,
      suggestedAircraft: 'Gulfstream G550',
      price: null,
      status: OperatorQuoteStatus.AWAITING_RESPONSE,
      amenities: [],
      requestedAt: new Date(Date.now() - 36 * 3_600_000),
      createdById: broker.id,
      updatedById: broker.id,
    },
  });

  console.log('--- Seeding client quotes (2 rows) ---');
  const quote1 = await prisma.quote.create({
    data: {
      clientId: chenClient.id,
      tripRequestId: req1.id,
      operatorQuoteId: opQuote1.id,
      assignedBrokerId: broker.id,
      operatorId: flexjet.id,
      aircraftId: tailFlex.id,
      originAirportId: teb.id,
      destinationAirportId: mia.id,
      departureDate: req1.departureDate,
      passengers: 4,
      basePrice: 33428.00,
      fetEnabled: true,
      fetRate: 0.075,
      operatorCost: 27400.00,
      depositAmount: 8357.00,
      status: QuoteStatus.SENT,
      version: 1,
      sentAt: new Date(Date.now() - 24 * 3_600_000),
      validUntil: new Date(`${day(10)}T00:00:00.000Z`),
      terms: '50% upon contract signing, balance 72 hours prior to departure.',
      internalNotes: 'Client indicated strong preference for Global 7500 tail N785EX.',
      createdById: broker.id,
      updatedById: broker.id,
      versions: {
        create: {
          version: 1,
          basePrice: 33428.00,
          fetEnabled: true,
          fetRate: 0.075,
          operatorCost: 27400.00,
          fetAmount: 2507.10,
          extrasTotal: 0,
          totalPrice: 35935.10,
          grossProfit: 6028.00,
          note: 'Sent to Marcus Chen',
          createdById: broker.id,
        },
      },
    },
  });

  // Quote 2: ACCEPTED quote ready to be booked as a trip
  const quote2 = await prisma.quote.create({
    data: {
      clientId: chenClient.id,
      tripRequestId: req1.id,
      operatorQuoteId: opQuote1.id,
      assignedBrokerId: broker.id,
      operatorId: flexjet.id,
      aircraftId: tailFlex.id,
      originAirportId: teb.id,
      destinationAirportId: mia.id,
      departureDate: req1.departureDate,
      passengers: 4,
      basePrice: 33428.00,
      fetEnabled: true,
      fetRate: 0.075,
      operatorCost: 27400.00,
      depositAmount: 8357.00,
      status: QuoteStatus.APPROVED,
      version: 1,
      sentAt: new Date(Date.now() - 48 * 3_600_000),
      decidedAt: new Date(Date.now() - 12 * 3_600_000),
      validUntil: new Date(`${day(10)}T00:00:00.000Z`),
      terms: '50% upon contract signing, balance 72 hours prior to departure.',
      decisionNote: 'Client accepted offer via phone call with broker.',
      createdById: broker.id,
      updatedById: broker.id,
      versions: {
        create: {
          version: 1,
          basePrice: 33428.00,
          fetEnabled: true,
          fetRate: 0.075,
          operatorCost: 27400.00,
          fetAmount: 2507.10,
          extrasTotal: 0,
          totalPrice: 35935.10,
          grossProfit: 6028.00,
          note: 'Signed and accepted',
          createdById: broker.id,
        },
      },
    },
  });

  console.log('--- Seeding trips (3 rows) ---');
  // Trip 1: CONFIRMED trip born from Quote 2
  await prisma.trip.create({
    data: {
      clientId: chenClient.id,
      assignedBrokerId: broker.id,
      tripRequestId: req1.id,
      quoteId: quote2.id,
      operatorId: flexjet.id,
      aircraftId: tailFlex.id,
      type: TripType.ONE_WAY,
      status: TripStatus.CONFIRMED,
      operatorConfirmedAt: new Date(Date.now() - 6 * 3_600_000),
      passengerCount: 4,
      departureDate: req1.departureDate,
      basePrice: 33428.00,
      fetEnabled: true,
      fetRate: 0.075,
      operatorCost: 27400.00,
      clientNotes: 'Catering: sushi platter and champagne on board. Ground car in Miami.',
      internalNotes: 'VIP client. Confirmed with FlexJet dispatch.',
      createdById: broker.id,
      updatedById: broker.id,
      legs: {
        create: [
          {
            sequence: 1,
            originAirportId: teb.id,
            destinationAirportId: mia.id,
            departureDate: req1.departureDate,
            departureTime: '09:30',
          },
        ],
      },
      passengers: {
        create: [
          { sequence: 1, fullName: 'Marcus Chen', passportNumber: 'P98765432' },
          { sequence: 2, fullName: 'Sarah Chen', passportNumber: 'P98765433' },
          { sequence: 3, fullName: 'David Miller' },
          { sequence: 4, fullName: 'Lisa Wang' },
        ],
      },
    },
  });

  // Trip 2: DRAFT round-trip direct booking
  const trip2Departure = new Date(`${day(30)}T00:00:00.000Z`);
  const trip2Return = new Date(`${day(37)}T00:00:00.000Z`);
  await prisma.trip.create({
    data: {
      clientId: chenClient.id,
      assignedBrokerId: broker.id,
      tripRequestId: req2.id,
      operatorId: execujet.id,
      aircraftId: tailExec.id,
      type: TripType.ROUND_TRIP,
      status: TripStatus.DRAFT,
      passengerCount: 4,
      departureDate: trip2Departure,
      basePrice: 48500.00,
      fetEnabled: true,
      fetRate: 0.075,
      operatorCost: 38200.00,
      clientNotes: 'Ski luggage space required for 4 sets of skis.',
      internalNotes: 'Pending confirmation of mountain airport slots at KASE.',
      createdById: broker.id,
      updatedById: broker.id,
      legs: {
        create: [
          {
            sequence: 1,
            originAirportId: mia.id,
            destinationAirportId: ase.id,
            departureDate: trip2Departure,
            departureTime: '10:00',
          },
          {
            sequence: 2,
            originAirportId: ase.id,
            destinationAirportId: mia.id,
            departureDate: trip2Return,
            departureTime: '14:00',
          },
        ],
      },
      passengers: {
        create: [
          { sequence: 1, fullName: 'Marcus Chen' },
          { sequence: 2, fullName: 'Sarah Chen' },
          { sequence: 3, fullName: 'Leo Chen' },
          { sequence: 4, fullName: 'Maya Chen' },
        ],
      },
    },
  });

  // Trip 3: COMPLETED one-way flight from 10 days ago
  const trip3Departure = new Date(Date.now() - 10 * 86_400_000);
  await prisma.trip.create({
    data: {
      clientId: whitfieldClient.id,
      assignedBrokerId: admin.id,
      operatorId: netjets.id,
      aircraftId: tailNet.id,
      type: TripType.ONE_WAY,
      status: TripStatus.COMPLETED,
      operatorConfirmedAt: new Date(Date.now() - 12 * 86_400_000),
      passengerCount: 2,
      departureDate: trip3Departure,
      basePrice: 19500.00,
      fetEnabled: true,
      fetRate: 0.075,
      operatorCost: 15200.00,
      internalNotes: 'Flight completed smoothly without delays.',
      createdById: admin.id,
      updatedById: admin.id,
      legs: {
        create: [
          {
            sequence: 1,
            originAirportId: pbi.id,
            destinationAirportId: teb.id,
            departureDate: trip3Departure,
            departureTime: '15:00',
          },
        ],
      },
      passengers: {
        create: [
          { sequence: 1, fullName: 'Dana Whitfield' },
          { sequence: 2, fullName: 'Robert Whitfield' },
        ],
      },
    },
  });

  console.log('--- Seeding starter email templates (5 rows) ---');
  const starterTemplates = [
    {
      name: 'Quote Follow-up — Standard',
      category: EmailTemplateCategory.QUOTE_FOLLOW_UP,
      subject: 'Following up on your charter quote for {route}',
      body: [
        'Dear {client_first_name},',
        '',
        'I wanted to follow up on quote {quote_id} for your {route} charter on {departure_date}.',
        '',
        '- Aircraft: {aircraft}',
        '- Total: {total_price}, including {fet_amount} federal excise tax',
        '- Valid until: {quote_valid_until}',
        '',
        'Let me know if you have any questions, or if you would like to go ahead and confirm the flight.',
        '',
        'Best regards,',
        '{broker_name}',
        'Tribeca Jets',
      ].join('\n'),
    },
    {
      name: 'Trip Confirmation',
      category: EmailTemplateCategory.TRIP_CONFIRMATION,
      subject: 'Your charter is confirmed — {trip_id}',
      body: [
        'Dear {client_first_name},',
        '',
        'We are pleased to confirm your charter, {trip_id}.',
        '',
        '- Route: {route}',
        '- Departure: {departure_date} at {departure_time}',
        '- Aircraft: {aircraft} ({tail_number})',
        '- Passengers: {passenger_count}',
        '',
        'If anything changes, reply to this email and I will take care of it.',
        '',
        'Safe travels,',
        '{broker_name}',
        'Tribeca Jets',
      ].join('\n'),
    },
    {
      name: 'Payment Reminder',
      category: EmailTemplateCategory.PAYMENT,
      subject: 'Payment reminder — invoice {invoice_id}',
      body: [
        'Dear {client_first_name},',
        '',
        'This is a friendly reminder that invoice {invoice_id} is due on {due_date}.',
        '',
        '- Invoice total: {invoice_total}',
        '- Amount due: {amount_due}',
        '',
        'Please reply to this email if you have any questions about the invoice or how to pay it.',
        '',
        'Best regards,',
        '{broker_name}',
        'Tribeca Jets',
      ].join('\n'),
    },
    {
      name: 'Operator Availability Request',
      category: EmailTemplateCategory.GENERAL,
      subject: 'Availability request — {route}',
      body: [
        'Hello {operator_contact},',
        '',
        'Could you confirm availability and pricing for the following trip?',
        '',
        '- Route: {route}',
        '- Departure: {departure_date} at {departure_time}',
        '- Passengers: {passenger_count}',
        '',
        'Thank you,',
        '{broker_name}',
        'Tribeca Jets',
      ].join('\n'),
    },
    {
      name: 'Birthday Greeting',
      category: EmailTemplateCategory.CLIENT_UPDATE,
      subject: 'Happy birthday, {client_first_name}!',
      body: [
        'Dear {client_first_name},',
        '',
        'Wishing you a very happy birthday from all of us at Tribeca Jets.',
        '',
        'Thank you for your continued trust — we look forward to welcoming you aboard again.',
        '',
        'Warm regards,',
        '{broker_name}',
        'Tribeca Jets',
      ].join('\n'),
    },
  ];

  for (const template of starterTemplates) {
    await prisma.emailTemplate.create({
      data: { ...template, createdById: admin.id, updatedById: admin.id },
    });
  }

  // Summary counts
  const [
    userCount,
    airportCount,
    rateCount,
    operatorCount,
    aircraftCount,
    clientCount,
    reqCount,
    opQuoteCount,
    quoteCount,
    tripCount,
    templateCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.airport.count({ where: { deletedAt: null } }),
    prisma.charterRate.count(),
    prisma.operator.count({ where: { deletedAt: null } }),
    prisma.aircraft.count({ where: { deletedAt: null } }),
    prisma.client.count({ where: { deletedAt: null } }),
    prisma.tripRequest.count({ where: { deletedAt: null } }),
    prisma.operatorQuote.count({ where: { deletedAt: null } }),
    prisma.quote.count({ where: { deletedAt: null } }),
    prisma.trip.count({ where: { deletedAt: null } }),
    prisma.emailTemplate.count({ where: { deletedAt: null } }),
  ]);

  console.log('\n================ SEED & RESET COMPLETE ================');
  console.log(`Users (active/preserved):   ${userCount}`);
  console.log(`Airports:                   ${airportCount}`);
  console.log(`Charter Rates:              ${rateCount}`);
  console.log(`Operators:                  ${operatorCount}`);
  console.log(`Aircraft:                   ${aircraftCount}`);
  console.log(`Clients:                    ${clientCount}`);
  console.log(`Trip Requests:              ${reqCount}`);
  console.log(`Operator Quotes:            ${opQuoteCount}`);
  console.log(`Client Quotes:              ${quoteCount}`);
  console.log(`Trips:                      ${tripCount}`);
  console.log(`Email Templates:            ${templateCount}`);
  console.log('========================================================\n');
  console.log('Accounts:');
  console.log('  admin@example.com      / ChangeMe123! (SUPER_ADMIN)');
  console.log('  security@example.com   / ChangeMe123! (ADMIN, 2FA enabled)');
  console.log('  broker@example.com     / ChangeMe123! (BROKER)');
  console.log('  assistant@example.com  / ChangeMe123! (ASSISTANT)');
  console.log('  agent@example.com      / ChangeMe123! (REFERRAL_AGENT)');
  console.log('  barry@example.com      / ChangeMe123! (BROKER + ARCHIVE/REPORTS)');
  console.log('  mark@example.com       / ChangeMe123! (BROKER - VIEW_MONEY)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
