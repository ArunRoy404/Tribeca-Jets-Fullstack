import { z } from 'zod';
import { createZodDto } from '../../../common/dto/zod-dto.js';
import { calendarDate } from '../../../common/dto/dates.js';
import {
  paginationSchema,
  sortableBy,
} from '../../../common/dto/pagination.dto.js';
import { archiveQuerySchema } from '../../../common/database/archive.js';
import {
  nullableNumber,
  optionalNumber,
} from '../../../common/dto/numbers.js';
import {
  AircraftCategory,
  AircraftStatus,
} from '../../../generated/prisma/enums.js';

/** Columns a caller may sort by. See `sortableBy` for why it is a closed list. */
export const AIRCRAFT_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'tailNumber',
  'model',
  'category',
  'status',
  'maxPassengers',
  'rangeNm',
  'yearBuilt',
] as const;

/**
 * Bounds that exist to catch a typo, not to model aviation.
 *
 * A tail with 2,000 seats or a 1907 build year is a slipped keystroke, and
 * storing it silently is worse than a 400 — the number goes on to a quote. The
 * ceilings are set well above anything in charter service so a genuinely
 * unusual airframe still fits.
 */
const PASSENGERS = { min: 1, max: 200, int: true };
const RANGE_NM = { min: 1, max: 20_000, int: true };
const YEAR = { min: 1950, max: 2100, int: true };
const CEILING_FT = { min: 0, max: 100_000, int: true };
const BAGGAGE_CU_FT = { min: 0, max: 5_000, int: true };
const CABIN_LENGTH_FT = { min: 0, max: 300 };
const WEIGHT_LB = { min: 0, max: 2_000_000, int: true };
const FUEL_GAL = { min: 0, max: 100_000, int: true };
const DISTANCE_FT = { min: 0, max: 30_000, int: true };

/**
 * Cabin features, shown as chips on the detail page.
 *
 * Capped in both directions, as the operator module's chip lists are: without
 * a length cap one request stores a megabyte in an array column, and without
 * an item cap the card renders a wall of chips over the rest of the page.
 */
const amenityList = z.array(z.string().trim().min(1).max(60)).max(30);

/**
 * Registrations are case-insensitive in practice and upper-case on the
 * aircraft, so they are normalised on the way in — the same rule as an
 * airport's ICAO, and for the same reason: `n780ex` and `N780EX` must not
 * become two rows for one airframe.
 *
 * Letters, digits and hyphens only: registrations outside the US carry one
 * ("G-ABCD", "D-AXYZ").
 */
const tailNumber = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, 'Tail number is required')
  .max(12)
  .regex(
    /^[A-Z0-9-]+$/,
    'A tail number contains only letters, digits and hyphens',
  );

export const queryAircraftSchema = paginationSchema
  .extend({
    /** Filter to one status. Omit for all. */
    status: z.enum(AircraftStatus).optional(),
    /** Filter to one size class. Omit for all. */
    category: z.enum(AircraftCategory).optional(),
    /** Only this operator's fleet. Also what the operator detail page reads. */
    operatorId: z.uuid().optional(),
    /** Only aircraft based at this airport. */
    homeBaseId: z.uuid().optional(),

    /**
     * The fleet finder, from §6.8 of the scope: passenger-capacity and
     * cabin-preference filtering.
     *
     * These are "at least" bounds rather than exact matches, because the
     * question a broker actually asks is "what can carry nine people to
     * Aspen" — an aircraft with more seats or more range still answers it.
     * A tail with the figure missing is excluded rather than assumed to fit:
     * an unknown capacity is not a capacity.
     */
    minPassengers: optionalNumber(
      'Minimum passengers must be a whole number',
      PASSENGERS,
    ),
    minRangeNm: optionalNumber(
      'Minimum range must be a whole number of nautical miles',
      RANGE_NM,
    ),

    /**
     * Cabin preferences the aircraft must have **all** of, comma separated
     * ("WiFi,Full Galley"). All, not any: a preference the client asked for
     * is a requirement, and an aircraft missing one is not a weaker match but
     * a wrong one.
     */
    amenities: z
      .string()
      .trim()
      .max(400)
      .optional()
      .transform((value) =>
        value
          ? value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
      ),

    sortBy: sortableBy(AIRCRAFT_SORTABLE_FIELDS),
  })
  .merge(archiveQuerySchema);

export type QueryAircraftInput = z.infer<typeof queryAircraftSchema>;
export class QueryAircraftDto extends createZodDto(queryAircraftSchema) {}

