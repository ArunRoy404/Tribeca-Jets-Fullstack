#!/usr/bin/env python3
"""
Builds `05 · Airports`, capturing every example from a live API.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_airports_folder.py
    cd postman && python3 rewrite_body_comments.py

Replaces the airports half of `build_reference_folders.py`, whose examples
were read from a capture directory on another machine and could not be
re-run. That builder still writes `06 · Operators` until Operators' review.

Reads need only a session and writes need the caller's own Airports
permission (owner's rule, 8 Oct 2026), so the refusals are captured from the
seeded broker — whose default set holds Airports · View only — and the
open reads from the broker and the referral agent.

Everything the capture creates is archived again at the end, and the Newman
run archives its own probe in `11 · Teardown`: no seeded airport is changed.
"""

from __future__ import annotations

import json
import pathlib
import random
import string

from builder_common import MISSING, WRITE_HEADERS, Session, ensure_variables, example, script, status_test, url
from collection_order import place_folder
from session_setup import with_session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
OWNER = 'admin@example.com'
BROKER = 'broker@example.com'
AGENT = 'agent@example.com'

FOLDER_DOC = """Airports are **shared reference data**: the same rows for everyone, because nobody owns an airport.

### Who may do what (since 8 Oct 2026)

| | Needs |
|---|---|
| List, stats, countries, one airport | **A session only** — about eight forms pick an airport (clients, aircraft, trip requests, trips, quotes, empty legs, leads, the instant estimate, the referral portal) |
| Add | `Airports · Create` in the caller's own permissions |
| Edit | `Airports · Edit` |
| Remove, restore, bulk remove / restore | `Airports · Archive` |

Permissions are per person (Users & Roles › Permissions), not per role: a broker holds Airports · View by default and may be given Add and Edit; Archive is for administrators. Opening the Airports *screen* is Airports · View — a frontend gate, since the data itself is open to every signed-in user.

This folder runs as the seeded owner; the refusals were captured as the seeded broker."""

QUERY = [
    {'key': 'page', 'value': '1', 'description': 'Page number, 1-based. Integer ≥1. Default 1. Out of range returns an empty `data` with a truthful `meta`.'},
    {'key': 'limit', 'value': '10', 'description': 'Rows per page. Integer 1-100. Default 10, matching the rows-per-page dropdown in the UI. >100 or <1 → 400.'},
    {'key': 'search', 'value': '', 'disabled': True, 'description': 'Case-insensitive substring across ICAO, IATA, name, city and country. Trimmed, max 200 chars.'},
    {'key': 'country', 'value': '', 'disabled': True, 'description': 'Exact match on the stored country string, case-sensitive (`USA`, not `usa`). Options come from `03 · Countries`. Omit for all countries.'},
    {'key': 'sortBy', 'value': 'createdAt', 'description': 'Allowed (case-sensitive): createdAt | updatedAt | icao | iata | name | city | country | longestRunwayFt. Default createdAt, paired with sortOrder desc, so a newly added airport is the first row. Anything else → 400.'},
    {'key': 'sortOrder', 'value': 'desc', 'description': 'Allowed (case-sensitive): asc | desc. Default desc — tables open newest-first.'},
    {'key': 'archived', 'value': 'false', 'disabled': True, 'description': 'Allowed (case-sensitive): true | false. Default false — only live rows. `true` returns ONLY archived ones, which is what the Archived tab reads.'},
]

CREATE_BODY = """{
  "icao": "{{newAirportIcao}}",                      // required · 4 letters or digits, stored upper-case. Unique across live AND archived rows → a duplicate returns 409.
  "iata": "BED",                                     // optional · 3 letters or digits, stored upper-case. Many airports have none.
  "name": "Laurence G Hanscom Field",                // required · 1-200 chars
  "city": "Bedford",                                 // required · 1-120 chars
  "state": "MA",                                     // optional · max 60 chars. Most countries outside the US use none.
  "country": "USA",                                  // required · 1-100 chars. The exact string the country filter matches.
  "latitude": 42.47,                                 // required · signed decimal degrees, -90..90
  "longitude": -71.289,                              // required · signed decimal degrees, -180..180
  "longestRunwayFt": 7011,                           // required · integer feet, 0-30000. Decides which aircraft can operate here.
  "assignedFbo": "Signature Flight Support",         // optional · max 200 chars. The FBO itineraries default to here.
  "notes": "Boston-area business aviation gateway."  // optional · max 2000 chars. Curfews, slots, customs hours.
}"""

PATCH_DOC = """// All fields optional · send at least one, or 400.
  // icao may be corrected; a new code must still be unique.
  // null clears iata, state, assignedFbo or notes. latitude, longitude
  // and longestRunwayFt are required on create, so they can be changed
  // but never cleared — null or "" is a 400."""


