import { formatDate, toArchiveFields } from "@/lib/archive";

/**
 * Display helpers for aircraft.
 *
 * The API returns enum constants (`ULTRA_LONG_RANGE`); the UI shows them as
 * words. Kept here rather than in a component so the table, the cards and the
 * detail page label them identically.
 */

const DASH = "—";

const CATEGORY_LABELS = {
  TURBOPROP: "Turboprop",
  LIGHT_JET: "Light Jet",
  MIDSIZE_JET: "Midsize Jet",
  SUPER_MIDSIZE: "Super Midsize",
  HEAVY_JET: "Heavy Jet",
  ULTRA_LONG_RANGE: "Ultra Long Range",
  VIP_AIRLINER: "VIP Airliner",
};

const STATUS_LABELS = {
  AVAILABLE: "Available",
  IN_SERVICE: "In Service",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
};

/**
 * Every category, for the table filter and the form's picker.
 *
 * Ordered smallest to largest rather than alphabetically — that is how a
 * broker thinks about which airframe answers a request.
 */
export const FILTERABLE_AIRCRAFT_CATEGORIES = [
  "TURBOPROP",
  "LIGHT_JET",
  "MIDSIZE_JET",
  "SUPER_MIDSIZE",
  "HEAVY_JET",
  "ULTRA_LONG_RANGE",
  "VIP_AIRLINER",
];

export const FILTERABLE_AIRCRAFT_STATUSES = [
  "AVAILABLE",
  "IN_SERVICE",
  "MAINTENANCE",
  "INACTIVE",
];

export function formatAircraftCategory(category) {
  if (!category) return "";
  return CATEGORY_LABELS[category] ?? category;
}

export function formatAircraftStatus(status) {
  if (!status) return "";
  return STATUS_LABELS[status] ?? status;
}

/** Thousands separators, so a 7,700 nm range does not read as 7700. */
function formatCount(value) {
  if (value === null || value === undefined || value === "") return DASH;
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : DASH;
}

/** A measurement with its unit, or an em dash when the field is empty. */
function formatMeasure(value, unit) {
  const formatted = formatCount(value);
  return formatted === DASH ? DASH : `${formatted} ${unit}`;
}

/** Free text passes through; empty becomes an em dash. */
function orDash(value) {
  return value === null || value === undefined || value === "" ? DASH : value;
}

/**
 * "Zurich (LSZH)" — how the desk refers to a base.
 *
 * Reads the related airport row rather than a stored string, so renaming an
 * airport cannot leave a stale name on the aircraft.
 */
export function formatHomeBase(airport) {
  if (!airport) return DASH;
  const city = airport.city || airport.name;
  return city ? `${city} (${airport.icao})` : airport.icao;
}

/**
 * The badge beside a maintenance date.
 *
 * Derived from the date against today, never stored: a stored "Scheduled" goes
 * stale the moment the date passes, and an inspection silently reads as
 * upcoming when it is in fact overdue.
 */
export function maintenanceState(value, { upcoming = false } = {}) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // Compare whole days in local time. An inspection due today is not overdue.
  const today = new Date();
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // A "last inspection" dated in the future has not happened, whatever the
  // field is called — almost always a typo, and "Completed" would state it as
  // fact. Both kinds of date read Scheduled until the day arrives.
  if (dueDay > nowDay) return "Scheduled";
  if (!upcoming) return "Completed";
  return dueDay < nowDay ? "Overdue" : "Scheduled";
}

/**
 * The three rows of the Maintenance tab.
 *
 * Only dates that exist are returned, so a fleet that has not been logged yet
 * shows an empty state rather than three em dashes pretending to be records.
 */
export function toMaintenanceSchedule(aircraft) {
  const rows = [
    { label: "Last Inspection", value: aircraft?.lastInspectionAt, upcoming: false },
    { label: "Last Annual", value: aircraft?.lastAnnualAt, upcoming: false },
    { label: "Next Inspection Due", value: aircraft?.nextInspectionDueAt, upcoming: true },
  ];

  return rows
    .filter((row) => Boolean(row.value))
    .map((row) => ({
      label: row.label,
      date: formatDate(row.value),
      status: maintenanceState(row.value, { upcoming: row.upcoming }),
    }));
}

