import { describe, expect, it } from 'vitest';
import {
  formatDay,
  formatMoney,
  formatRoute,
  formatTime,
  mergeTokens,
  renderMerge,
  unknownTokens,
} from './email.merge.js';
import { MERGE_FIELDS } from './email.fields.js';

describe('mergeTokens', () => {
  it('lists each snake_case token once, in order', () => {
    expect(mergeTokens('Dear {client_name}, {route} for {client_name}')).toEqual(['client_name', 'route']);
  });

  it('ignores braces around anything that is not a token', () => {
    expect(mergeTokens('{See attached} {Client_Name} {1st} { route }')).toEqual([]);
  });
});

describe('unknownTokens', () => {
  it('names a token the catalogue does not have, across subject and body', () => {
    expect(unknownTokens('Trip {trip_id}', 'Dear {client_nme}, {agent_name}')).toEqual(['client_nme', 'agent_name']);
  });

  it('accepts every catalogued field', () => {
    expect(unknownTokens(MERGE_FIELDS.map((f) => `{${f.key}}`).join(' '))).toEqual([]);
  });
});

describe('renderMerge', () => {
  it('fills every field that has a value', () => {
    expect(renderMerge('Dear {client_first_name}, {trip_id} is confirmed.', { client_first_name: 'Mark', trip_id: 'TJ-1048' })).toEqual({
      text: 'Dear Mark, TJ-1048 is confirmed.',
      missing: [],
    });
  });

  it('leaves a field with no value as its token and reports it — never blank, never guessed', () => {
    const result = renderMerge('Flying {departure_date} on {tail_number}.', { departure_date: 'Aug 12, 2026', tail_number: null });
    expect(result.text).toBe('Flying Aug 12, 2026 on {tail_number}.');
    expect(result.missing).toEqual(['tail_number']);
  });

  it('treats an empty string as missing', () => {
    expect(renderMerge('{client_name}', { client_name: '' }).missing).toEqual(['client_name']);
  });

  it('reports a field once however often it appears', () => {
    expect(renderMerge('{route} and {route}', {}).missing).toEqual(['route']);
  });

  it('leaves an unknown token alone and does not report it as missing', () => {
    expect(renderMerge('{not_a_field}', {})).toEqual({ text: '{not_a_field}', missing: [] });
  });

  it('is idempotent on text that is already filled', () => {
    const once = renderMerge('Dear {client_name}', { client_name: 'Aria Holdings' }).text;
    expect(renderMerge(once, { client_name: 'Someone Else' }).text).toBe('Dear Aria Holdings');
  });
});

describe('formatting', () => {
  it('money in US dollars, and null for no figure rather than $0.00', () => {
    expect(formatMoney(85463)).toBe('$85,463.00');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(null)).toBeNull();
    expect(formatMoney(Number.NaN)).toBeNull();
  });

  it('a calendar day in UTC, so midnight UTC stays that day', () => {
    expect(formatDay(new Date('2026-08-12T00:00:00.000Z'))).toBe('Aug 12, 2026');
    expect(formatDay(null)).toBeNull();
    expect(formatDay('not a date')).toBeNull();
  });

  it('a 24-hour time as 12-hour', () => {
    expect(formatTime('14:30')).toBe('2:30 PM');
    expect(formatTime('00:05')).toBe('12:05 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime(null)).toBeNull();
    expect(formatTime('2pm')).toBeNull();
  });

  it('a route through every leg, and null when a stop is unknown', () => {
    const legs = [
      { originAirport: { icao: 'KTEB' }, destinationAirport: { icao: 'KMIA' } },
      { originAirport: { icao: 'KMIA' }, destinationAirport: { icao: null, iata: 'TEB' } },
    ];
    expect(formatRoute(legs)).toBe('KTEB → KMIA → TEB');
    expect(formatRoute([])).toBeNull();
    expect(formatRoute([{ originAirport: null, destinationAirport: { icao: 'KMIA' } }])).toBeNull();
  });
});
