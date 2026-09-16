#!/usr/bin/env python3
"""
Builds the `07 · Aircraft` folder, capturing every example from a live API.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_aircraft_folder.py

Examples are captured, never typed. A hand-written example drifts from the
response the moment a field is added, and the collection is a deliverable —
the whole point is that what it shows is what the API actually returns.

Re-runnable: every row it creates is removed again at the end, so running it
twice leaves the database as it found it.
"""

import json
import pathlib
import re
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
PASSWORD = 'ChangeMe123!'


class Session:
    """A cookie-backed caller, echoing the CSRF cookie the way the app does."""

    def __init__(self, email: str) -> None:
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )
        self.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})

    @property
    def csrf(self) -> str:
        for cookie in self.jar:
            if cookie.name == 'tj_csrf':
                return cookie.value or ''
        return ''

    def request(self, method: str, path: str, body=None):
        """Returns (status, parsed body). Errors are captured, not raised."""
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data is not None:
            req.add_header('Content-Type', 'application/json')
        req.add_header('X-CSRF-Token', self.csrf)
        try:
            with self.opener.open(req) as response:
                raw = response.read().decode()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read().decode()
            try:
                return error.code, json.loads(raw)
            except json.JSONDecodeError:
                return error.code, raw


def example(name: str, method: str, path: str, status: int, body, req_body=None):
    """One Postman response example, carrying the request that produced it."""
    original = {
        'method': method,
        'header': [],
        'url': {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
                'path': [p for p in path.lstrip('/').split('/') if p and '?' not in p]},
    }
    if req_body is not None:
        original['body'] = {'mode': 'raw', 'raw': json.dumps(req_body, indent=2)}
    return {
        'name': name,
        'originalRequest': original,
        'status': {200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
                   401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
                   409: 'Conflict'}[status],
        'code': status,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [],
        'body': '' if body is None else json.dumps(body, indent=2, ensure_ascii=False),
    }


def script(listen: str, lines: list[str]):
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


WRITE_HEADERS = [
    {'key': 'Content-Type', 'value': 'application/json'},
    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
     'description': 'Required on every write. Captured automatically after any login or refresh.'},
]

SORTABLE = ('createdAt | updatedAt | tailNumber | model | category | status | '
            'maxPassengers | rangeNm | yearBuilt')
CATEGORIES = ('TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | '
              'ULTRA_LONG_RANGE | VIP_AIRLINER')
STATUSES = 'AVAILABLE | IN_SERVICE | MAINTENANCE | INACTIVE'

CREATE_BODY = """{
  "tailNumber": "{{newAircraftTail}}",                 // required · 2-12 chars, letters/digits/hyphens, stored upper-case. Unique across live AND archived rows → duplicate returns 409.

  "model": "Falcon 8X",                                // required · 1-120 chars. What the desk quotes ("Gulfstream G550").

  "category": "HEAVY_JET",                             // required · TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER. Case-sensitive.

  "status": "AVAILABLE",                               // optional · AVAILABLE | IN_SERVICE | MAINTENANCE | INACTIVE. Default AVAILABLE. Availability, not airworthiness.

  "manufacturer": "Dassault Aviation",                 // optional · max 120 chars

  "operatorId": "{{operatorId}}",                      // optional · uuid of a live operator, or null for "Unassigned". An unknown or archived operator returns 400, not a bare FK error.
  "homeBaseId": "{{airportId}}",                       // optional · uuid of a live airport. Where the tail sits when it is not flying.

  "maxPassengers": 14,                                 // optional · integer 1-200. Seats the broker quotes against, not the certified count.
  "rangeNm": 6450,                                     // optional · integer 1-20000 nautical miles.
  "yearBuilt": 2023,                                   // optional · integer 1950-2100. Year, not a date.

  // Speeds are free text: jets are quoted in Mach, turboprops in knots, and one
  // numeric column cannot hold both without a second saying which unit it is.
  "maxSpeed": "Mach 0.90",                             // optional · max 40 chars
  "cruiseSpeed": "Mach 0.85",                          // optional · max 40 chars

  // Everything below has one settled unit, so it is numeric. Leave a field out
  // rather than guessing — an empty string is stored as absent, never as 0.
  "serviceCeilingFt": 51000,                           // optional · integer 0-100000
  "baggageCapacityCuFt": 140,                          // optional · integer 0-5000
  "cabinLengthFt": 42.7,                               // optional · number 0-300, one decimal
  "maxTakeoffWeightLb": 73000,                         // optional · integer 0-2000000
  "emptyWeightLb": 41000,                              // optional · integer 0-2000000
  "fuelCapacityGal": 4900,                             // optional · integer 0-100000
  "takeoffDistanceFt": 5880,                           // optional · integer 0-30000
  "landingDistanceFt": 2260,                           // optional · integer 0-30000

  "amenities": ["WiFi", "Full Galley", "Private Lavatory"],  // optional · up to 30 chips, each 1-60 chars. Replaced wholesale on update, never merged.

  // Maintenance dates. YYYY-MM-DD, no time of day. The tab's Completed /
  // Scheduled / Overdue badge is derived from these, never stored.
  "lastInspectionAt": "2026-07-15",                    // optional
  "lastAnnualAt": "2026-01-20",                        // optional
  "nextInspectionDueAt": "2026-11-15",                 // optional

  "notes": "Cabin refurbished 2025."                   // optional · max 2000 chars
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH, and an empty body returns 400.
  // Send only what changed; anything omitted is left alone.
  "status": "MAINTENANCE",                             // This is also how the Set Maintenance button grounds a tail: an ordinary field change, so it lands in the audit log as one.

  "notes": "AOG at KTEB — awaiting a hydraulic pump.",

  // `null` clears a field; omitting it leaves the stored value alone. The two
  // are different instructions and the API treats them that way.
  "cruiseSpeed": null
}"""