export const createAircraftSchema = z.object({
  /**
   * Required: the tail number is how the desk identifies an airframe and the
   * model alone does not distinguish two G550s, while the category decides
   * which requests this aircraft can answer at all.
   *
   * Everything below stays optional. A tail is usually catalogued from a
   * sourcing call with the model and little else, and demanding a full
   * specification sheet up front only produces invented numbers — which is
   * exactly what the screen used to display.
   */
  tailNumber,
  model: z.string().trim().min(1, 'Aircraft model is required').max(120),
  category: z.enum(AircraftCategory, 'Choose an aircraft category'),

  status: z.enum(AircraftStatus).default(AircraftStatus.AVAILABLE),
  manufacturer: z.string().trim().max(120).optional(),

  /** Null is "Unassigned", which the Add form offers explicitly. */
  operatorId: z.uuid().nullable().optional(),
  homeBaseId: z.uuid().nullable().optional(),

  maxPassengers: optionalNumber('Passengers must be a whole number', PASSENGERS),
  rangeNm: optionalNumber('Range must be a whole number of nautical miles', RANGE_NM),
  yearBuilt: optionalNumber('Year built must be a four-digit year', YEAR),

  /** Free text: jets are quoted in Mach, turboprops in knots. */
  maxSpeed: z.string().trim().max(40).optional(),
  cruiseSpeed: z.string().trim().max(40).optional(),

  serviceCeilingFt: optionalNumber('Service ceiling must be in feet', CEILING_FT),
  baggageCapacityCuFt: optionalNumber('Baggage capacity must be in cubic feet', BAGGAGE_CU_FT),
  cabinLengthFt: optionalNumber('Cabin length must be in feet', CABIN_LENGTH_FT),
  maxTakeoffWeightLb: optionalNumber('Max takeoff weight must be in pounds', WEIGHT_LB),
  emptyWeightLb: optionalNumber('Empty weight must be in pounds', WEIGHT_LB),
  fuelCapacityGal: optionalNumber('Fuel capacity must be in gallons', FUEL_GAL),
  takeoffDistanceFt: optionalNumber('Takeoff distance must be in feet', DISTANCE_FT),
  landingDistanceFt: optionalNumber('Landing distance must be in feet', DISTANCE_FT),

  amenities: amenityList.default([]),

  lastInspectionAt: calendarDate.optional(),
  lastAnnualAt: calendarDate.optional(),
  nextInspectionDueAt: calendarDate.optional(),

  notes: z.string().trim().max(2_000).optional(),
});

export type CreateAircraftInput = z.infer<typeof createAircraftSchema>;
export class CreateAircraftDto extends createZodDto(createAircraftSchema) {}

/**
 * Every field optional — this is a PATCH.
 *
 * `amenities` is replaced wholesale rather than merged, like the operator
 * module's chip lists: the UI edits it as one field, so what the user typed is
 * the complete list, and a merge would make removing a chip impossible.
 */
export const updateAircraftSchema = z
  .object({
    tailNumber: tailNumber.optional(),
    model: z.string().trim().min(1).max(120).optional(),
    category: z.enum(AircraftCategory).optional(),
    status: z.enum(AircraftStatus).optional(),
    manufacturer: z.string().trim().max(120).nullable().optional(),

    operatorId: z.uuid().nullable().optional(),
    homeBaseId: z.uuid().nullable().optional(),

    maxPassengers: nullableNumber('Passengers must be a whole number', PASSENGERS),
    rangeNm: nullableNumber('Range must be a whole number of nautical miles', RANGE_NM),
    yearBuilt: nullableNumber('Year built must be a four-digit year', YEAR),

    maxSpeed: z.string().trim().max(40).nullable().optional(),
    cruiseSpeed: z.string().trim().max(40).nullable().optional(),

    serviceCeilingFt: nullableNumber('Service ceiling must be in feet', CEILING_FT),
    baggageCapacityCuFt: nullableNumber('Baggage capacity must be in cubic feet', BAGGAGE_CU_FT),
    cabinLengthFt: nullableNumber('Cabin length must be in feet', CABIN_LENGTH_FT),
    maxTakeoffWeightLb: nullableNumber('Max takeoff weight must be in pounds', WEIGHT_LB),
    emptyWeightLb: nullableNumber('Empty weight must be in pounds', WEIGHT_LB),
    fuelCapacityGal: nullableNumber('Fuel capacity must be in gallons', FUEL_GAL),
    takeoffDistanceFt: nullableNumber('Takeoff distance must be in feet', DISTANCE_FT),
    landingDistanceFt: nullableNumber('Landing distance must be in feet', DISTANCE_FT),

    amenities: amenityList.optional(),

    lastInspectionAt: calendarDate.nullable().optional(),
    lastAnnualAt: calendarDate.nullable().optional(),
    nextInspectionDueAt: calendarDate.nullable().optional(),

    notes: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateAircraftInput = z.infer<typeof updateAircraftSchema>;
export class UpdateAircraftDto extends createZodDto(updateAircraftSchema) {}
