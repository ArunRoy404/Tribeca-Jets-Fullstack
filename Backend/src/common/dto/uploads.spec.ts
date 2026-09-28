import { describe, expect, it } from 'vitest';
import { uploadUrl } from './uploads.js';

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b';

describe('uploadUrl', () => {
  it('accepts the relative URL the uploads surface returns', () => {
    expect(uploadUrl.parse(`/api/uploads/${ID}`)).toBe(`/api/uploads/${ID}`);
  });

  it('trims before checking', () => {
    expect(uploadUrl.parse(`  /api/uploads/${ID}  `)).toBe(`/api/uploads/${ID}`);
  });

  it.each([
    [`http://localhost:4000/api/uploads/${ID}`, 'an absolute URL to this API'],
    ['https://example.com/g550.jpg', 'somewhere else entirely'],
    [`/api/uploads/${ID}/meta`, 'a sub-route rather than the file'],
    ['/api/uploads/not-a-uuid', 'an id that is not a uuid'],
    ['', 'an empty string'],
  ])('refuses %s (%s)', (value) => {
    expect(uploadUrl.safeParse(value).success).toBe(false);
  });
});
