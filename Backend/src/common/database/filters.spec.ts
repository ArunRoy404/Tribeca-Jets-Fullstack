import { describe, expect, it } from 'vitest';
import { searchAcross, searchMatches } from './filters.js';

const contains = (value: string) => ({ contains: value, mode: 'insensitive' });
const name = ['firstName', 'lastName'];

describe('searchAcross', () => {
  it.each([undefined, '', ' \t '])('omits the filter for %j', (term) => {
    expect(searchAcross(term, name)).toEqual({});
  });

  it.each(['Elena', 'elena@example.com', 'TJ-11'])('keeps the phrase-only rule for %s', (term) => {
    expect(searchAcross(term, name)).toEqual({
      OR: [{ firstName: contains(term) }, { lastName: contains(term) }],
    });
  });

  it('keeps the phrase and lets each word match a different column', () => {
    expect(searchAcross('  Elena\tRostova ', name)).toEqual({
      OR: [
        { firstName: contains('Elena\tRostova') },
        { lastName: contains('Elena\tRostova') },
        { AND: [
          { OR: [{ firstName: contains('Elena') }, { lastName: contains('Elena') }] },
          { OR: [{ firstName: contains('Rostova') }, { lastName: contains('Rostova') }] },
        ] },
      ],
    });
  });

  it('keeps the exact phrase alternative for a phone with spaces', () => {
    expect(searchAcross('+1 555 0100', ['phone'])).toMatchObject({
      OR: [
        { phone: contains('+1 555 0100') },
        { AND: ['+1', '555', '0100'].map((word) => ({ OR: [{ phone: contains(word) }] })) },
      ],
    });
  });

  it('builds the same alternatives through relation paths', () => {
    const field = (key: string, word: string) => ({ client: { [key]: contains(word) } });
    expect(searchMatches('Elena Rostova', ['client.firstName', 'client.lastName'])).toEqual([
      field('firstName', 'Elena Rostova'),
      field('lastName', 'Elena Rostova'),
      { AND: ['Elena', 'Rostova'].map((word) => ({ OR: [field('firstName', word), field('lastName', word)] })) },
    ]);
  });

  it('bounds the word branch to six words and keeps longer phrases', () => {
    expect(searchMatches('one two three four five six', ['name'])[1]).toMatchObject({
      AND: ['one', 'two', 'three', 'four', 'five', 'six'].map((word) => ({ OR: [{ name: contains(word) }] })),
    });
    expect(searchMatches('one two three four five six seven', ['name']))
      .toEqual([{ name: contains('one two three four five six seven') }]);
  });
});
