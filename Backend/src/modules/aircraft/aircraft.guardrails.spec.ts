import { describe, expect, it } from 'vitest';
import { createAircraftSchema, updateAircraftSchema } from './dto/aircraft.dto.js';
import { inviteUserSchema } from '../users/dto/user.dto.js';
import { AircraftCategory } from '../../generated/prisma/enums.js';

describe('Aircraft validation guardrails (QA remediation)', () => {
  const currentYear = new Date().getFullYear();

  it('rejects an aircraft built in the future', () => {
    const parsed = createAircraftSchema.safeParse({
      tailNumber: 'N100TJ',
      model: 'Challenger 350',
      category: AircraftCategory.SUPER_MIDSIZE,
      yearBuilt: currentYear + 1,
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts an aircraft built in the current year or past', () => {
    const parsed = createAircraftSchema.safeParse({
      tailNumber: 'N100TJ',
      model: 'Challenger 350',
      category: AircraftCategory.SUPER_MIDSIZE,
      yearBuilt: currentYear,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects empty weight greater than or equal to max takeoff weight', () => {
    const parsed = createAircraftSchema.safeParse({
      tailNumber: 'N100TJ',
      model: 'Challenger 350',
      category: AircraftCategory.SUPER_MIDSIZE,
      emptyWeightLb: 35_000,
      maxTakeoffWeightLb: 30_000,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('Empty weight must be strictly less than maximum takeoff weight');
    }
  });

  it('accepts empty weight strictly less than max takeoff weight', () => {
    const parsed = createAircraftSchema.safeParse({
      tailNumber: 'N100TJ',
      model: 'Challenger 350',
      category: AircraftCategory.SUPER_MIDSIZE,
      emptyWeightLb: 24_000,
      maxTakeoffWeightLb: 40_000,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects update when empty weight is equal or higher than max takeoff weight', () => {
    const parsed = updateAircraftSchema.safeParse({
      emptyWeightLb: 50_000,
      maxTakeoffWeightLb: 45_000,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('User phone validation guardrail (QA remediation)', () => {
  it('rejects non-phone strings', () => {
    const parsed = inviteUserSchema.safeParse({
      email: 'pilot@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: 'invalid-phone-xyz',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts standard formatted phone numbers', () => {
    const parsed = inviteUserSchema.safeParse({
      email: 'pilot@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1 (212) 555-0100',
    });
    expect(parsed.success).toBe(true);
  });
});