def fresh_icao() -> str:
    return 'Q' + ''.join(random.choice(string.ascii_uppercase) for _ in range(3))


def capture() -> dict:
    owner, broker, agent, anonymous = Session(OWNER), Session(BROKER), Session(AGENT), Session(None)
    cap: dict = {}

    cap['list'] = owner.request('GET', '/airports?page=1&limit=3')
    cap['list_broker'] = broker.request('GET', '/airports?page=1&limit=2')
    cap['list_agent'] = agent.request('GET', '/airports?search=KTEB')
    cap['list_sort'] = owner.request('GET', '/airports?sortBy=elevation')
    cap['list_limit'] = owner.request('GET', '/airports?limit=500')
    cap['list_401'] = anonymous.request('GET', '/airports')

    cap['stats'] = owner.request('GET', '/airports/stats')
    cap['countries'] = owner.request('GET', '/airports/countries')

    seeded = cap['list'][1]['data'][0]
    cap['detail'] = owner.request('GET', f"/airports/{seeded['id']}")
    cap['detail_agent'] = agent.request('GET', f"/airports/{seeded['id']}")
    cap['detail_404'] = owner.request('GET', f'/airports/{MISSING}')

    # A probe airport this capture owns, so no seeded row is ever written.
    body = json.loads('\n'.join(line.split('//')[0] for line in CREATE_BODY.splitlines())
                      .replace('{{newAirportIcao}}', fresh_icao()))
    cap['create_body'] = body
    cap['create'] = owner.request('POST', '/airports', body)
    probe = cap['create'][1]['data']
    try:
        cap['create_409'] = owner.request('POST', '/airports', {**body, 'icao': seeded['icao']})
        cap['create_400'] = owner.request('POST', '/airports', {'icao': 'TOOLONG', 'name': '', 'city': 'X', 'country': 'USA'})
        cap['create_403'] = broker.request('POST', '/airports', {**body, 'icao': fresh_icao()})

        cap['patch_body'] = {'longestRunwayFt': 7011, 'assignedFbo': 'Jet Aviation Bedford'}
        cap['patch'] = owner.request('PATCH', f"/airports/{probe['id']}", cap['patch_body'])
        cap['patch_empty'] = owner.request('PATCH', f"/airports/{probe['id']}", {})
        cap['patch_clear'] = owner.request('PATCH', f"/airports/{probe['id']}", {'latitude': None})
        cap['patch_403'] = broker.request('PATCH', f"/airports/{probe['id']}", cap['patch_body'])

        cap['remove_403'] = broker.request('DELETE', f"/airports/{probe['id']}")
        cap['remove'] = owner.request('DELETE', f"/airports/{probe['id']}")
        cap['create_409_archived'] = owner.request('POST', '/airports', body)
        cap['restore_403'] = broker.request('POST', f"/airports/{probe['id']}/restore")
        cap['restore'] = owner.request('POST', f"/airports/{probe['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/airports/{probe['id']}/restore")

        ids = {'ids': [probe['id']]}
        cap['bulk_ids'] = ids
        cap['bulk_remove_403'] = broker.request('POST', '/airports/bulk-delete', ids)
        cap['bulk_remove'] = owner.request('POST', '/airports/bulk-delete', ids)
        cap['bulk_remove_partial'] = owner.request('POST', '/airports/bulk-delete', ids)
        cap['bulk_remove_400'] = owner.request('POST', '/airports/bulk-delete', {'ids': []})
        cap['bulk_restore_403'] = broker.request('POST', '/airports/bulk-restore', ids)
        cap['bulk_restore'] = owner.request('POST', '/airports/bulk-restore', ids)
        cap['bulk_restore_partial'] = owner.request('POST', '/airports/bulk-restore', ids)
        cap['bulk_restore_400'] = owner.request('POST', '/airports/bulk-restore', {'ids': []})
    finally:
        # The run is a demonstration: the probe ends archived, never live.
        cap['teardown'] = owner.request('DELETE', f"/airports/{probe['id']}")
    return cap


def request(name, method, path, description, responses, *, query=None, body=None, events=None):
    item = {'name': name, 'request': {
        'method': method, 'header': WRITE_HEADERS if method != 'GET' else [],
        'url': url(path, query), 'description': description,
    }, 'response': responses}
    if body is not None:
        item['request']['body'] = {'mode': 'raw', 'raw': body, 'options': {'raw': {'language': 'json'}}}
    if events:
        item['event'] = events
    return item


