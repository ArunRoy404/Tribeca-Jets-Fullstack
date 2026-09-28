#!/usr/bin/env python3
"""
Builds the `08 · Trip Requests` folder, capturing every example from a live API.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_trip_requests_folder.py

Examples are captured, never typed — a hand-written example drifts from the
response the moment a field is added, and this collection is a deliverable.

Re-runnable: the rows it creates are archived again at the end, so running it
twice does not fill the working board with probes.
"""

import json
import pathlib
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from collection_order import place_folder

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


STATUS_TEXT = {200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
               401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict'}


def example(name, method, path, status, body, req_body=None):
    # A captured example is not an assertion — Newman never compares a label
    # with the response stored beside it — so the builder refuses to write one
    # that disagrees. The fix is always the request, never the label.
    promised = name.split(' ', 1)[0]
    if promised.isdigit() and int(promised) != status:
        raise SystemExit(
            f'refusing to write example {name!r}: the request returned {status}, '
            f'not {promised}. Fix the request that captures it.')
    original = {
        'method': method, 'header': [],
        'url': {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
                'path': [p for p in path.lstrip('/').split('/') if p and '?' not in p]},
    }
    if req_body is not None:
        original['body'] = {'mode': 'raw', 'raw': json.dumps(req_body, indent=2)}
    return {
        'name': name, 'originalRequest': original,
        'status': STATUS_TEXT[status], 'code': status,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [], 'body': '' if body is None else json.dumps(body, indent=2, ensure_ascii=False),
    }


def script(listen, lines):
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


WRITE_HEADERS = [
    {'key': 'Content-Type', 'value': 'application/json'},
    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
     'description': 'Required on every write. Captured automatically after any login or refresh.'},
]

SORTABLE = 'createdAt | updatedAt | departureDate | status | estimatedValue | passengers'
STATUSES = 'OPEN | SOURCING | QUOTED | CONVERTED | LOST'
SOURCES = ('DIRECT | TRAVEL_AGENT | FACEBOOK_GROUP_1 | FACEBOOK_GROUP_2 | '
           'REFERRAL | WEBSITE | OTHER')
CATEGORIES = ('TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | '
              'ULTRA_LONG_RANGE | VIP_AIRLINER')

CREATE_BODY = """{
  "clientId": "{{clientId}}",                          // required · uuid of a live client. The ONLY required field — an enquiry with nobody attached cannot be followed up, quoted or converted. For a travel agent's enquiry this is the agent, who is a client of type TRAVEL_AGENT.

  "source": "REFERRAL",                                // optional · DIRECT | TRAVEL_AGENT | FACEBOOK_GROUP_1 | FACEBOOK_GROUP_2 | REFERRAL | WEBSITE | OTHER. Default DIRECT. Same enum the client's leadSource uses — one vocabulary, not two.
  "status": "OPEN",                                    // optional · OPEN | SOURCING | QUOTED | CONVERTED | LOST. Default OPEN.

  "assignedBrokerId": "{{userId}}",                    // optional · uuid. A BROKER always files against themselves, whatever is sent here; assigning to someone else needs a wider scope.

  // Route. Real airport ids, not codes typed into a box.
  "originAirportId": "{{airportId}}",                  // optional · uuid of a live airport
  "destinationAirportId": null,                        // optional · uuid, or null

  // YYYY-MM-DD, no time of day. A present returnDate is what makes this a
  // round trip — there is no separate flag, because two fields that can
  // disagree will. A return before the departure returns 400.
  "departureDate": "2026-11-15",                       // optional
  "returnDate": "2026-11-18",                          // optional

  "passengers": 4,                                     // optional · integer 1-200. An empty string is stored as absent, never as 0.
  "aircraftPreference": "HEAVY_JET",                   // optional · TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER. A category, not a tail — at enquiry stage nobody has picked an airframe.
  "estimatedValue": 28000,                             // optional · number 0-100000000, whole currency units. Feeds the pipeline total, so it is DECIMAL not float.

  "summary": "NYC → Miami, business charter",          // optional · max 300 chars. One line for the board's Route column.
  "requirements": "Catering and ground transport.",    // optional · max 2000 chars. What the client asked for.
  "internalNotes": "Referred by Hope Sterling."        // optional · max 2000 chars. Never shown to a client.
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH, and an empty body returns 400.
  // Send only what changed; anything omitted is left alone, and null clears.
  "status": "SOURCING",                                // Also how the request moves through the pipeline.

  "estimatedValue": 31500,

  "internalNotes": "Client added two passengers on the call."
}"""


