import { trips } from "@/dummyData/trips";

export const TRIP_PROGRESS_STEPS = [
  "Client Request",
  "Quote Preparing",
  "Quote Sent",
  "Client Reviewing",
  "Trip Booked",
  "Operator Confirmed",
  "Payment Completed",
  "Pre-Flight Finalized",
  "24h to Departure",
  "Aircraft Ready",
  "Departed",
  "In Flight",
  "Landed",
  "Trip Completed",
];

const STATUS_STEP_INDEX = {
  Requested: 1,
  Sourcing: 3,
  Booked: 4,
  Confirmed: 6,
  "In Flight": 11,
  Completed: 13,
};

const AIRPORTS = {
  KTEB: { name: "Teterboro Airport", city: "Teterboro, NJ" },
  KPBI: { name: "Palm Beach International Airport", city: "West Palm Beach, FL" },
  KMIA: { name: "Miami International Airport", city: "Miami, FL" },
  EGLL: { name: "London Heathrow Airport", city: "London, UK" },
  KVNY: { name: "Van Nuys Airport", city: "Van Nuys, CA" },
  KASE: { name: "Aspen/Pitkin County Airport", city: "Aspen, CO" },
  LFPB: { name: "Paris-Le Bourget Airport", city: "Paris, France" },
  KLAS: { name: "Harry Reid International Airport", city: "Las Vegas, NV" },
  KFLL: { name: "Fort Lauderdale-Hollywood Airport", city: "Fort Lauderdale, FL" },
  KLAX: { name: "Los Angeles International Airport", city: "Los Angeles, CA" },
  KSFO: { name: "San Francisco International Airport", city: "San Francisco, CA" },
};

function parseCurrency(value) {
  const n = parseInt(String(value).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(n) {
  return `$${Math.max(0, Math.round(n)).toLocaleString()}`;
}

function airportInfo(code) {
  return AIRPORTS[code] ?? { name: code, city: "" };
}

export function getTripDetails(tripId) {
  const normalized = String(tripId).replace("#", "").toUpperCase();
  const trip = trips.find((t) => t.id.replace("#", "").toUpperCase() === normalized);
  if (!trip) return null;

  const profit = parseCurrency(trip.profit);
  const fet = parseCurrency(trip.fet);
  const operatorCost = Math.round(profit * 3.2) || 45000;
  const brokerCommission = Math.round(profit * 0.15) || 800;
  const clientQuote = operatorCost + profit + fet;
  const margin = clientQuote ? ((profit / clientQuote) * 100).toFixed(1) : "0.0";
  const clientPaid =
    trip.clientPmt === "Paid" ? clientQuote : trip.clientPmt === "Partially Paid" ? Math.round(clientQuote * 0.5) : 0;
  const clientBalance = clientQuote - clientPaid;

  const operatorAssigned = trip.operator !== "TBD";
  const operatorConfirmed = ["Confirmed", "In Flight", "Completed"].includes(trip.status);
  const itinerarySent = operatorConfirmed;
  const paymentReceived = trip.clientPmt === "Paid";
  const clientConfirmed = trip.status !== "Requested";

  const from = airportInfo(trip.from);
  const to = airportInfo(trip.to);
  const tripType = trip.return === "---" ? "One Way" : "Round Trip";

  return {
    ...trip,
    tripType,
    passengers: 4,
    departureTime: `${trip.departure} · 10:00`,
    arrivalTime: `${trip.departure} · 12:45`,
    fromCode: trip.from,
    toCode: trip.to,
    from,
    to,
    flightInformation: {
      estimatedFlightTime: "2h 45m",
      estimatedArrival: "18:15 ET",
      confirmedFlightTime: "2h 38m",
      confirmedArrival: "18:08 ET",
    },
    financial: {
      clientQuote: formatCurrency(clientQuote),
      clientPaid: formatCurrency(clientPaid),
      clientBalance: formatCurrency(clientBalance),
      operatorCost: formatCurrency(operatorCost),
      grossProfit: formatCurrency(profit),
      margin: `${margin}%`,
      fet: formatCurrency(fet),
      brokerCommission: formatCurrency(brokerCommission),
    },
    confirmation: [
      { label: "Client confirmed", done: clientConfirmed },
      { label: "Aircraft assigned", done: operatorAssigned },
      { label: "Operator confirmed", done: operatorConfirmed },
      { label: "Itinerary sent", done: itinerarySent },
      { label: "Payment received", done: paymentReceived },
    ],
    documents: [
      { label: "Quote", available: true },
      { label: "Itinerary", available: itinerarySent },
      { label: "Invoice", available: trip.clientPmt !== "Pending" },
      { label: "Payment Receipt", available: paymentReceived },
    ],
    notes: {
      internal: `${trip.client} prefers morning departures. Always book catering. Strongly prefers ${trip.operator} as operator.`,
      client: "No client notes.",
    },
    activity: [
      { actor: trip.broker, action: `created operation ${trip.id}`, at: `${trip.departure} · 09:00` },
      { actor: trip.operator, action: "operator confirmation sent", at: `${trip.departure} · 11:30` },
    ],
    currentStepIndex: STATUS_STEP_INDEX[trip.status] ?? 0,
  };
}
