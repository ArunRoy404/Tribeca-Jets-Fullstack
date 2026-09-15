import { describe, expect, it } from 'vitest';
import { paginate } from './api.types.js';

describe('paginate', () => {
  it('computes page boundaries for a middle page', () => {
    const result = paginate([1, 2], 25, 2, 10);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrevious: true,
    });
  });

  it('flags the last page correctly', () => {
    expect(paginate([], 25, 3, 10).meta.hasNext).toBe(false);
  });

  it('handles an empty result set without dividing by zero', () => {
    const { meta } = paginate([], 0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrevious).toBe(false);
  });
});
