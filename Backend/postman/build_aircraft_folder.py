#!/usr/bin/env python3
"""
Builds `07 · Aircraft`, capturing every example from a live API.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_aircraft_folder.py
    cd postman && python3 rewrite_body_comments.py

Reads need only a staff session; writes need the caller's own Aircraft
permission. The seeded assistant holds Aircraft · View only, and the seeded
broker holds View, Create, and Edit — so they supply the 403 refusals;
the referral agent supplies the staff-only refusal (@StaffOnly on desk data).

The folder creates its own aircraft and archives it in its last request — a
request of its own, not an async script that fires as the run ends, which a folder
run alone could cut off and leave the probe live.
"""

from __future__ import annotations

import json
import pathlib
import random
import time

from builder_common import MISSING, WRITE_HEADERS, Session, ensure_variables, example, script, status_test, url
from collection_order import place_folder
from session_setup import with_session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
OWNER = 'admin@example.com'
BROKER = 'broker@example.com'
ASSISTANT = 'assistant@example.com'
AGENT = 'agent@example.com'

FOLDER_DOC = """The fleet: individual airframes, each belonging to an operator and usually based at an airport.

Both of those are real foreign keys, which is why Operators and Airports had to ship first — see AGENTS.md on build order. Quotes, trips, empty legs and flight tracking all reference this table.

### Who may do what (reviewed Module 8)

| | Needs |
|---|---|
| List, stats, cabin features, one aircraft | **A staff session only** — pickers and fleet searches across other modules rely on it |
| Add | `Aircraft · Create` in the caller's own permissions |
| Edit, status change | `Aircraft · Edit` |
| Remove, restore, bulk | `Aircraft · Archive` (administrators by default; broker lacks Archive by default) |

**A referral agent is refused every route** (403): the airframe fleet and its home bases are internal desk data.

### Fixed choices (case-sensitive)

| Field | Values |
|---|---|
| `category` | TURBOPROP · LIGHT_JET · MIDSIZE_JET · SUPER_MIDSIZE · HEAVY_JET · ULTRA_LONG_RANGE · VIP_AIRLINER |
| `status` | AVAILABLE · IN_SERVICE · MAINTENANCE · INACTIVE |

This folder runs as the seeded owner; refusals were captured as the assistant, the broker and the referral agent."""

SORTABLE = ('createdAt | updatedAt | tailNumber | model | category | status | '
            'maxPassengers | rangeNm | yearBuilt')
CATEGORIES = ('TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | '
              'ULTRA_LONG_RANGE | VIP_AIRLINER')
STATUSES = 'AVAILABLE | IN_SERVICE | MAINTENANCE | INACTIVE'

