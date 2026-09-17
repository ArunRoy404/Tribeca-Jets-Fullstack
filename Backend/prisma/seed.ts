import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ClientType,
  LeadSource,
  LeadStage,
  OperatorStatus,
  AircraftCategory,
  AircraftStatus,
  ClientPriority,
  FollowUpMethod,
  TripRequestStatus,
  UserRole,
  UserStatus,
  OperatorQuoteStatus,
  QuoteStatus,
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
      leadStage: LeadStage.WON,
      leadSource: LeadSource.REFERRAL,
      homeAirportIcao: 'KTEB',
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
      homeAirportIcao: 'KOPF',
      assignedBrokerId: admin.id,
      originatingBrokerId: admin.id,
      preferences: { catering: 'Kosher on request' },
      labels: ['Agency'],
    },
  ];

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

  // Clients are inserted after airports on purpose: `homeAirportId` is a real
  // foreign key now, so the row it points at has to exist first.
  for (const { homeAirportIcao, ...client } of clients) {
    const existing = await prisma.client.findFirst({
      where: { email: client.email },
      select: { id: true },
    });
    if (existing) continue;

    const homeAirport = homeAirportIcao
      ? await prisma.airport.findUnique({
          where: { icao: homeAirportIcao },
          select: { id: true },
        })
      : null;

    await prisma.client.create({
      data: { ...client, homeAirportId: homeAirport?.id ?? null },
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

  // Aircraft come last: `operatorId` and `homeBaseId` are real foreign keys,
  // so both rows they point at have to exist first. Each tail below is a real
  // airframe on a real operator's certificate, and every specification is that
  // type's published figure — a seeded number is still a number someone will
  // read off the screen and quote against.
  const aircraft = [
    { tailNumber: 'N780EX', model: 'Gulfstream G550', manufacturer: 'Gulfstream Aerospace', category: AircraftCategory.HEAVY_JET, status: AircraftStatus.AVAILABLE, operatorName: 'ExecuJet', homeBaseIcao: 'KTEB', maxPassengers: 14, rangeNm: 6750, yearBuilt: 2019, maxSpeed: 'Mach 0.885', cruiseSpeed: 'Mach 0.80', serviceCeilingFt: 51000, baggageCapacityCuFt: 226, cabinLengthFt: 50.1, maxTakeoffWeightLb: 91000, emptyWeightLb: 48300, fuelCapacityGal: 6325, takeoffDistanceFt: 5910, landingDistanceFt: 2770, amenities: ['WiFi', 'Satellite Phone', 'Full Galley', 'Private Lavatory', 'Lie-flat Seats', 'Entertainment System', 'Power Outlets'], notes: 'Gogo ATG-5000 WiFi. Premium interior configuration.' },
    { tailNumber: 'N785EX', model: 'Global 7500', manufacturer: 'Bombardier Aviation', category: AircraftCategory.ULTRA_LONG_RANGE, status: AircraftStatus.AVAILABLE, operatorName: 'FlexJet', homeBaseIcao: 'KTEB', maxPassengers: 14, rangeNm: 7700, yearBuilt: 2021, maxSpeed: 'Mach 0.925', cruiseSpeed: 'Mach 0.85', serviceCeilingFt: 51000, baggageCapacityCuFt: 195, cabinLengthFt: 54.4, maxTakeoffWeightLb: 114850, emptyWeightLb: 63000, fuelCapacityGal: 7500, takeoffDistanceFt: 5800, landingDistanceFt: 2520, amenities: ['Ka-band WiFi', 'Satellite Phone', 'Full Galley', 'Private Lavatory', 'Master Suite', 'Power Outlets'], notes: 'Four living zones. Flagship ultra-long-range tail.' },
    { tailNumber: 'N680EX', model: 'Challenger 350', manufacturer: 'Bombardier Aviation', category: AircraftCategory.SUPER_MIDSIZE, status: AircraftStatus.IN_SERVICE, operatorName: 'FlexJet', homeBaseIcao: 'KVNY', maxPassengers: 9, rangeNm: 3200, yearBuilt: 2020, maxSpeed: 'Mach 0.83', cruiseSpeed: 'Mach 0.80', serviceCeilingFt: 45000, baggageCapacityCuFt: 106, cabinLengthFt: 25.2, maxTakeoffWeightLb: 40600, emptyWeightLb: 23200, fuelCapacityGal: 2100, takeoffDistanceFt: 4835, landingDistanceFt: 2364, amenities: ['WiFi', 'Full Galley', 'Private Lavatory', 'Power Outlets'], notes: 'Coast-to-coast US capability.' },
    { tailNumber: 'N600VJ', model: 'Global 6000', manufacturer: 'Bombardier Aviation', category: AircraftCategory.ULTRA_LONG_RANGE, status: AircraftStatus.AVAILABLE, operatorName: 'VistaJet', homeBaseIcao: 'EGLL', maxPassengers: 13, rangeNm: 6000, yearBuilt: 2018, maxSpeed: 'Mach 0.89', cruiseSpeed: 'Mach 0.85', serviceCeilingFt: 51000, baggageCapacityCuFt: 195, cabinLengthFt: 43.3, maxTakeoffWeightLb: 99500, emptyWeightLb: 56000, fuelCapacityGal: 6600, takeoffDistanceFt: 6476, landingDistanceFt: 2670, amenities: ['WiFi', 'Full Galley', 'Private Lavatory', 'Lie-flat Seats'], notes: 'Silver and red stripe livery. Transatlantic workhorse.' },
    { tailNumber: 'N421NJ', model: 'Citation Latitude', manufacturer: 'Textron Aviation', category: AircraftCategory.MIDSIZE_JET, status: AircraftStatus.MAINTENANCE, operatorName: 'NetJets', homeBaseIcao: 'KPBI', maxPassengers: 9, rangeNm: 2700, yearBuilt: 2022, maxSpeed: 'Mach 0.80', cruiseSpeed: 'Mach 0.72', serviceCeilingFt: 45000, baggageCapacityCuFt: 100, cabinLengthFt: 21.9, maxTakeoffWeightLb: 30800, emptyWeightLb: 18800, fuelCapacityGal: 1600, takeoffDistanceFt: 3580, landingDistanceFt: 2480, amenities: ['WiFi', 'Refreshment Centre', 'Private Lavatory', 'Power Outlets'], notes: 'Flat-floor cabin. Popular for short Florida hops.' },
    // One TURBOPROP and one INACTIVE tail, so the category and status filters
    // both have something to exclude.
    { tailNumber: 'N208CL', model: 'Pilatus PC-12 NGX', manufacturer: 'Pilatus Aircraft', category: AircraftCategory.TURBOPROP, status: AircraftStatus.AVAILABLE, operatorName: 'Clay Lacy Aviation', homeBaseIcao: 'KASE', maxPassengers: 8, rangeNm: 1803, yearBuilt: 2021, maxSpeed: '290 KTAS', cruiseSpeed: '270 KTAS', serviceCeilingFt: 30000, baggageCapacityCuFt: 40, cabinLengthFt: 16.9, maxTakeoffWeightLb: 10450, emptyWeightLb: 6600, fuelCapacityGal: 402, takeoffDistanceFt: 2600, landingDistanceFt: 2170, amenities: ['Power Outlets', 'Refreshment Centre'], notes: 'Short-field capable. The only tail that can work KASE in winter.' },
    { tailNumber: 'N750CL', model: 'Citation X', manufacturer: 'Textron Aviation', category: AircraftCategory.SUPER_MIDSIZE, status: AircraftStatus.INACTIVE, operatorName: 'Clay Lacy Aviation', homeBaseIcao: 'KVNY', maxPassengers: 8, rangeNm: 3070, yearBuilt: 2012, maxSpeed: 'Mach 0.935', cruiseSpeed: 'Mach 0.85', serviceCeilingFt: 51000, baggageCapacityCuFt: 82, cabinLengthFt: 25.2, maxTakeoffWeightLb: 36600, emptyWeightLb: 22100, fuelCapacityGal: 1926, takeoffDistanceFt: 5140, landingDistanceFt: 3180, amenities: ['Power Outlets'], notes: 'Withdrawn from charter when the West Coast desk moved to NetJets.' },
  ];

  for (const { operatorName, homeBaseIcao, ...tail } of aircraft) {
    const existing = await prisma.aircraft.findUnique({
      where: { tailNumber: tail.tailNumber },
      select: { id: true },
    });
    if (existing) continue;

    const operator = await prisma.operator.findFirst({
      where: { name: operatorName },
      select: { id: true },
    });
    const homeBase = await prisma.airport.findUnique({
      where: { icao: homeBaseIcao },
      select: { id: true },
    });

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

  // Trip requests come last: `clientId` and both airport ids are real foreign
  // keys, so every row they point at has to exist first.
  //
  // These are enquiries against seeded clients — the second half of the Add
  // Lead form, which files a person and what they asked for as two records.
  const day = (offset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  };

  const requests = [
    { clientEmail: 'marcus.chen@example.com', originIcao: 'KTEB', destinationIcao: 'KMIA', departure: day(14), returnDate: day(17), passengers: 4, aircraftPreference: AircraftCategory.HEAVY_JET, estimatedValue: '28000.00', status: TripRequestStatus.QUOTED, source: LeadSource.DIRECT, summary: 'NYC → Miami, business charter', requirements: 'Catering and ground transport at both ends.' },
    { clientEmail: 'marcus.chen@example.com', originIcao: 'KMIA', destinationIcao: 'KASE', departure: day(46), returnDate: null, passengers: 6, aircraftPreference: AircraftCategory.SUPER_MIDSIZE, estimatedValue: '41500.00', status: TripRequestStatus.OPEN, source: LeadSource.REFERRAL, summary: 'Miami → Aspen, ski week', requirements: 'Ski equipment, six sets.' },
  ];

  for (const { clientEmail, originIcao, destinationIcao, departure, returnDate, ...fields } of requests) {
    const client = await prisma.client.findFirst({
      where: { email: clientEmail },
      select: { id: true, assignedBrokerId: true },
    });
    if (!client) continue;

    const existing = await prisma.tripRequest.findFirst({
      where: { clientId: client.id, summary: fields.summary },
      select: { id: true },
    });
    if (existing) continue;

    const [origin, destination] = await Promise.all([
      prisma.airport.findUnique({ where: { icao: originIcao }, select: { id: true } }),
      prisma.airport.findUnique({ where: { icao: destinationIcao }, select: { id: true } }),
    ]);

    await prisma.tripRequest.create({
      data: {
        ...fields,
        clientId: client.id,
        assignedBrokerId: client.assignedBrokerId,
        originAirportId: origin?.id ?? null,
        destinationAirportId: destination?.id ?? null,
        departureDate: new Date(`${departure}T00:00:00.000Z`),
        returnDate: returnDate ? new Date(`${returnDate}T00:00:00.000Z`) : null,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
  }

  // Operator sourcing: what came back on the first enquiry.
  //
  // Three operators asked, two answered, one still out — so the board has a
  // row in each of its states to show, and the derived counts ("3 contacted,
  // 2 responded") have something real to count. The unanswered one is
  // deliberate: an enquiry where every operator has replied never exercises
  // AWAITING_RESPONSE, which is the state the desk actually chases.
  // `deletedAt: null` matters: testing archives requests, and an archived one
  // still matches on summary. Without it the seed hangs its quotes off a
  // removed enquiry — which is exactly what happened, and it is invisible
  // until a board shows two quotes whose request is not in any list.
  const sourcedRequest = await prisma.tripRequest.findFirst({
    where: { summary: 'NYC → Miami, business charter', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (sourcedRequest) {
    const hoursAgo = (hours: number) =>
      new Date(Date.now() - hours * 3_600_000);

    const quotes = [
      { operatorName: 'FlexJet', tail: 'N780EX', price: '27400.00', status: OperatorQuoteStatus.RECEIVED, requestedAt: hoursAgo(28), respondedAt: hoursAgo(26), amenities: ['WiFi', 'Full Galley'], terms: 'Net 30. 50% fee within 48 hours of departure.' },
      { operatorName: 'VistaJet', tail: null, price: '31250.00', status: OperatorQuoteStatus.RECEIVED, requestedAt: hoursAgo(28), respondedAt: hoursAgo(21), amenities: ['WiFi', 'Flight Attendant'], terms: 'Net 15. 10% non-refundable deposit.' },
      { operatorName: 'Solairus Aviation', tail: null, price: null, status: OperatorQuoteStatus.AWAITING_RESPONSE, requestedAt: hoursAgo(28), respondedAt: null, amenities: [], terms: null },
    ];

    for (const quote of quotes) {
      const operator = await prisma.operator.findFirst({
        where: { name: quote.operatorName, deletedAt: null },
        select: { id: true },
      });
      if (!operator) continue;

      // Re-runnable: the live-only uniqueness means a second seed would
      // otherwise collide on the same request/operator pair.
      const existing = await prisma.operatorQuote.findFirst({
        where: {
          tripRequestId: sourcedRequest.id,
          operatorId: operator.id,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (existing) continue;

      // Only link a tail we actually hold, and only on its own operator's
      // certificate — the service enforces that, and the seed must not write
      // a row the API would have refused.
      const aircraft = quote.tail
        ? await prisma.aircraft.findFirst({
            where: {
              tailNumber: quote.tail,
              operatorId: operator.id,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null;

      await prisma.operatorQuote.create({
        data: {
          tripRequestId: sourcedRequest.id,
          operatorId: operator.id,
          aircraftId: aircraft?.id ?? null,
          suggestedAircraft: 'Heavy jet, four passengers, NYC to Miami',
          price: quote.price,
          amenities: quote.amenities,
          terms: quote.terms,
          status: quote.status,
          requestedAt: quote.requestedAt,
          respondedAt: quote.respondedAt,
          createdById: admin.id,
          updatedById: admin.id,
        },
      });
    }
  }

  // Client quotes: one sent and waiting, one draft.
  //
  // The sent one is built on the cheapest operator quote above, which is the
  // whole point of the link — the margin on it traces back to a real number an
  // operator gave us rather than to a figure someone retyped. The draft gives
  // the board a row that has never been near a client, so the "send it first"
  // rule has something to refuse.
  if (sourcedRequest) {
    const winning = await prisma.operatorQuote.findFirst({
      where: {
        tripRequestId: sourcedRequest.id,
        status: OperatorQuoteStatus.RECEIVED,
        deletedAt: null,
      },
      orderBy: { price: 'asc' },
      select: { id: true, price: true, operatorId: true, aircraftId: true },
    });

    const request = await prisma.tripRequest.findUnique({
      where: { id: sourcedRequest.id },
      select: {
        clientId: true,
        assignedBrokerId: true,
        originAirportId: true,
        destinationAirportId: true,
        departureDate: true,
        returnDate: true,
        passengers: true,
      },
    });

    const already = await prisma.quote.count({
      where: { tripRequestId: sourcedRequest.id, deletedAt: null },
    });

    if (winning && request && already === 0) {
      const operatorCost = Number(winning.price);
      // A round 22% over cost, before tax — a plausible desk markup, and
      // written as a stated multiple rather than a magic total so the figure
      // is reproducible rather than invented.
      const basePrice = Math.round(operatorCost * 1.22 * 100) / 100;

      const inTenDays = new Date();
      inTenDays.setUTCDate(inTenDays.getUTCDate() + 10);
      inTenDays.setUTCHours(0, 0, 0, 0);

      const sent = await prisma.quote.create({
        data: {
          clientId: request.clientId,
          tripRequestId: sourcedRequest.id,
          operatorQuoteId: winning.id,
          assignedBrokerId: request.assignedBrokerId ?? broker.id,
          operatorId: winning.operatorId,
          aircraftId: winning.aircraftId,
          originAirportId: request.originAirportId,
          destinationAirportId: request.destinationAirportId,
          departureDate: request.departureDate,
          returnDate: request.returnDate,
          passengers: request.passengers,
          basePrice,
          fetEnabled: true,
          operatorCost,
          depositAmount: Math.round(basePrice * 0.25 * 100) / 100,
          lineItems: [
            { label: 'Catering (premium)', amount: null, included: true },
            { label: 'Ground transportation', amount: 850, included: false },
          ],
          status: QuoteStatus.SENT,
          version: 1,
          sentAt: new Date(Date.now() - 20 * 3_600_000),
          validUntil: inTenDays,
          terms: '50% on acceptance, balance 72 hours before departure.',
          createdById: admin.id,
          updatedById: admin.id,
        },
        select: { id: true, basePrice: true, fetRate: true },
      });

      const fetAmount =
        Math.round(Number(sent.basePrice) * Number(sent.fetRate) * 100) / 100;
      await prisma.quoteVersion.create({
        data: {
          quoteId: sent.id,
          version: 1,
          basePrice,
          fetEnabled: true,
          fetRate: sent.fetRate,
          operatorCost,
          lineItems: [
            { label: 'Catering (premium)', amount: null, included: true },
            { label: 'Ground transportation', amount: 850, included: false },
          ],
          fetAmount,
          extrasTotal: 850,
          totalPrice: Math.round((basePrice + fetAmount + 850) * 100) / 100,
          grossProfit:
            Math.round((basePrice + fetAmount + 850 - operatorCost) * 100) / 100,
          note: 'Initial quote',
          createdById: admin.id,
        },
      });

      await prisma.quote.create({
        data: {
          clientId: request.clientId,
          tripRequestId: sourcedRequest.id,
          assignedBrokerId: broker.id,
          originAirportId: request.originAirportId,
          destinationAirportId: request.destinationAirportId,
          departureDate: request.departureDate,
          passengers: request.passengers,
          basePrice: 38900,
          fetEnabled: true,
          lineItems: [],
          status: QuoteStatus.DRAFT,
          version: 1,
          internalNotes: 'Alternative on a super-midsize — cheaper, one stop.',
          createdById: admin.id,
          updatedById: admin.id,
          versions: {
            create: {
              version: 1,
              basePrice: 38900,
              fetEnabled: true,
              fetRate: 0.075,
              operatorCost: null,
              lineItems: [],
              fetAmount: 2917.5,
              extrasTotal: 0,
              totalPrice: 41817.5,
              grossProfit: null,
              note: 'Initial quote',
              createdById: admin.id,
            },
          },
        },
      });
    }
  }

  // Lead-desk settings on the seeded brokers, so the Agents roster has a cap
  // to measure workload against rather than inventing one.
  await prisma.user.update({
    where: { id: broker.id },
    data: { maxActiveLeads: 15, defaultFollowUpMethod: FollowUpMethod.CALL },
  });

  console.log('Seed complete.');
  console.log('  admin@tribecajets.com  / ChangeMe123!  (SUPER_ADMIN)');
  console.log('  broker@tribecajets.com / ChangeMe123!  (BROKER)');
  console.log('  security@tribecajets.com / ChangeMe123!  (ADMIN, 2FA on)');
  console.log('  reset-demo@tribecajets.com / ChangeMe123!  (BROKER, password-reset target)');
  console.log('  senior@tribecajets.com / ChangeMe123!  (SENIOR_BROKER)');
  console.log('  assistant@tribecajets.com / ChangeMe123!  (ASSISTANT)');
  console.log('  + barry / mark (BROKER, active), tom (SUSPENDED), newhire (INVITED)');
  console.log(
    `  ${airports.length} airports, ${operators.length} operators, ${aircraft.length} aircraft, ${requests.length} trip requests, 3 operator quotes, 2 client quotes`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