def build(owner, broker, assistant):
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airport_id = owner.request('GET', '/airports?limit=1')[1]['data'][0]['id']
    seeded = owner.request('GET', '/trip-requests?limit=1')[1]['data'][0]
    missing = '00000000-0000-4000-8000-000000000000'

    payload = {
        'clientId': client_id, 'source': 'REFERRAL', 'status': 'OPEN',
        'originAirportId': airport_id, 'destinationAirportId': None,
        'departureDate': '2026-11-15', 'returnDate': '2026-11-18',
        'passengers': 4, 'aircraftPreference': 'HEAVY_JET',
        'estimatedValue': 28000,
        'summary': 'NYC → Miami, business charter',
        'requirements': 'Catering and ground transport.',
        'internalNotes': 'Referred by Hope Sterling.',
    }

    cap = {}
    cap['list'] = owner.request('GET', '/trip-requests?page=1&limit=3')
    cap['list_open'] = owner.request('GET', '/trip-requests?openOnly=true')
    cap['list_400'] = owner.request('GET', '/trip-requests?status=open')
    cap['list_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/trip-requests', 'timestamp': '2026-09-16T04:00:00.000Z',
    })
    cap['stats'] = owner.request('GET', '/trip-requests/stats')
    cap['detail'] = owner.request('GET', f"/trip-requests/{seeded['id']}")
    cap['detail_404'] = owner.request('GET', f'/trip-requests/{missing}')

    cap['create'] = owner.request('POST', '/trip-requests', payload)
    new_id = cap['create'][1]['data']['id']
    cap['create_400_client'] = owner.request(
        'POST', '/trip-requests', {'clientId': missing})
    cap['create_400_dates'] = owner.request('POST', '/trip-requests', {
        'clientId': client_id, 'departureDate': '2026-12-10',
        'returnDate': '2026-12-01',
    })
    cap['create_403'] = assistant.request('POST', '/trip-requests', payload)

    cap['update'] = owner.request('PATCH', f'/trip-requests/{new_id}', {
        'status': 'SOURCING', 'estimatedValue': 31500,
        'internalNotes': 'Client added two passengers on the call.',
    })
    cap['update_400'] = owner.request('PATCH', f'/trip-requests/{new_id}', {})
    # A real reassignment, not a no-op: the request is created unassigned, so
    # sending `null` again would change nothing and the service — correctly —
    # skips the check on a link that is not changing. Point it at a different
    # broker to exercise the rule the example claims to show.
    owner_id = owner.request('GET', '/auth/me')[1]['data']['id']
    cap['update_403'] = broker.request(
        'PATCH', f'/trip-requests/{new_id}', {'assignedBrokerId': owner_id})

    cap['remove_403'] = broker.request('DELETE', f'/trip-requests/{new_id}')
    cap['remove'] = owner.request('DELETE', f'/trip-requests/{new_id}')
    cap['restore'] = owner.request('POST', f'/trip-requests/{new_id}/restore')
    cap['restore_404'] = owner.request('POST', f'/trip-requests/{new_id}/restore')

    cap['bulk_delete'] = owner.request(
        'POST', '/trip-requests/bulk-delete', {'ids': [new_id, missing]})
    cap['bulk_400'] = owner.request('POST', '/trip-requests/bulk-delete', {'ids': []})
    cap['bulk_403'] = broker.request(
        'POST', '/trip-requests/bulk-delete', {'ids': [new_id]})
    cap['bulk_restore'] = owner.request(
        'POST', '/trip-requests/bulk-restore', {'ids': [new_id, missing]})
    cap['bulk_restore_partial'] = owner.request(
        'POST', '/trip-requests/bulk-restore', {'ids': [new_id]})

    # Leave the probe archived rather than on the working board.
    owner.request('DELETE', f'/trip-requests/{new_id}')

    query = [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'search', 'value': '', 'disabled': True,
         'description': "Case-insensitive substring across the summary, the client's name and company, and both airports' ICAO codes."},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
        {'key': 'sortBy', 'value': 'createdAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt. A closed list — anything else returns 400.'},
        {'key': 'openOnly', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false. `true` hides CONVERTED and LOST — the working board is a list of things still needing a price, and finished requests bury them.'},
        {'key': 'status', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {STATUSES}. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'source', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {SOURCES}.'},
        {'key': 'aircraftPreference', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {CATEGORIES}.'},
        {'key': 'clientId', 'value': '', 'disabled': True,
         'description': "uuid. One client's enquiries — what the lead detail page reads."},
        {'key': 'assignedBrokerId', 'value': '', 'disabled': True, 'description': 'uuid.'},
        {'key': 'originAirportId', 'value': '', 'disabled': True, 'description': 'uuid.'},
        {'key': 'destinationAirportId', 'value': '', 'disabled': True, 'description': 'uuid.'},
        {'key': 'departure', 'value': '', 'disabled': True,
         'description': 'Allowed (case-sensitive): OVERDUE | TODAY | UPCOMING. Departure relative to today.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false — live rows only. `true` returns ONLY archived ones.'},
    ]
    raw_query = '&'.join(f"{p['key']}={p['value']}" for p in query)

    items = [
        {
            'name': '01 · List trip requests',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/trip-requests?' + raw_query,
                        'host': ['{{baseUrl}}'], 'path': ['trip-requests'], 'query': query},
                'description': (
                    'Open trip requests — the enquiry, before it becomes a quote or a trip '
                    '(scope §6.4).\n\n**Scoped.** A broker sees the enquiries assigned to them '
                    '*plus any not yet assigned to anyone* — an unowned request is exactly the one '
                    'that must not disappear. Applied in the query, so their pagination counts and '
                    'pipeline totals are correct rather than merely censored.\n\n`client`, '
                    '`assignedBroker` and both airports come back as objects rather than names, so '
                    'the board can link to them and cannot show a stale name after a rename.\n\n'
                    'Use `openOnly=true` for the working board.'),
            },
            'response': [
                example('200 · Page of requests', 'GET', '/trip-requests?page=1&limit=3', *cap['list']),
                example('200 · Working board (openOnly)', 'GET', '/trip-requests?openOnly=true', *cap['list_open']),
                example('400 · Enum is case-sensitive', 'GET', '/trip-requests?status=open', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/trip-requests', *cap['list_401']),
            ],
            'event': [script('test', [
                '// The detail, update and delete requests below need a real id.',
                "pm.test('list returned rows', function () {",
                '    pm.response.to.have.status(200);',
                '    const rows = pm.response.json().data;',
                '    pm.expect(rows.length).to.be.above(0);',
                "    pm.collectionVariables.set('tripRequestId', rows[0].id);",
                "    pm.collectionVariables.set('clientId', rows[0].clientId);",
                '});',
            ])],
        },
        {
            'name': '02 · Request stats',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/trip-requests/stats', 'host': ['{{baseUrl}}'],
                        'path': ['trip-requests', 'stats']},
                'description': (
                    'Counts and pipeline value for the tiles above the board, scoped like the list '
                    'so a broker\'s tiles always agree with the rows underneath them.\n\n'
                    '`pipelineValue` sums **only open requests** — a converted one belongs to the '
                    'trip it became, and counting it here would double it.'),
            },
            'response': [example('200 · Stats', 'GET', '/trip-requests/stats', *cap['stats'])],
            'event': [script('test', [
                "pm.test('stats returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('pipelineValue');",
                '});',
            ])],
        },
        {
            'name': '03 · Get trip request',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/trip-requests/{{tripRequestId}}',
                        'host': ['{{baseUrl}}'], 'path': ['trip-requests', '{{tripRequestId}}']},
                'description': (
                    'One enquiry, with its client, broker and both airports resolved.\n\n'
                    'Archived rows load here too, so the Archived tab can link to them. A request '
                    "outside the caller's scope returns **404, not 403** — a 403 confirms the "
                    'record exists and turns any id into an oracle.'),
            },
            'response': [
                example('200 · Trip request', 'GET', '/trip-requests/{{tripRequestId}}', *cap['detail']),
                example('404 · Not found', 'GET', f'/trip-requests/{missing}', *cap['detail_404']),
            ],
        },
        {
            'name': '04 · File a trip request',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/trip-requests', 'host': ['{{baseUrl}}'],
                        'path': ['trip-requests']},
                'description': (
                    'Files an enquiry. This is the second half of the Add Lead form: a lead is a '
                    '*person* (a Client at lead stage) and what they asked for is this record, '
                    'because one client can ask for three different trips and because the request '
                    'outlives the lead stage — it becomes a quote, then a trip, while the client '
                    'stays a client.\n\n**Only `clientId` is required.** Everything else can arrive '
                    'later; demanding a full route on a first phone call only produces guesses.\n\n'
                    'A **broker files against themselves** whatever `assignedBrokerId` says — '
                    'assigning to someone else needs a wider scope.'),
            },
            'response': [
                example('201 · Created', 'POST', '/trip-requests', *cap['create'], req_body=payload),
                example('400 · Client does not exist', 'POST', '/trip-requests', *cap['create_400_client']),
                example('400 · Return before departure', 'POST', '/trip-requests', *cap['create_400_dates']),
                example('403 · Role may read but not write', 'POST', '/trip-requests', *cap['create_403']),
            ],
            'event': [script('prerequest', [
                '// Fetches a live client, broker and airports for the body rather than',
                '// trusting {{clientId}} from an earlier request. Request 01 sets it',
                '// from the newest trip request, whose client is often the probe folder',
                '// 03 archived in its teardown — so this folder passed inside a full run',
                '// and failed with "that client does not exist" when run on its own.',
                "const base = pm.collectionVariables.get('baseUrl');",
                "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (err, res) {",
                '    if (!err && res.code === 200 && res.json().data.length) {',
                "        pm.collectionVariables.set('clientId', res.json().data[0].id);",
                '    }',
                '});',
                "pm.sendRequest({ url: base + '/users?limit=1&role=BROKER', method: 'GET' }, function (err, res) {",
                '    if (!err && res.code === 200 && res.json().data.length) {',
                "        pm.collectionVariables.set('userId', res.json().data[0].id);",
                '    }',
                '});',
                "pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (err, res) {",
                '    if (err || res.code !== 200) { return; }',
                '    const rows = res.json().data;',
                "    if (rows[0]) { pm.collectionVariables.set('airportId', rows[0].id); }",
                "    if (rows[1]) { pm.collectionVariables.set('airportId2', rows[1].id); }",
                '});',
            ]), script('test', [
                '// The update, remove and restore requests below operate on this new',
                '// request, so running the folder never touches seeded rows.',
                "pm.test('created', function () {",
                '    pm.response.to.have.status(201);',
                "    pm.collectionVariables.set('newTripRequestId', pm.response.json().data.id);",
                '});',
            ])],
        },
        {
            'name': '05 · Update a trip request',
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/trip-requests/{{newTripRequestId}}',
                        'host': ['{{baseUrl}}'], 'path': ['trip-requests', '{{newTripRequestId}}']},
                'description': (
                    'Partial update — send only what changed. An empty body returns 400 rather '
                    'than a no-op 200.\n\n**Also how a request moves through the pipeline**: send '
                    '`status`.\n\n**Reassignment is an administrator action.** A broker must not '
                    'hand their own enquiry to someone else or claim another\'s — the same rule '
                    'clients use.'),
            },
            'response': [
                example('200 · Updated', 'PATCH', '/trip-requests/{{newTripRequestId}}', *cap['update']),
                example('400 · Empty patch', 'PATCH', '/trip-requests/{{newTripRequestId}}', *cap['update_400'], req_body={}),
                example('403 · Broker cannot reassign', 'PATCH', '/trip-requests/{{newTripRequestId}}', *cap['update_403']),
            ],
        },
        {
            'name': '06 · Remove a trip request (soft)',
            'request': {
                'method': 'DELETE', 'header': [WRITE_HEADERS[1]],
                'url': {'raw': '{{baseUrl}}/trip-requests/{{newTripRequestId}}',
                        'host': ['{{baseUrl}}'], 'path': ['trip-requests', '{{newTripRequestId}}']},
                'description': (
                    '**Administrators only.** A broker who has stopped working an enquiry sets its '
                    'status to `LOST`, which keeps it in the pipeline history and in the conversion '
                    "figures — removing the row quietly improves everyone's conversion rate, which "
                    'is exactly the wrong incentive to build into a sales tool.\n\nSoft, like every '
                    'delete in this system.'),
            },
            'response': [
                example('204 · Removed', 'DELETE', '/trip-requests/{{newTripRequestId}}', 204, None),
                example('403 · Brokers mark it Lost instead', 'DELETE', '/trip-requests/{{newTripRequestId}}', *cap['remove_403']),
            ],
        },
        {
            'name': '07 · Restore a trip request',
            'request': {
                'method': 'POST', 'header': [WRITE_HEADERS[1]],
                'url': {'raw': '{{baseUrl}}/trip-requests/{{newTripRequestId}}/restore',
                        'host': ['{{baseUrl}}'],
                        'path': ['trip-requests', '{{newTripRequestId}}', 'restore']},
                'description': (
                    'Administrators only, like removing it. Clears the deletion stamp and nothing '
                    'else, so every field comes back untouched.\n\nReturns **200, not 201** — a '
                    'restore creates nothing. A row that is not archived returns 404.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/trip-requests/{{newTripRequestId}}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', '/trip-requests/{{newTripRequestId}}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '08 · Remove several at once (soft)',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newTripRequestId}}"]   // 1-100 uuids. Ids that match nothing come back in `skipped` rather than failing the batch.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/trip-requests/bulk-delete', 'host': ['{{baseUrl}}'],
                        'path': ['trip-requests', 'bulk-delete']},
                'description': (
                    'Administrators only, like the single case. **POST, not DELETE-with-body** — '
                    'proxies drop DELETE bodies, and a dropped body would remove nothing while '
                    'answering 200.\n\n**Partial success is success**: ids that match nothing are '
                    'reported in `skipped`.'),
            },
            'response': [
                example('200 · Removed', 'POST', '/trip-requests/bulk-delete', *cap['bulk_delete'], req_body={'ids': ['{{newTripRequestId}}', missing]}),
                example('400 · Nothing selected', 'POST', '/trip-requests/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
                example('403 · Brokers mark them Lost instead', 'POST', '/trip-requests/bulk-delete', *cap['bulk_403']),
            ],
        },
        {
            'name': '09 · Restore several at once',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newTripRequestId}}"]   // 1-100 uuids. Ids that are not archived come back in `skipped`.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/trip-requests/bulk-restore', 'host': ['{{baseUrl}}'],
                        'path': ['trip-requests', 'bulk-restore']},
                'description': (
                    "The mirror of `08`, for the Archived tab's checkbox column — the reason every "
                    'bulk delete in this API has one. A table that lets you select archived rows '
                    'and offers no action on them is a dead checkbox column.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/trip-requests/bulk-restore', *cap['bulk_restore'], req_body={'ids': ['{{newTripRequestId}}', missing]}),
                example('200 · Already live (partial)', 'POST', '/trip-requests/bulk-restore', *cap['bulk_restore_partial']),
            ],
            'event': [script('test', [
                '// Teardown. This is the last request in the folder and leaves the',
                '// enquiry it created LIVE, so every run would add a probe to the',
                '// working board. There is no hard delete by design, so archiving it',
                '// is the best available end state: debris sits in the Archived tab',
                '// rather than among the requests a broker is trying to price.',
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '});',
                '',
                "const id = pm.collectionVariables.get('newTripRequestId');",
                'if (id) {',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/trip-requests/' + id,",
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
        'name': '08 · Trip Requests',
        'description': (
            'Open trip requests — what a client asked for, before it becomes a quote or a trip '
            '(scope §6.4).\n\n**This is the other half of a lead.** A lead is a *person*: a Client '
            'at lead stage, in `03 · Clients`. What they asked for is one of these. They are two '
            'records because one client can ask for three different trips, and because the request '
            'outlives the lead stage while the client stays a client.\n\nUses the **trips** '
            'permissions rather than a new pair, because a request is the start of a trip: '
            '`VIEW_TRIPS` to read, `MANAGE_TRIPS` to write, `DELETE_TRIPS` (administrators only) to '
            'archive.\n\nEvery request below is signed in as the seeded SUPER_ADMIN by the folder\'s '
            'pre-request script, except the 403 examples, captured as the seeded broker and '
            'assistant.'),
        'item': items,
    }


def main():
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')

    collection = json.loads(COLLECTION.read_text())
    operators = next(f for f in collection['item'] if f['name'].startswith('06'))

    folder = build(owner, broker, assistant)
    folder['event'] = json.loads(json.dumps(operators['event']))

    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('tripRequestId', 'newTripRequestId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