QUERY = [
    {'key': 'page', 'value': '1', 'description': 'Page number, 1-based. Integer ≥1. Default 1. Out of range returns an empty `data` with a truthful `meta`.'},
    {'key': 'limit', 'value': '10', 'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
    {'key': 'search', 'value': '', 'disabled': True, 'description': 'Case-insensitive substring across tail number, model, manufacturer, the operator\'s name and the home base\'s ICAO, name and city. Trimmed, max 200 chars.'},
    {'key': 'sortOrder', 'value': 'desc', 'description': 'Allowed (case-sensitive): asc | desc. Default desc — tables open newest-first.'},
    {'key': 'sortBy', 'value': 'createdAt', 'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt.'},
    {'key': 'status', 'value': '', 'disabled': True, 'description': f'Allowed (case-sensitive): {STATUSES}. Omit for all.'},
    {'key': 'category', 'value': '', 'disabled': True, 'description': f'Allowed (case-sensitive): {CATEGORIES}. Omit for all.'},
    {'key': 'operatorId', 'value': '', 'disabled': True, 'description': 'uuid. Only this operator\'s fleet.'},
    {'key': 'homeBaseId', 'value': '', 'disabled': True, 'description': 'uuid. Only aircraft based at this airport.'},
    {'key': 'minPassengers', 'value': '', 'disabled': True, 'description': 'The fleet finder (scope §6.8). Integer 1-200. Seats AT LEAST this many.'},
    {'key': 'minRangeNm', 'value': '', 'disabled': True, 'description': 'Integer 1-20000 nautical miles, AT LEAST.'},
    {'key': 'amenities', 'value': '', 'disabled': True, 'description': 'Cabin-preference filtering. Comma separated ("WiFi,Full Galley"), max 400 chars. Must match all.'},
    {'key': 'archived', 'value': 'false', 'disabled': True, 'description': 'Allowed: true | false. Default false — only live rows. `true` returns only archived ones.'},
]

CREATE_RAW = """{
  "tailNumber": "{{newAircraftTail}}",                 // required · 2-12 chars, letters/digits/hyphens, stored upper-case. Unique across live AND archived rows → duplicate returns 409.
  "model": "Falcon 8X",                                // required · 1-120 chars. What the desk quotes ("Gulfstream G550").
  "category": "HEAVY_JET",                             // required · TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER. Case-sensitive.
  "status": "AVAILABLE",                               // optional · AVAILABLE | IN_SERVICE | MAINTENANCE | INACTIVE. Default AVAILABLE. Availability, not airworthiness.
  "manufacturer": "Dassault Aviation",                 // optional · max 120 chars
  "operatorId": "{{operatorId}}",                      // optional · uuid of a live operator, or null for "Unassigned". An unknown or archived operator returns 400.
  "homeBaseId": "{{airportId}}",                       // optional · uuid of a live airport. Where the tail sits when it is not flying.
  "maxPassengers": 14,                                 // optional · integer 1-200. Seats the broker quotes against, not the certified count.
  "rangeNm": 6450,                                     // optional · integer 1-20000 nautical miles.
  "yearBuilt": 2023,                                   // optional · integer 1950-2100. Year, not a date.
  "maxSpeed": "Mach 0.90",                             // optional · max 40 chars
  "cruiseSpeed": "Mach 0.85",                          // optional · max 40 chars
  "serviceCeilingFt": 51000,                           // optional · integer 0-100000
  "baggageCapacityCuFt": 140,                          // optional · integer 0-5000
  "cabinLengthFt": 42.7,                               // optional · number 0-300, one decimal
  "maxTakeoffWeightLb": 73000,                         // optional · integer 0-2000000
  "emptyWeightLb": 41000,                              // optional · integer 0-2000000
  "fuelCapacityGal": 4900,                             // optional · integer 0-100000
  "takeoffDistanceFt": 5880,                           // optional · integer 0-30000
  "landingDistanceFt": 2260,                           // optional · integer 0-30000
  "amenities": ["WiFi", "Full Galley", "Private Lavatory"],  // optional · up to 30 chips, each 1-60 chars.
  "lastInspectionAt": "2026-07-15",                    // optional
  "lastAnnualAt": "2026-01-20",                        // optional
  "nextInspectionDueAt": "2026-11-15",                 // optional
  "notes": "Cabin refurbished 2025."                   // optional · max 2000 chars
}"""

UPDATE_RAW = """{
  // Every field optional — this is a PATCH, and an empty body returns 400.
  // Send only what changed; anything omitted is left alone.
  "status": "MAINTENANCE",                             // Grounds a tail: an ordinary field change that lands in the audit log.
  "notes": "AOG at KTEB — awaiting a hydraulic pump.",
  "cruiseSpeed": null                                  // `null` clears an optional field
}"""

PATCH = {
    'status': 'MAINTENANCE',
    'notes': 'AOG at KTEB — awaiting a hydraulic pump.',
    'cruiseSpeed': None,
}


def capture() -> dict:
    owner = Session(OWNER)
    broker = Session(BROKER)
    assistant = Session(ASSISTANT)
    agent = Session(AGENT)
    anonymous = Session(None)

    # Pick live operator and airport
    op_res = owner.request('GET', '/operators?limit=1')
    operator_id = op_res[1]['data'][0]['id'] if op_res[0] == 200 and op_res[1].get('data') else None
    ap_res = owner.request('GET', '/airports?limit=1')
    airport_id = ap_res[1]['data'][0]['id'] if ap_res[0] == 200 and ap_res[1].get('data') else None

    # Distinct tail per run
    tail = 'T' + hex(int(time.time() * 1000))[2:].upper()[-8:]

    create_payload = {
        'tailNumber': tail,
        'model': 'Falcon 8X',
        'category': 'HEAVY_JET',
        'status': 'AVAILABLE',
        'manufacturer': 'Dassault Aviation',
        'operatorId': operator_id,
        'homeBaseId': airport_id,
        'maxPassengers': 14,
        'rangeNm': 6450,
        'yearBuilt': 2023,
        'maxSpeed': 'Mach 0.90',
        'cruiseSpeed': 'Mach 0.85',
        'serviceCeilingFt': 51000,
        'baggageCapacityCuFt': 140,
        'cabinLengthFt': 42.7,
        'maxTakeoffWeightLb': 73000,
        'emptyWeightLb': 41000,
        'fuelCapacityGal': 4900,
        'takeoffDistanceFt': 5880,
        'landingDistanceFt': 2260,
        'amenities': ['WiFi', 'Full Galley', 'Private Lavatory'],
        'lastInspectionAt': '2026-07-15',
        'lastAnnualAt': '2026-01-20',
        'nextInspectionDueAt': '2026-11-15',
        'notes': 'Cabin refurbished 2025.',
    }

    cap: dict = {'payload': create_payload}
    cap['create'] = owner.request('POST', '/aircraft', create_payload)
    if cap['create'][0] != 201:
        raise SystemExit(f"could not create probe aircraft: {cap['create']}")
    probe = cap['create'][1]['data']
    probe_id = probe['id']

    try:
        cap['create_409'] = owner.request('POST', '/aircraft', {**create_payload, 'model': 'Falcon 8X'})
        cap['create_400'] = owner.request('POST', '/aircraft', {
            'tailNumber': 'N 9/9', 'model': '', 'category': 'Heavy Jet', 'rangeNm': 99999,
        })
        cap['create_400_operator'] = owner.request('POST', '/aircraft', {
            'tailNumber': 'N404OP', 'model': 'Citation XLS',
            'category': 'MIDSIZE_JET', 'operatorId': MISSING,
        })
        cap['create_400_image'] = owner.request('POST', '/aircraft', {
            'tailNumber': 'N404PX', 'model': 'Citation XLS', 'category': 'MIDSIZE_JET',
            'exteriorImageUrl': 'https://example.com/xls.jpg',
        })
        cap['create_403'] = assistant.request('POST', '/aircraft', create_payload)

        cap['list'] = owner.request('GET', '/aircraft?page=1&limit=2')
        cap['list_assistant'] = assistant.request('GET', '/aircraft?page=1&limit=1')
        cap['list_finder'] = owner.request('GET', '/aircraft?minPassengers=9&minRangeNm=3000&amenities=WiFi')
        cap['list_sort'] = owner.request('GET', '/aircraft?sortBy=notes')
        cap['list_enum'] = owner.request('GET', '/aircraft?category=heavy_jet')
        cap['list_401'] = anonymous.request('GET', '/aircraft')
        cap['list_agent'] = agent.request('GET', '/aircraft')

        cap['stats'] = owner.request('GET', '/aircraft/stats')
        cap['amenities'] = owner.request('GET', '/aircraft/amenities')

        cap['detail'] = owner.request('GET', f'/aircraft/{probe_id}')
        cap['detail_404'] = owner.request('GET', f'/aircraft/{MISSING}')
        cap['detail_agent'] = agent.request('GET', f'/aircraft/{probe_id}')

        cap['patch'] = owner.request('PATCH', f'/aircraft/{probe_id}', PATCH)
        cap['patch_empty'] = owner.request('PATCH', f'/aircraft/{probe_id}', {})
        cap['patch_403'] = assistant.request('PATCH', f'/aircraft/{probe_id}', PATCH)

        cap['remove_403'] = broker.request('DELETE', f'/aircraft/{probe_id}')
        cap['remove'] = owner.request('DELETE', f'/aircraft/{probe_id}')

        cap['restore_403'] = broker.request('POST', f'/aircraft/{probe_id}/restore')
        cap['restore'] = owner.request('POST', f'/aircraft/{probe_id}/restore')
        cap['restore_404'] = owner.request('POST', f'/aircraft/{probe_id}/restore')

        ids = {'ids': [probe_id]}
        cap['bulk_ids'] = ids
        cap['bulk_remove_403'] = broker.request('POST', '/aircraft/bulk-delete', ids)
        cap['bulk_remove'] = owner.request('POST', '/aircraft/bulk-delete', ids)
        cap['bulk_remove_partial'] = owner.request('POST', '/aircraft/bulk-delete', ids)
        cap['bulk_remove_400'] = owner.request('POST', '/aircraft/bulk-delete', {'ids': []})

        cap['bulk_restore'] = owner.request('POST', '/aircraft/bulk-restore', ids)
        cap['bulk_restore_partial'] = owner.request('POST', '/aircraft/bulk-restore', ids)
        cap['bulk_restore_403'] = broker.request('POST', '/aircraft/bulk-restore', ids)
    finally:
        cap['teardown'] = owner.request('DELETE', f'/aircraft/{probe_id}')

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
    probe = '/aircraft/{{newAircraftId}}'
    bulk_raw = '{\n  "ids": ["{{newAircraftId}}"]  // required · 1-100 UUIDs. Ids that match nothing come back in `skipped`.\n}'

    return {
        'name': '07 · Aircraft',
        'description': FOLDER_DOC,
        'item': [
            request(
                '01 · Add aircraft', 'POST', '/aircraft',
                'Needs **Aircraft · Create**. Tail number, model and category are required. '
                'The tail number is upper-cased and unique across live and archived rows. '
                'Operator and home base are checked to exist and be active.',
                [
                    example('201 · Created', 'POST', '/aircraft', *cap['create'], req_body=cap['payload']),
                    example('409 · Tail number already in use', 'POST', '/aircraft', *cap['create_409'], req_body=cap['payload']),
                    example('400 · Validation failed', 'POST', '/aircraft', *cap['create_400'],
                            req_body={'tailNumber': 'N 9/9', 'model': '', 'category': 'Heavy Jet', 'rangeNm': 99999}),
                    example('400 · Operator does not exist', 'POST', '/aircraft', *cap['create_400_operator'],
                            req_body={'tailNumber': 'N404OP', 'model': 'Citation XLS', 'category': 'MIDSIZE_JET', 'operatorId': MISSING}),
                    example('400 · Photo is not an upload URL', 'POST', '/aircraft', *cap['create_400_image'],
                            req_body={'tailNumber': 'N404PX', 'model': 'Citation XLS', 'category': 'MIDSIZE_JET', 'exteriorImageUrl': 'https://example.com/xls.jpg'}),
                    example('403 · An assistant (no Aircraft · Create)', 'POST', '/aircraft', *cap['create_403'], req_body=cap['payload']),
                ],
                body=CREATE_RAW,
                events=[
                    script('prerequest', [
                        "const tail = 'T' + Date.now().toString(36).toUpperCase().slice(-8);",
                        "pm.collectionVariables.set('newAircraftTail', tail);",
                        "const base = pm.variables.get('baseUrl') || pm.collectionVariables.get('baseUrl');",
                        "pm.sendRequest({ url: base + '/operators?limit=1', method: 'GET' }, function (err, res) {",
                        "    if (!err && res.code === 200 && res.json().data.length) {",
                        "        pm.collectionVariables.set('operatorId', res.json().data[0].id);",
                        "    }",
                        "});",
                        "pm.sendRequest({ url: base + '/airports?limit=1', method: 'GET' }, function (err, res) {",
                        "    if (!err && res.code === 200 && res.json().data.length) {",
                        "        pm.collectionVariables.set('airportId', res.json().data[0].id);",
                        "    }",
                        "});",
                    ]),
                    script('test', [
                        "pm.test('201 Created', () => pm.response.to.have.status(201));",
                        "if (pm.response.code === 201) pm.collectionVariables.set('newAircraftId', pm.response.json().data.id);",
                    ]),
                ],
            ),
            request(
                '02 · List aircraft', 'GET', '/aircraft',
                'Paginated list of the fleet. **Any staff member** — pickers and search read it; a referral agent is refused. '
                'Search covers tail number, model, manufacturer, operator name, and home base ICAO/name/city.',
                [
                    example('200 · Page of aircraft', 'GET', '/aircraft?page=1&limit=2', *cap['list']),
                    example('200 · An assistant (reads need only a staff session)', 'GET', '/aircraft?page=1&limit=1', *cap['list_assistant']),
                    example('200 · Fleet finder', 'GET', '/aircraft?minPassengers=9&minRangeNm=3000&amenities=WiFi', *cap['list_finder']),
                    example('400 · Unsortable column', 'GET', '/aircraft?sortBy=notes', *cap['list_sort']),
                    example('400 · Enum is case-sensitive', 'GET', '/aircraft?category=heavy_jet', *cap['list_enum']),
                    example('401 · Not signed in', 'GET', '/aircraft', *cap['list_401']),
                    example('403 · A referral agent (desk data)', 'GET', '/aircraft', *cap['list_agent']),
                ],
                query=QUERY, events=[status_test(200, '200 OK')],
            ),
            request(
                '03 · Aircraft stats', 'GET', '/aircraft/stats',
                'Counts for the four status tiles above the aircraft table. Live rows only.',
                [example('200 · Stats', 'GET', '/aircraft/stats', *cap['stats'])],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '04 · Cabin features', 'GET', '/aircraft/amenities',
                'Every unique cabin amenity recorded across live aircraft, sorted and deduplicated case-insensitively.',
                [example('200 · Cabin features', 'GET', '/aircraft/amenities', *cap['amenities'])],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '05 · Get aircraft', 'GET', probe,
                'One aircraft with its operator, home base, audit trail and specs. Archived aircraft open too — the Archived tab links here.',
                [
                    example('200 · Aircraft', 'GET', '/aircraft/:id', *cap['detail']),
                    example('404 · Not found', 'GET', '/aircraft/:id', *cap['detail_404']),
                    example('403 · A referral agent (desk data)', 'GET', '/aircraft/:id', *cap['detail_agent']),
                ],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '06 · Update aircraft', 'PATCH', probe,
                'Needs **Aircraft · Edit**. Send only what changed. Setting `status` to MAINTENANCE or INACTIVE is also done here.',
                [
                    example('200 · Updated', 'PATCH', '/aircraft/:id', *cap['patch'], req_body=PATCH),
                    example('400 · Empty patch', 'PATCH', '/aircraft/:id', *cap['patch_empty'], req_body={}),
                    example('403 · An assistant (no Aircraft · Edit)', 'PATCH', '/aircraft/:id', *cap['patch_403'], req_body=PATCH),
                ],
                body=UPDATE_RAW, events=[status_test(200, '200 OK')],
            ),
            request(
                '07 · Remove aircraft (soft)', 'DELETE', probe,
                'Needs **Aircraft · Archive** (administrators by default; broker lacks Archive). Keeps the row and reserves the tail number.',
                [
                    example('204 · Removed', 'DELETE', '/aircraft/:id', *cap['remove']),
                    example('403 · A broker (no Aircraft · Archive)', 'DELETE', '/aircraft/:id', *cap['remove_403']),
                ],
                events=[status_test(204, '204 No Content')],
            ),
            request(
                '08 · Restore aircraft', 'POST', probe + '/restore',
                'Needs **Aircraft · Archive**. Brings an archived aircraft back exactly as it was. Clears deletedAt.',
                [
                    example('200 · Restored', 'POST', '/aircraft/:id/restore', *cap['restore']),
                    example('404 · Not archived', 'POST', '/aircraft/:id/restore', *cap['restore_404']),
                    example('403 · A broker (no Aircraft · Archive)', 'POST', '/aircraft/:id/restore', *cap['restore_403']),
                ],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '09 · Remove several aircraft (soft)', 'POST', '/aircraft/bulk-delete',
                'Needs **Aircraft · Archive**. POST, not DELETE. Partial success is success: ids matching nothing come back in `skipped`.',
                [
                    example('200 · Removed', 'POST', '/aircraft/bulk-delete', *cap['bulk_remove'], req_body=cap['bulk_ids']),
                    example('200 · Already removed (partial)', 'POST', '/aircraft/bulk-delete', *cap['bulk_remove_partial'], req_body=cap['bulk_ids']),
                    example('400 · Nothing selected', 'POST', '/aircraft/bulk-delete', *cap['bulk_remove_400'], req_body={'ids': []}),
                    example('403 · A broker (no Aircraft · Archive)', 'POST', '/aircraft/bulk-delete', *cap['bulk_remove_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw, events=[status_test(200, '200 OK')],
            ),
            request(
                '10 · Restore several aircraft', 'POST', '/aircraft/bulk-restore',
                'Needs **Aircraft · Archive**. The Archived tab bulk action. Ids that are already live come back in `skipped`.',
                [
                    example('200 · Restored', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore'], req_body=cap['bulk_ids']),
                    example('200 · Already live (partial)', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore_partial'], req_body=cap['bulk_ids']),
                    example('403 · A broker (no Aircraft · Archive)', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw.replace('match nothing', 'are not archived'), events=[status_test(200, '200 OK')],
            ),
            request(
                '11 · Teardown — archive the probe', 'DELETE', probe,
                'The run is a demonstration: the probe ends archived, in the Archived tab, never live. A request of '
                'its own so it always runs, even when this folder is run alone.',
                [example('204 · Archived', 'DELETE', '/aircraft/:id', *cap['teardown'])],
                events=[script('test', [
                    "pm.test('archived', () => pm.response.to.have.status(204));",
                    "pm.collectionVariables.set('newAircraftId', '');",
                    "pm.collectionVariables.set('newAircraftTail', '');",
                ])],
            ),
        ],
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {
        'aircraftId': '',
        'newAircraftId': '',
        'newAircraftTail': '',
        'operatorId': '',
        'airportId': '',
    })
    folder = with_session(build(capture()), 'owner')
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