/**
 * Maps one API aircraft onto the props the table, cards and detail page render.
 *
 * Nothing here invents a value. Every optional field falls back to an em dash
 * rather than a plausible-looking default: this screen used to show a
 * hardcoded "Mach 0.885" and "51,000 ft" for every tail in the fleet, which
 * looked exactly like real data and was not.
 *
 * `totalTrips`, `tripsThisYear` and `avgUtilization` are columns the design
 * calls for that nothing can supply yet — they are aggregates over trips,
 * which do not exist. The API returns null and they render as an em dash,
 * because a confident "0 trips" against a tail the desk has flown twelve times
 * is a wrong answer and "—" is an honest one.
 */
export function toAircraftRow(aircraft) {
  return {
    id: aircraft?.id,
    tailNumber: aircraft?.tailNumber ?? DASH,
    model: aircraft?.model ?? DASH,
    manufacturer: orDash(aircraft?.manufacturer),

    category: formatAircraftCategory(aircraft?.category),
    rawCategory: aircraft?.category ?? null,
    status: formatAircraftStatus(aircraft?.status),
    rawStatus: aircraft?.status ?? null,

    // The related rows, so the table can link rather than print a stale name.
    operator: aircraft?.operator?.name ?? "Unassigned",
    operatorId: aircraft?.operatorId ?? null,
    homeBase: formatHomeBase(aircraft?.homeBase),
    homeBaseId: aircraft?.homeBaseId ?? null,
    homeBaseIcao: aircraft?.homeBase?.icao ?? null,

    maxPassengers: formatCount(aircraft?.maxPassengers),
    rawMaxPassengers: aircraft?.maxPassengers ?? null,
    range: formatMeasure(aircraft?.rangeNm, "nm"),
    rawRangeNm: aircraft?.rangeNm ?? null,
    yearBuilt: aircraft?.yearBuilt ?? DASH,

    // Speeds are free text on the API — jets quote Mach, turboprops knots.
    maxSpeed: orDash(aircraft?.maxSpeed),
    cruiseSpeed: orDash(aircraft?.cruiseSpeed),

    serviceCeiling: formatMeasure(aircraft?.serviceCeilingFt, "ft"),
    baggageCapacity: formatMeasure(aircraft?.baggageCapacityCuFt, "cu ft"),
    cabinLength: formatMeasure(aircraft?.cabinLengthFt, "ft"),
    maxTakeoffWeight: formatMeasure(aircraft?.maxTakeoffWeightLb, "lb"),
    emptyWeight: formatMeasure(aircraft?.emptyWeightLb, "lb"),
    fuelCapacity: formatMeasure(aircraft?.fuelCapacityGal, "gal"),
    takeoffDistance: formatMeasure(aircraft?.takeoffDistanceFt, "ft"),
    landingDistance: formatMeasure(aircraft?.landingDistanceFt, "ft"),

    amenities: aircraft?.amenities ?? [],
    notes: aircraft?.notes ?? "",

    maintenance: toMaintenanceSchedule(aircraft),
    // The raw dates, for the edit form's date inputs.
    lastInspectionAt: aircraft?.lastInspectionAt ?? null,
    lastAnnualAt: aircraft?.lastAnnualAt ?? null,
    nextInspectionDueAt: aircraft?.nextInspectionDueAt ?? null,

    // Audit trail, present on every record in every module.
    createdAt: aircraft?.createdAt ?? null,
    updatedAt: aircraft?.updatedAt ?? null,

    // Archive trail: who removed it, who brought it back, and whether the
    // live row should carry the "Restored" badge.
    ...toArchiveFields(aircraft),

    // Awaiting the trips module.
    totalTrips: aircraft?.totalTrips ?? DASH,
    tripsThisYear: aircraft?.tripsThisYear ?? DASH,
    avgUtilization: aircraft?.avgUtilization ?? DASH,
    tripHistory: aircraft?.tripHistory ?? [],
  };
}