def build(cap: dict) -> dict:
    probe_path = '/airports/{{newAirportId}}'
    patch_raw = '{\n  ' + PATCH_DOC + '\n\n  "longestRunwayFt": 7011,\n  "assignedFbo": "Jet Aviation Bedford"\n}'
    bulk_raw = '{\n  "ids": ["{{newAirportId}}"]  // required · 1-100 UUIDs. Ids that match nothing come back in `skipped` rather than failing the batch.\n}'
    created_icao = cap['create_body']['icao']
    return {
        'name': '05 · Airports',
        'description': FOLDER_DOC,
        'item': [
            request(
                '01 · List airports', 'GET', '/airports',
                'Paginated list. **Any signed-in user** — the pickers read it. Search covers ICAO, IATA, '
                'name, city and country in one term. `latitude` and `longitude` are JSON numbers.\n\n'
                'See the Params tab for every filter, its default and its bounds.',
                [
                    example('200 · Page of airports', 'GET', '/airports?page=1&limit=3', *cap['list']),
                    example('200 · A broker (reads need only a session)', 'GET', '/airports?page=1&limit=2', *cap['list_broker']),
                    example('200 · The referral agent, searching for the submit form', 'GET', '/airports?search=KTEB', *cap['list_agent']),
                    example('400 · Unsortable column', 'GET', '/airports?sortBy=elevation', *cap['list_sort']),
                    example('400 · Limit above the cap', 'GET', '/airports?limit=500', *cap['list_limit']),
                    example('401 · Not signed in', 'GET', '/airports', *cap['list_401']),
                ],
                query=QUERY,
                events=[script('test', [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "// 04 reads a real airport; taking it from here keeps the folder runnable alone.",
                    "const rows = pm.response.json().data;",
                    "pm.test('rows', () => pm.expect(rows).to.be.an('array').that.is.not.empty);",
                    "pm.collectionVariables.set('airportId', rows[0].id);",
                ])],
            ),
            request(
                '02 · Airport stats', 'GET', '/airports/stats',
                'The four tiles above the table. `domestic` counts rows whose country equals `homeCountry`; '
                '`international` is the remainder. `withAssignedFbo` ignores an FBO saved blank.',
                [example('200 · Stats', 'GET', '/airports/stats', *cap['stats'])],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '03 · Countries', 'GET', '/airports/countries',
                'Distinct countries across live airports, alphabetical — the `country` filter\'s options, '
                'from the data rather than a list in the UI.',
                [example('200 · Countries', 'GET', '/airports/countries', *cap['countries'])],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '04 · Get airport', 'GET', '/airports/{{airportId}}',
                'One airport with its audit trail. Archived airports open too — the Archived tab links here.\n\n'
                '`trips` counts **live, uncancelled trips with a leg departing from or arriving here** '
                '(`total`, and `thisYear` by departure date); a round trip counts once. It is `null` for a '
                'referral agent, who reads airports only to pick one.',
                [
                    example('200 · Airport', 'GET', '/airports/:id', *cap['detail']),
                    example('200 · The referral agent (no trip count)', 'GET', '/airports/:id', *cap['detail_agent']),
                    example('404 · Not found', 'GET', '/airports/:id', *cap['detail_404']),
                ],
                events=[script('test', [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "pm.test('carries the trip count', () => pm.expect(pm.response.json().data).to.have.property('trips'));",
                ])],
            ),
            request(
                '05 · Add airport', 'POST', '/airports',
                'Needs **Airports · Create**. ICAO is upper-cased and unique across live **and archived** '
                'rows: re-adding an archived code is a 409 that names the Archived tab, because restoring '
                'brings back every stored field and re-creating would overwrite them.',
                [
                    example('201 · Created', 'POST', '/airports', *cap['create'], req_body=cap['create_body']),
                    example('409 · ICAO already in use', 'POST', '/airports', *cap['create_409']),
                    example('409 · ICAO held by an archived airport', 'POST', '/airports', *cap['create_409_archived'],
                            req_body={'icao': created_icao, '…': 'the same body'}),
                    example('400 · Validation failed', 'POST', '/airports', *cap['create_400'],
                            req_body={'icao': 'TOOLONG', 'name': '', 'city': 'X', 'country': 'USA'}),
                    example('403 · A broker without Airports · Create', 'POST', '/airports', *cap['create_403']),
                ],
                body=CREATE_BODY,
                events=[
                    script('prerequest', [
                        "// A code this run has not used: an archived ICAO stays taken, so a",
                        "// fixed one would 409 on the second run.",
                        "const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';",
                        "let code = 'Q';",
                        "for (let i = 0; i < 3; i++) code += letters[Math.floor(Math.random() * letters.length)];",
                        "pm.collectionVariables.set('newAirportIcao', code);",
                    ]),
                    script('test', [
                        "pm.test('201 Created', () => pm.response.to.have.status(201));",
                        "// 06-10 work on this probe, so the run never touches a seeded airport.",
                        "if (pm.response.code === 201) pm.collectionVariables.set('newAirportId', pm.response.json().data.id);",
                    ]),
                ],
            ),
            request(
                '06 · Update airport', 'PATCH', probe_path,
                'Needs **Airports · Edit**. Send only what changes. An empty body is a 400, and so is '
                'clearing latitude, longitude or runway length — required on create, so never emptied on edit.',
                [
                    example('200 · Updated', 'PATCH', '/airports/:id', *cap['patch'], req_body=cap['patch_body']),
                    example('400 · Empty patch', 'PATCH', '/airports/:id', *cap['patch_empty'], req_body={}),
                    example('400 · A required number cleared', 'PATCH', '/airports/:id', *cap['patch_clear'],
                            req_body={'latitude': None}),
                    example('403 · A broker without Airports · Edit', 'PATCH', '/airports/:id', *cap['patch_403'],
                            req_body=cap['patch_body']),
                ],
                body=patch_raw,
                events=[status_test(200, '200 OK')],
            ),
            request(
                '07 · Remove airport (soft)', 'DELETE', probe_path,
                'Needs **Airports · Archive**. Soft: `deletedAt` is stamped and the row stays, so trips and '
                'itineraries through it keep their history. The ICAO stays taken.',
                [
                    example('204 · Removed', 'DELETE', '/airports/:id', *cap['remove']),
                    example('403 · A broker without Airports · Archive', 'DELETE', '/airports/:id', *cap['remove_403']),
                ],
                events=[status_test(204, '204 No Content')],
            ),
            request(
                '08 · Restore airport', 'POST', probe_path + '/restore',
                'Needs **Airports · Archive**. Clears the deletion stamp and nothing else — every field comes '
                'back as it was. 200, not 201: nothing is created. A row that is not archived is a 404.',
                [
                    example('200 · Restored', 'POST', '/airports/:id/restore', *cap['restore']),
                    example('404 · Not archived', 'POST', '/airports/:id/restore', *cap['restore_404']),
                    example('403 · A broker without Airports · Archive', 'POST', '/airports/:id/restore', *cap['restore_403']),
                ],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '09 · Remove several airports (soft)', 'POST', '/airports/bulk-delete',
                'Needs **Airports · Archive**. For the table\'s checkbox column. POST, not DELETE (a dropped '
                'DELETE body would remove nothing and answer 200). Ids that match nothing come back in '
                '`skipped` — partial success is success.',
                [
                    example('200 · Removed', 'POST', '/airports/bulk-delete', *cap['bulk_remove'], req_body=cap['bulk_ids']),
                    example('200 · Already removed (partial)', 'POST', '/airports/bulk-delete', *cap['bulk_remove_partial'],
                            req_body=cap['bulk_ids']),
                    example('400 · Nothing selected', 'POST', '/airports/bulk-delete', *cap['bulk_remove_400'], req_body={'ids': []}),
                    example('403 · A broker without Airports · Archive', 'POST', '/airports/bulk-delete',
                            *cap['bulk_remove_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw,
                events=[status_test(200, '200 OK')],
            ),
            request(
                '10 · Restore several airports', 'POST', '/airports/bulk-restore',
                'Needs **Airports · Archive**. The Archived tab\'s bulk action, the mirror of `09`. Ids that '
                'are not archived come back in `skipped`.',
                [
                    example('200 · Restored', 'POST', '/airports/bulk-restore', *cap['bulk_restore'], req_body=cap['bulk_ids']),
                    example('200 · Already live (partial)', 'POST', '/airports/bulk-restore', *cap['bulk_restore_partial'],
                            req_body=cap['bulk_ids']),
                    example('400 · Nothing selected', 'POST', '/airports/bulk-restore', *cap['bulk_restore_400'], req_body={'ids': []}),
                    example('403 · A broker without Airports · Archive', 'POST', '/airports/bulk-restore',
                            *cap['bulk_restore_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw.replace('Ids that match nothing', 'Ids that are not archived'),
                events=[status_test(200, '200 OK')],
            ),
            # A request of its own, not a script fired as the run ends: run
            # alone, Newman could stop before such a script's call finished
            # and leave the probe live (the Q-code airports, 8 Oct 2026).
            request(
                '11 · Teardown — archive the probe', 'DELETE', probe_path,
                'The run is a demonstration: the probe ends archived, in the Archived tab, never live.',
                [example('204 · Archived', 'DELETE', '/airports/:id', *cap['teardown'])],
                events=[script('test', [
                    "pm.test('archived', () => pm.response.to.have.status(204));",
                    "pm.collectionVariables.set('newAirportId', '');",
                ])],
            ),
        ],
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {'airportId': '', 'newAirportId': '', 'newAirportIcao': ''})
    folder = with_session(build(capture()), 'owner')
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
