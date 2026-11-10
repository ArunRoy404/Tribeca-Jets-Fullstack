import { describe, expect, it } from 'vitest';
import { queryTripRequestsSchema } from './dto/trip-request.dto.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('GET /trip-requests ?clientIds= (10 Nov 2026)', () => {
  it('takes several clients, comma-separated', () => {
    expect(queryTripRequestsSchema.parse({ clientIds: `${A}, ${B}` }).clientIds).toEqual([A, B]);
  });

  it('refuses a malformed id, an empty list and more than one page of clients', () => {
    expect(queryTripRequestsSchema.safeParse({ clientIds: `${A},nope` }).success).toBe(false);
    expect(queryTripRequestsSchema.safeParse({ clientIds: ',' }).success).toBe(false);
    expect(queryTripRequestsSchema.safeParse({ clientIds: Array(101).fill(A).join(',') }).success).toBe(false);
  });
});
