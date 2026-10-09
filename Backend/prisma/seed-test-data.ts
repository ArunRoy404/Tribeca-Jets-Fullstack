import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  AircraftCategory,
  AircraftStatus,
  ClientType,
  ClientStatus,
  LeadSource,
  LeadStage,
  ClientPriority,
  FollowUpMethod,
} from '../src/generated/prisma/enums.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main(): Promise<void> {
  console.log('Seeding consistent test data for Aircraft and Clients...');

  // Fetch reference records
  const superAdmin = await prisma.user.findFirstOrThrow({
    where: { email: 'roy.techreion@gmail.com' },
  });
  const broker = await prisma.user.findFirstOrThrow({
    where: { email: 'broker@tribecajets.com' },
  });
  const admin = await prisma.user.findFirstOrThrow({
    where: { email: 'admin@tribecajets.com' },
  });

  const kteb = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KTEB' } });
  const kpbi = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KPBI' } });
  const kmia = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KMIA' } });
  const kvny = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KVNY' } });
  const klas = await prisma.airport.findUniqueOrThrow({ where: { icao: 'KLAS' } });
  const egll = await prisma.airport.findUniqueOrThrow({ where: { icao: 'EGLL' } });

  const netjets = await prisma.operator.findFirstOrThrow({ where: { name: 'NetJets' } });
  const flexjet = await prisma.operator.findFirstOrThrow({ where: { name: 'FlexJet' } });
  const vistajet = await prisma.operator.findFirstOrThrow({ where: { name: 'VistaJet' } });
  const execujet = await prisma.operator.findFirstOrThrow({ where: { name: 'ExecuJet' } });

  // 1. Seed 5 Aircraft
  const aircraftData = [
    {
      tailNumber: 'N101NJ',
      model: 'Citation Latitude',
      manufacturer: 'Cessna',
      category: AircraftCategory.MIDSIZE_JET,
      status: AircraftStatus.AVAILABLE,
      operatorId: netjets.id,
      homeBaseId: kteb.id,
      maxPassengers: 8,
      rangeNm: 2700,
      yearBuilt: 2021,
      cruiseSpeed: 'Mach 0.80',
      maxSpeed: 'Mach 0.84',
      baggageCapacityCuFt: 127,
      serviceCeilingFt: 45000,
      amenities: ['High-speed WiFi', 'Lavatory', 'Refreshment Center'],
      notes: 'Excellent short-runway performance and comfortable stand-up cabin.',
    },
    {
      tailNumber: 'N350FJ',
      model: 'Challenger 350',
      manufacturer: 'Bombardier',
      category: AircraftCategory.SUPER_MIDSIZE,
      status: AircraftStatus.AVAILABLE,
      operatorId: flexjet.id,
      homeBaseId: kpbi.id,
      maxPassengers: 9,
      rangeNm: 3200,
      yearBuilt: 2020,
      cruiseSpeed: 'Mach 0.82',
      maxSpeed: 'Mach 0.83',
      baggageCapacityCuFt: 106,
      serviceCeilingFt: 45000,
      amenities: ['Ka-Band WiFi', 'Full Galley', 'Enclosed Lavatory', 'Blu-ray System'],
      notes: 'Coast-to-coast non-stop range with smooth ride in turbulence.',
    },
    {
      tailNumber: '9H-VJA',
      model: 'Global 7500',
      manufacturer: 'Bombardier',
      category: AircraftCategory.ULTRA_LONG_RANGE,
      status: AircraftStatus.AVAILABLE,
      operatorId: vistajet.id,
      homeBaseId: egll.id,
      maxPassengers: 14,
      rangeNm: 7700,
      yearBuilt: 2022,
      cruiseSpeed: 'Mach 0.88',
      maxSpeed: 'Mach 0.925',
      baggageCapacityCuFt: 195,
      serviceCeilingFt: 51000,
      amenities: ['Global Express WiFi', 'Master Bedroom', 'Full Convection Oven', 'Dedicated Crew Rest'],
      notes: 'Flagship long-range airframe for transatlantic and intercontinental routing.',
    },
    {
      tailNumber: 'HB-JNL',
      model: 'Falcon 7X',
      manufacturer: 'Dassault',
      category: AircraftCategory.HEAVY_JET,
      status: AircraftStatus.AVAILABLE,
      operatorId: execujet.id,
      homeBaseId: kvny.id,
      maxPassengers: 12,
      rangeNm: 5950,
      yearBuilt: 2019,
      cruiseSpeed: 'Mach 0.85',
      maxSpeed: 'Mach 0.90',
      baggageCapacityCuFt: 140,
      serviceCeilingFt: 51000,
      amenities: ['Satcom Direct WiFi', 'Executive Seating', 'Hot Meal Galley'],
      notes: 'Trijet safety and steep-approach capability into challenging mountain airports.',
    },
    {
      tailNumber: 'N505NJ',
      model: 'Phenom 300E',
      manufacturer: 'Embraer',
      category: AircraftCategory.LIGHT_JET,
      status: AircraftStatus.AVAILABLE,
      operatorId: netjets.id,
      homeBaseId: kmia.id,
      maxPassengers: 6,
      rangeNm: 2010,
      yearBuilt: 2023,
      cruiseSpeed: '453 KTAS',
      maxSpeed: 'Mach 0.80',
      baggageCapacityCuFt: 84,
      serviceCeilingFt: 45000,
      amenities: ['In-flight WiFi', 'Belted Lavatory', 'Power Outlets'],
      notes: 'Best-selling light jet in the world; optimal for quick regional hops.',
    },
  ];

  for (const ac of aircraftData) {
    await prisma.aircraft.create({
      data: {
        ...ac,
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
    });
  }
  console.log(`✅ Seeded ${aircraftData.length} aircraft.`);

  // 2. Seed 5 Clients
  const clientsData = [
    {
      type: ClientType.DIRECT,
      status: ClientStatus.VIP,
      firstName: 'Arthur',
      lastName: 'Pendelton',
      email: 'arthur.pendelton@apexcapital.example.com',
      phone: '+1 (212) 555-0199',
      homeAirportId: kteb.id,
      leadSource: LeadSource.DIRECT,
      leadStage: LeadStage.WON,
      priority: ClientPriority.HIGH,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.CALL,
      nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      followUpNote: 'Check in regarding Thanksgiving trip request to Aspen.',
      notes: 'Managing partner at Apex Capital. Prefers super-mid and heavy jets for family trips.',
      labels: ['VIP', 'Repeat Flyer', 'East Coast Hub'],
    },
    {
      type: ClientType.DIRECT,
      status: ClientStatus.ACTIVE,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@rostovadesign.example.com',
      phone: '+1 (305) 555-0144',
      homeAirportId: kpbi.id,
      leadSource: LeadSource.WEBSITE,
      leadStage: LeadStage.QUOTED,
      priority: ClientPriority.HIGH,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.WHATSAPP,
      nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      followUpNote: 'Send updated quote for Palm Beach to Teterboro weekend charter.',
      notes: 'Interior designer. Responsive via WhatsApp; prefers quiet cabins.',
      labels: ['Art Basel', 'South Florida', 'Responsive'],
    },
    {
      type: ClientType.DIRECT,
      status: ClientStatus.LEAD,
      firstName: 'Marcus',
      lastName: 'Vance',
      email: 'mvance@vancetech.example.com',
      phone: '+1 (310) 555-0177',
      homeAirportId: kvny.id,
      leadSource: LeadSource.REFERRAL,
      leadStage: LeadStage.NEW,
      priority: ClientPriority.MEDIUM,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.EMAIL,
      nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      followUpNote: 'Initial outreach with light jet options for West Coast meetings.',
      notes: 'Tech founder. Inquired through friend about chartering Phenom 300 or Citation Latitude.',
      labels: ['New Prospect', 'West Coast'],
    },
    {
      type: ClientType.TRAVEL_AGENT,
      status: ClientStatus.ACTIVE,
      companyName: 'Horizon Luxury Travel Ltd',
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.j@horizontravel.example.co.uk',
      phone: '+44 20 7946 0881',
      homeAirportId: egll.id,
      leadSource: LeadSource.TRAVEL_AGENT,
      leadStage: LeadStage.PROPOSAL,
      priority: ClientPriority.HIGH,
      assignedBrokerId: admin.id,
      originatingBrokerId: admin.id,
      followUpMethod: FollowUpMethod.EMAIL,
      nextFollowUpAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // In 12 hours
      followUpNote: 'Confirm catering specifications and passport copies for London - Miami flight.',
      notes: 'High-end concierge travel agency managing bookings for UK and European clients.',
      labels: ['Travel Agent', 'Transatlantic', 'High Volume'],
    },
    {
      type: ClientType.DIRECT,
      status: ClientStatus.VIP,
      firstName: 'Julian',
      lastName: 'Sterling',
      email: 'jsterling@sterlingholding.example.com',
      phone: '+1 (702) 555-0133',
      homeAirportId: klas.id,
      leadSource: LeadSource.DIRECT,
      leadStage: LeadStage.QUALIFIED,
      priority: ClientPriority.MEDIUM,
      assignedBrokerId: broker.id,
      originatingBrokerId: broker.id,
      followUpMethod: FollowUpMethod.SMS,
      nextFollowUpAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      followUpNote: 'Follow up on proposed dates for annual shareholder conference in New York.',
      notes: 'Real estate developer based in Las Vegas. Non-stop flights preferred.',
      labels: ['VIP', 'Corporate', 'West Coast Hub'],
    },
  ];

  for (const cl of clientsData) {
    await prisma.client.create({
      data: {
        ...cl,
        createdById: superAdmin.id,
        updatedById: superAdmin.id,
      },
    });
  }
  console.log(`✅ Seeded ${clientsData.length} clients.`);
}

main()
  .catch((err) => {
    console.error('Failed to seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