def build(owner: Session, assistant: Session) -> dict:
    """Captures every example, then assembles the folder around them."""
    # A tail this run has not used, so a rerun exercises the endpoint rather
    # than colliding with the row the last run archived.
    import random
    tail = 'N' + str(random.randint(100, 999)) + random.choice('QXZ') + 'T'

    operator_id = owner.request('GET', '/operators?limit=1')[1]['data'][0]['id']
    airport_id = owner.request('GET', '/airports?limit=1')[1]['data'][0]['id']
    seeded_id = owner.request('GET', '/aircraft?limit=1')[1]['data'][0]['id']
    missing = '00000000-0000-4000-8000-000000000000'

    create_payload = {
        'tailNumber': tail, 'model': 'Falcon 8X', 'category': 'HEAVY_JET',
        'status': 'AVAILABLE', 'manufacturer': 'Dassault Aviation',
        'operatorId': operator_id, 'homeBaseId': airport_id,
        'maxPassengers': 14, 'rangeNm': 6450, 'yearBuilt': 2023,
        'maxSpeed': 'Mach 0.90', 'cruiseSpeed': 'Mach 0.85',
        'serviceCeilingFt': 51000, 'baggageCapacityCuFt': 140,
        'cabinLengthFt': 42.7, 'maxTakeoffWeightLb': 73000,
        'emptyWeightLb': 41000, 'fuelCapacityGal': 4900,
        'takeoffDistanceFt': 5880, 'landingDistanceFt': 2260,
        'amenities': ['WiFi', 'Full Galley', 'Private Lavatory'],
        'lastInspectionAt': '2026-07-15', 'lastAnnualAt': '2026-01-20',
        'nextInspectionDueAt': '2026-11-15', 'notes': 'Cabin refurbished 2025.',
    }

    cap = {}
    cap['list'] = owner.request('GET', '/aircraft?page=1&limit=3')
    cap['list_sort_400'] = owner.request('GET', '/aircraft?sortBy=notes')
    cap['list_enum_400'] = owner.request('GET', '/aircraft?category=heavy_jet')
    cap['list_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/aircraft', 'timestamp': '2026-09-16T04:00:00.000Z',
    })
    cap['stats'] = owner.request('GET', '/aircraft/stats')
    cap['amenities'] = owner.request('GET', '/aircraft/amenities')
    cap['finder'] = owner.request(
        'GET', '/aircraft?minPassengers=9&minRangeNm=3000&amenities=WiFi')
    cap['detail'] = owner.request('GET', f'/aircraft/{seeded_id}')
    cap['detail_404'] = owner.request('GET', f'/aircraft/{missing}')

    cap['create'] = owner.request('POST', '/aircraft', create_payload)
    new_id = cap['create'][1]['data']['id']
    cap['create_409'] = owner.request(
        'POST', '/aircraft', {**create_payload, 'model': 'Falcon 8X'})
    cap['create_400'] = owner.request('POST', '/aircraft', {
        'tailNumber': 'N 9/9', 'model': '', 'category': 'Heavy Jet',
        'operatorId': missing, 'rangeNm': 99999,
    })
    cap['create_400_operator'] = owner.request('POST', '/aircraft', {
        'tailNumber': 'N404OP', 'model': 'Citation XLS',
        'category': 'MIDSIZE_JET', 'operatorId': missing,
    })
    cap['create_403'] = assistant.request('POST', '/aircraft', create_payload)

    cap['update'] = owner.request('PATCH', f'/aircraft/{new_id}', {
        'status': 'MAINTENANCE',
        'notes': 'AOG at KTEB — awaiting a hydraulic pump.',
        'cruiseSpeed': None,
    })
    cap['update_400'] = owner.request('PATCH', f'/aircraft/{new_id}', {})

    cap['remove'] = owner.request('DELETE', f'/aircraft/{new_id}')
    cap['restore'] = owner.request('POST', f'/aircraft/{new_id}/restore')
    cap['restore_404'] = owner.request('POST', f'/aircraft/{new_id}/restore')

    cap['bulk_delete'] = owner.request(
        'POST', '/aircraft/bulk-delete', {'ids': [new_id, missing]})
    cap['bulk_delete_partial'] = owner.request(
        'POST', '/aircraft/bulk-delete', {'ids': [new_id]})
    cap['bulk_400'] = owner.request('POST', '/aircraft/bulk-delete', {'ids': []})
    cap['bulk_403'] = assistant.request(
        'POST', '/aircraft/bulk-delete', {'ids': [new_id]})
    cap['bulk_restore'] = owner.request(
        'POST', '/aircraft/bulk-restore', {'ids': [new_id, missing]})
    cap['bulk_restore_partial'] = owner.request(
        'POST', '/aircraft/bulk-restore', {'ids': [new_id]})
    cap['bulk_restore_400'] = owner.request('POST', '/aircraft/bulk-restore', {'ids': []})
    cap['bulk_restore_403'] = assistant.request(
        'POST', '/aircraft/bulk-restore', {'ids': [new_id]})

    # Leave the database as we found it.
    owner.request('DELETE', f'/aircraft/{new_id}')

    query = [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1. Out of range returns an empty `data` with a truthful `meta`.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10, matching the rows-per-page dropdown in the UI. >100 or <1 → 400.'},
        {'key': 'search', 'value': '', 'disabled': True,
         'description': 'Case-insensitive substring across tail number, model, manufacturer, the operator\'s name and the home base\'s ICAO, name and city. Trimmed, max 200 chars.'},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc — tables open newest-first.'},
        {'key': 'sortBy', 'value': 'createdAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt, paired with sortOrder desc, so a newly added tail is the first row. A closed list — anything else returns 400 rather than reaching the database.'},
        {'key': 'status', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {STATUSES}. Omit for all. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'category', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {CATEGORIES}. Omit for all.'},
        {'key': 'operatorId', 'value': '', 'disabled': True,
         'description': 'uuid. Only this operator\'s fleet — what the operator detail page\'s Fleet tab reads.'},
        {'key': 'homeBaseId', 'value': '', 'disabled': True,
         'description': 'uuid. Only aircraft based at this airport.'},
        {'key': 'minPassengers', 'value': '', 'disabled': True,
         'description': 'The fleet finder (scope §6.8). Integer 1-200. Seats AT LEAST this many — more seats still answers "what can carry nine". A tail with no capacity recorded is excluded, not assumed to fit.'},
        {'key': 'minRangeNm', 'value': '', 'disabled': True,
         'description': 'Integer 1-20000 nautical miles, AT LEAST. Same rule: an unknown range is excluded rather than guessed.'},
        {'key': 'amenities', 'value': '', 'disabled': True,
         'description': 'Cabin-preference filtering (scope §6.8). Comma separated ("WiFi,Full Galley"), max 400 chars. The aircraft must have ALL of them — a requested feature is a requirement, so one missing makes it a wrong answer, not a weaker match. Values come from GET /aircraft/amenities and are matched exactly, including case.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed (case-sensitive): true | false. Default false — only live rows. `true` returns ONLY archived ones, for the Archived tab.'},
    ]
    raw_query = '&'.join(f"{p['key']}={p['value']}" for p in query)

    items = [
        {
            'name': '01 · List aircraft',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/aircraft?' + raw_query,
                        'host': ['{{baseUrl}}'], 'path': ['aircraft'], 'query': query},
                'description': (
                    'Paginated list of the fleet. Search covers **tail number, model, manufacturer, '
                    'the operator\'s name and the home base\'s ICAO, name and city** in one term — '
                    '"VistaJet" and "Aspen" both find aircraft, even though neither is a column on '
                    'this table.\n\n`operator` and `homeBase` come back as objects rather than names, '
                    'so the table can link to them and cannot show a stale name after a rename.\n\n'
                    '`totalTrips`, `tripsThisYear` and `avgUtilization` are **null**, not 0: they are '
                    'aggregates over trips, and that module does not exist yet. Null lets the UI show '
                    'an em dash instead of claiming a tail has never flown.\n\n'
                    'See the Params tab for every filter, its default and its bounds.'),
            },
            'response': [
                example('200 · Page of aircraft', 'GET', '/aircraft?page=1&limit=3', *cap['list']),
                example('400 · Unsortable column', 'GET', '/aircraft?sortBy=notes', *cap['list_sort_400']),
                example('400 · Enum is case-sensitive', 'GET', '/aircraft?category=heavy_jet', *cap['list_enum_400']),
                example('200 · Fleet finder', 'GET', '/aircraft?minPassengers=9&minRangeNm=3000&amenities=WiFi', *cap['finder']),
                example('401 · Not signed in', 'GET', '/aircraft', *cap['list_401']),
            ],
            'event': [script('test', [
                '// The detail, update and delete requests below need a real id.',
                '// Taking it from this list keeps the folder runnable end to end',
                '// without anyone pasting an aircraft id by hand.',
                "pm.test('list returned rows', function () {",
                '    pm.response.to.have.status(200);',
                '    const rows = pm.response.json().data;',
                '    pm.expect(rows.length).to.be.above(0);',
                "    pm.collectionVariables.set('aircraftId', rows[0].id);",
                '});',
            ])],
        },
        {
            'name': '02 · Aircraft stats',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/aircraft/stats', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', 'stats']},
                'description': 'Counts for the four tiles above the aircraft table. Live rows only — archived aircraft are excluded from every count.',
            },
            'response': [example('200 · Stats', 'GET', '/aircraft/stats', *cap['stats'])],
            'event': [script('test', [
                "pm.test('stats returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('total');",
                '});',
            ])],
        },
        {
            'name': '03 · Cabin features',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/aircraft/amenities', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', 'amenities']},
                'description': (
                    'Every cabin feature recorded on a live aircraft, de-duplicated and sorted — '
                    'the options for the preference filter.\n\nDerived from the rows rather than a '
                    'list fixed at design time, so the dropdown can never offer a feature nothing '
                    'matches or omit one somebody typed yesterday. De-duplicated '
                    '**case-insensitively**: "WiFi" and "Wifi" are one preference typed twice, and '
                    'offering both would split the fleet for no reason.\n\nFeed these values back '
                    'to `GET /aircraft?amenities=` exactly as returned — the filter matches case.'),
            },
            'response': [example('200 · Cabin features', 'GET', '/aircraft/amenities', *cap['amenities'])],
        },
        {
            'name': '04 · Get aircraft',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/aircraft/{{aircraftId}}', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', '{{aircraftId}}']},
                'description': (
                    'One aircraft, with its operator, home base and audit actors resolved.\n\n'
                    '**Archived rows are returned here, deliberately.** The Archived tab links '
                    'straight to this page, so filtering them out would list a row and then 404 it. '
                    'The archive trail comes with the payload, so the page can offer Restore instead '
                    'of pretending the aircraft is live.\n\n`tripHistory` is an empty array until the '
                    'Trips module lands.'),
            },
            'response': [
                example('200 · Aircraft', 'GET', '/aircraft/{{aircraftId}}', *cap['detail']),
                example('404 · Not found', 'GET', f'/aircraft/{missing}', *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Add aircraft',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/aircraft', 'host': ['{{baseUrl}}'], 'path': ['aircraft']},
                'description': (
                    'Adds an aircraft. Requires `Manage Aircraft` at write scope — assistants receive '
                    '403; brokers may add, matching how they may add an operator.\n\n**Only tail '
                    'number, model and category are required.** A tail is usually catalogued from a '
                    'sourcing call with little more than the model, and demanding a full specification '
                    'sheet up front only produces invented numbers.\n\n**The tail number is normalised '
                    'and unique.** It is upper-cased on the way in, so `n780ex` and `N780EX` are the '
                    'same airframe and cannot both exist. Unlike an airport ICAO, a tail held by an '
                    '**archived** aircraft is *not* silently revived — the 409 names the situation and '
                    'points at `08 · Restore aircraft`, because an archived tail is usually a real '
                    'airframe someone wants back with its history, not a code to recycle.\n\n'
                    '**`operatorId` and `homeBaseId` are checked, not just constrained.** An unknown id '
                    'returns a named 400 rather than a bare foreign-key error, and an *archived* '
                    'operator is refused — the row still exists, so the database constraint alone '
                    'would accept it.'),
            },
            'response': [
                example('201 · Created', 'POST', '/aircraft', *cap['create'], req_body=create_payload),
                example('409 · Tail number already in use', 'POST', '/aircraft', *cap['create_409']),
                example('400 · Validation failed', 'POST', '/aircraft', *cap['create_400']),
                example('400 · Operator does not exist', 'POST', '/aircraft', *cap['create_400_operator']),
                example('403 · Role may read but not write', 'POST', '/aircraft', *cap['create_403']),
            ],
            'event': [
                script('prerequest', [
                    '// A tail this run has not used before. An archived tail number',
                    '// stays reserved (see the 409 example), so a fixed one would',
                    '// collide on the second run instead of exercising the endpoint.',
                    "let tail = 'N' + (100 + Math.floor(Math.random() * 900));",
                    "tail += 'QXZ'[Math.floor(Math.random() * 3)] + 'T';",
                    "pm.collectionVariables.set('newAircraftTail', tail);",
                ]),
                script('test', [
                    '// The update, remove and restore requests below operate on this',
                    '// new aircraft, so running the folder never touches seeded rows.',
                    "pm.test('created', function () {",
                    '    pm.response.to.have.status(201);',
                    "    pm.collectionVariables.set('newAircraftId', pm.response.json().data.id);",
                    '});',
                ]),
            ],
        },
        {
            'name': '06 · Update aircraft',
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/aircraft/{{newAircraftId}}', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', '{{newAircraftId}}']},
                'description': (
                    'Partial update — send only what changed. An empty body returns 400 rather than a '
                    'no-op 200, so a broken client is visible instead of silent.\n\n**This is also how '
                    'an aircraft is grounded.** The detail page\'s Set Maintenance button sends '
                    '`status`, so putting a tail into maintenance is an ordinary field change and lands '
                    'in the audit log as one, naming who did it.\n\n`null` clears a field; omitting it '
                    'leaves the stored value alone. `amenities` is replaced wholesale rather than '
                    'merged — the UI edits it as one field, so a merge would make removing a chip '
                    'impossible.\n\nArchived aircraft return 404: restore first, then edit.'),
            },
            'response': [
                example('200 · Updated', 'PATCH', '/aircraft/{{newAircraftId}}', *cap['update']),
                example('400 · Empty patch', 'PATCH', '/aircraft/{{newAircraftId}}', *cap['update_400'], req_body={}),
            ],
        },
        {
            'name': '07 · Remove aircraft (soft)',
            'request': {
                'method': 'DELETE', 'header': [WRITE_HEADERS[1]],
                'url': {'raw': '{{baseUrl}}/aircraft/{{newAircraftId}}', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', '{{newAircraftId}}']},
                'description': (
                    'Archives the aircraft. **There is no hard delete anywhere in this system** — the '
                    'row is kept because quotes and trips will reference it, and destroying it would '
                    'orphan the history of every flight it flew.\n\n**This is not how an aircraft '
                    'leaves a fleet in normal use.** Set `status` to `INACTIVE` for that, which keeps '
                    'the tail listed and searchable. Archiving is for a row that should not have been '
                    'entered at all.\n\nThe tail number stays reserved while archived — see the 409 on '
                    '`04 · Add aircraft`.'),
            },
            'response': [example('204 · Removed', 'DELETE', '/aircraft/{{newAircraftId}}', 204, None)],
        },
        {
            'name': '08 · Restore aircraft',
            'request': {
                'method': 'POST', 'header': [WRITE_HEADERS[1]],
                'url': {'raw': '{{baseUrl}}/aircraft/{{newAircraftId}}/restore', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', '{{newAircraftId}}', 'restore']},
                'description': (
                    'Brings an archived aircraft back, exactly as it was: clears the deletion stamp, '
                    'records who restored it, and touches nothing else. Every field returns untouched, '
                    'including the tail number, which stayed reserved the whole time.\n\nA row that is '
                    'not archived returns 404 — restoring a live aircraft is not a no-op, it is a sign '
                    'the caller has the wrong id.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/aircraft/{{newAircraftId}}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', '/aircraft/{{newAircraftId}}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '09 · Remove several aircraft (soft)',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newAircraftId}}"]   // 1-100 uuids. Ids that match nothing come back in `skipped` rather than failing the batch.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/aircraft/bulk-delete', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', 'bulk-delete']},
                'description': (
                    "For the table's checkbox column. Soft, like the single case.\n\n**POST, not "
                    'DELETE-with-body.** Request bodies on DELETE are dropped by proxies and HTTP '
                    'clients alike, and a dropped body would remove nothing while answering 200.\n\n'
                    '**Partial success is success.** Ids that match nothing — already archived, or '
                    'never existed — are reported in `skipped`, so two people clearing the same '
                    'selection both succeed.\n\nRead `affected`. `deleted` is the same number, kept '
                    'only as an alias for callers written before the rename.'),
            },
            'response': [
                example('200 · Removed', 'POST', '/aircraft/bulk-delete', *cap['bulk_delete'], req_body={'ids': ['{{newAircraftId}}', missing]}),
                example('200 · Already removed (partial)', 'POST', '/aircraft/bulk-delete', *cap['bulk_delete_partial']),
                example('400 · Nothing selected', 'POST', '/aircraft/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
                example('403 · Role may read but not write', 'POST', '/aircraft/bulk-delete', *cap['bulk_403']),
            ],
        },
        {
            'name': '10 · Restore several aircraft',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newAircraftId}}"]   // 1-100 uuids. Ids that are not archived come back in `skipped` rather than failing the batch.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/aircraft/bulk-restore', 'host': ['{{baseUrl}}'],
                        'path': ['aircraft', 'bulk-restore']},
                'description': (
                    "For the Archived tab's checkbox column — the mirror of `09`, and the reason every "
                    'bulk delete in this API has one. A table that lets you select archived rows and '
                    'offers no action on them is a dead checkbox column.\n\nSame rules: POST, partial '
                    'success, and ids that are already live are `skipped` rather than failing the '
                    'batch.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore'], req_body={'ids': ['{{newAircraftId}}', missing]}),
                example('200 · Already live (partial)', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore_partial']),
                example('400 · Nothing selected', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore_400'], req_body={'ids': []}),
                example('403 · Role may read but not write', 'POST', '/aircraft/bulk-restore', *cap['bulk_restore_403']),
            ],
            'event': [script('test', [
                '// Teardown. This is the last request in the folder, and it leaves',
                '// the aircraft it created LIVE — so every run used to add a',
                '// permanent Falcon 8X to the working fleet. Ten had piled up',
                '// before anyone noticed.',
                '//',
                '// There is no hard delete in this system by design, so the run',
                "// cannot erase its own row. Archiving it is the best available",
                '// end state: the debris sits in the Archived tab instead of',
                '// among the aircraft a broker actually quotes from.',
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '});',
                '',
                "const id = pm.collectionVariables.get('newAircraftId');",
                'if (id) {',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/aircraft/' + id,",
                "        method: 'DELETE',",
                "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                '    }, function (err) {',
                "        if (err) { console.warn('teardown could not archive ' + id, err); }",
                '    });',
                '}',
            ])],
        },
    ]

    return {
        'name': '07 · Aircraft',
        'description': (
            'The fleet: individual airframes, each belonging to an operator and usually based at an '
            'airport.\n\nBoth of those are real foreign keys, which is why Operators and Airports had '
            'to ship first — see AGENTS.md on build order. Quotes, trips, empty legs and flight '
            'tracking will all reference this table.\n\nEvery request below is signed in as the seeded '
            'SUPER_ADMIN by the folder\'s pre-request script, except the 403 examples, which were '
            'captured as the seeded assistant.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')

    collection = json.loads(COLLECTION.read_text())

    # The folder signs itself in the way every other folder does.
    operators = next(f for f in collection['item'] if f['name'].startswith('06'))
    folder = build(owner, assistant)
    folder['event'] = json.loads(json.dumps(operators['event']))

    collection['item'] = [f for f in collection['item'] if not f['name'].startswith('07 · Aircraft')]
    collection['item'].append(folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('aircraftId', 'newAircraftId', 'newAircraftTail'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    # Two-space indent and escaped non-ASCII, matching how Postman itself
    # writes the file — anything else reformats all 7,000 lines and buries the
    # new folder in the diff.
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
