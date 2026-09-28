#!/usr/bin/env python3
"""
Builds the `09 · Operator Sourcing` folder, capturing every example live.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_operator_sourcing_folder.py

Examples are captured, never typed. A hand-written example drifts from the
response the moment a field is added, and the collection is a deliverable —
the whole point is that what it shows is what the API actually returns.

Re-runnable: the quote it creates is archived at the end, so running it twice
does not grow the sourcing board.
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
MISSING = '00000000-0000-4000-8000-000000000000'


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

SORTABLE = 'createdAt | updatedAt | requestedAt | respondedAt | price | status'
STATUSES = 'AWAITING_RESPONSE | RECEIVED | APPROVED | REJECTED | DECLINED'

CREATE_BODY = """{
  "tripRequestId": "{{tripRequestId}}",                // required · uuid of a live trip request you can see. Sourcing hangs off an enquiry — there is no free-standing quote.
  "operatorId": "{{operatorId}}",                      // required · uuid of a live operator. An archived one returns 400 saying so, rather than "does not exist".

  "suggestedAircraft": "Challenger 650 or similar",    // optional · max 200 chars. What WE asked for, in the broker's words. Free text on purpose: the ask describes a mission, not one airframe we already hold.

  // What they offered. Two fields, deliberately: aircraftId is the real tail
  // when it is one we hold — and it must be on THIS operator's certificate, or
  // 400 — and the text fields carry what the operator wrote when it is not.
  // Operators fly tails we have never entered; refusing the quote over that
  // would lose the quote.
  "aircraftId": null,                                  // optional · uuid, or null
  "quotedAircraft": "Challenger 650",                  // optional · max 200 chars
  "quotedTailNumber": "N650XY",                        // optional · max 12 chars

  // A price may be sent with the ask. A broker who got the number on the call
  // would otherwise have to record a response a second later, logging a
  // response time of zero for a quote that took a day. Sent with a price, the
  // quote starts at RECEIVED; without one, at AWAITING_RESPONSE.
  "price": 29850,                                      // optional · number 0-100000000, whole currency units, USD. DECIMAL not float — money does not round in binary. 0 is a real quote (a waived positioning leg), which is why the floor is 0 and not 1.

  "amenities": ["WiFi", "Full Galley"],                // optional · up to 30 chips, each 1-60 chars. Same vocabulary as Aircraft.amenities so the comparison view reads one list. Replaced wholesale on update, never merged.
  "terms": "Net 30. 50% fee within 48 hours.",         // optional · max 2000 chars. Free text: every operator words these differently, and parsing them into columns is what scope §18 warns breaks.

  "internalNotes": "Called Dana directly."             // optional · max 2000 chars. Never shown to a client or an operator.
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH. Send only what changed; anything
  // omitted is left alone, and null clears.
  //
  // `status` is deliberately NOT accepted here. A quote moves through its
  // states by the endpoints that mean something — record a response, approve,
  // reject, decline, reopen — because each carries a rule a PATCH would walk
  // straight past. Approving has to check no other quote on the enquiry is
  // already approved; recording a response has to stamp the clock the operator
  // scorecard is measured with.
  "price": 28900,

  "terms": "Net 30. Revised after the call.",

  "internalNotes": "Came down after we mentioned the Flexjet number."
}"""

RESPONSE_BODY = """{
  // The operator came back. Stamps the response clock ONCE and never again, so
  // a later correction cannot restart it and flatter them — corrections go
  // through PATCH. Refused with 409 on a quote already approved, rejected or
  // declined; reopen it first.
  "price": 31200,                                      // optional · number 0-100000000

  "quotedAircraft": "Challenger 650",                  // optional · max 200 chars
  "quotedTailNumber": "N650XY",                        // optional · max 12 chars
  "aircraftId": null,                                  // optional · uuid of a tail on THIS operator's certificate, or null

  "amenities": ["WiFi", "Flight Attendant"],           // optional · up to 30 chips
  "terms": "Net 15. 10% non-refundable deposit."       // optional · max 2000 chars
}"""

DECIDE_BODY = """{
  // Optional on an approval, worth insisting on for a rejection: "why did we
  // not go with them" is what the next sourcing round and the operator
  // scorecard both read. Not enforced as required, because a broker clearing a
  // stale board should not be blocked into inventing a reason.
  "decisionNote": "Best price, and the only one with a galley."
}"""


def build(owner, broker, assistant):
    request_id = owner.request(
        'GET', '/trip-requests?limit=1&openOnly=true')[1]['data'][0]['id']
    operators = owner.request('GET', '/operators?limit=5')[1]['data']
    seeded_quote = owner.request('GET', '/operator-quotes?limit=1')[1]['data'][0]

    # An operator nobody has been asked for this enquiry yet, so the probe does
    # not collide with the seeded quotes.
    asked = {
        q['operatorId']
        for q in owner.request(
            'GET', f'/operator-quotes?tripRequestId={request_id}&limit=50')[1]['data']
    }
    free = next(o for o in operators if o['id'] not in asked)

    payload = {
        'tripRequestId': request_id,
        'operatorId': free['id'],
        'suggestedAircraft': 'Challenger 650 or similar',
        'aircraftId': None,
        'quotedAircraft': 'Challenger 650',
        'quotedTailNumber': 'N650XY',
        'price': 29850,
        'amenities': ['WiFi', 'Full Galley'],
        'terms': 'Net 30. 50% fee within 48 hours.',
        'internalNotes': 'Called Dana directly.',
    }

    cap = {}
    cap['list'] = owner.request('GET', '/operator-quotes?page=1&limit=3')
    cap['list_one'] = owner.request(
        'GET', f'/operator-quotes?tripRequestId={request_id}')
    cap['list_400'] = owner.request('GET', '/operator-quotes?status=received')
    cap['list_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/operator-quotes', 'timestamp': '2026-09-17T06:00:00.000Z',
    })
    cap['stats'] = owner.request('GET', '/operator-quotes/stats')
    cap['detail'] = owner.request('GET', f"/operator-quotes/{seeded_quote['id']}")
    cap['detail_404'] = owner.request('GET', f'/operator-quotes/{MISSING}')

    cap['create'] = owner.request('POST', '/operator-quotes', payload)
    new_id = cap['create'][1]['data']['id']
    cap['create_409'] = owner.request('POST', '/operator-quotes', payload)
    cap['create_400_operator'] = owner.request('POST', '/operator-quotes', {
        'tripRequestId': request_id, 'operatorId': MISSING,
    })
    cap['create_403'] = assistant.request('POST', '/operator-quotes', payload)

    cap['update'] = owner.request('PATCH', f'/operator-quotes/{new_id}', {
        'price': 28900,
        'terms': 'Net 30. Revised after the call.',
        'internalNotes': 'Came down after we mentioned the Flexjet number.',
    })
    cap['update_404'] = owner.request(
        'PATCH', f'/operator-quotes/{MISSING}', {'price': 1000})

    cap['response'] = owner.request('POST', f'/operator-quotes/{new_id}/response', {
        'price': 31200,
        'quotedAircraft': 'Challenger 650',
        'quotedTailNumber': 'N650XY',
        'aircraftId': None,
        'amenities': ['WiFi', 'Flight Attendant'],
        'terms': 'Net 15. 10% non-refundable deposit.',
    })

    cap['approve'] = owner.request(
        'POST', f'/operator-quotes/{new_id}/approve',
        {'decisionNote': 'Best price, and the only one with a galley.'})
    # A second approval on the same enquiry, to show the 409 that names who is
    # already chosen rather than silently demoting them.
    other = owner.request('GET', f'/operator-quotes?tripRequestId={request_id}&limit=50')[1]['data']
    rival = next(q for q in other if q['id'] != new_id)
    cap['approve_409'] = owner.request(
        'POST', f"/operator-quotes/{rival['id']}/approve", {})

    cap['reopen'] = owner.request('POST', f'/operator-quotes/{new_id}/reopen')
    cap['reopen_409'] = owner.request('POST', f'/operator-quotes/{new_id}/reopen')

    cap['reject'] = owner.request('POST', f'/operator-quotes/{new_id}/reject', {
        'decisionNote': 'Client went with the cabin, not the price.',
    })
    cap['decline'] = owner.request(
        'POST', f"/operator-quotes/{rival['id']}/decline",
        {'decisionNote': 'No tail available on those dates.'})
    # Put the seeded rival back where the seed left it.
    owner.request('POST', f"/operator-quotes/{rival['id']}/reopen")

    cap['delete_403'] = broker.request('DELETE', f'/operator-quotes/{new_id}')
    cap['delete'] = owner.request('DELETE', f'/operator-quotes/{new_id}')
    cap['restore'] = owner.request('POST', f'/operator-quotes/{new_id}/restore')
    cap['bulk_delete'] = owner.request(
        'POST', '/operator-quotes/bulk-delete', {'ids': [new_id, MISSING]})
    cap['bulk_delete_partial'] = owner.request(
        'POST', '/operator-quotes/bulk-delete', {'ids': [new_id]})
    cap['bulk_restore'] = owner.request(
        'POST', '/operator-quotes/bulk-restore', {'ids': [new_id, MISSING]})

    # Leave the probe archived rather than on the working board.
    owner.request('DELETE', f'/operator-quotes/{new_id}')

    query = [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'search', 'value': '', 'disabled': True,
         'description': "Case-insensitive substring across the operator's name, the quoted aircraft and tail, and the linked tail's number and model."},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
        {'key': 'sortBy', 'value': 'createdAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt. A closed list — anything else returns 400.'},
        {'key': 'tripRequestId', 'value': '', 'disabled': True,
         'description': 'uuid. Every quote on one enquiry — how the comparison view loads.'},
        {'key': 'operatorId', 'value': '', 'disabled': True,
         'description': "uuid. One operator's quote history, which is what their scorecard is counted from."},
        {'key': 'aircraftId', 'value': '', 'disabled': True,
         'description': 'uuid. Only matches quotes that named a tail we hold.'},
        {'key': 'status', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {STATUSES}. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'openOnly', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false. `true` keeps only AWAITING_RESPONSE and RECEIVED — the ones still needing something from somebody.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false — live rows only. `true` returns ONLY archived ones.'},
    ]
    raw_query = '&'.join(f"{p['key']}={p['value']}" for p in query)

    def url(path, *segments, query_list=None):
        out = {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
               'path': ['operator-quotes'] + list(segments)}
        if query_list:
            out['query'] = query_list
        return out

    items = [
        {
            'name': '01 · List operator quotes',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/operator-quotes?' + raw_query, query_list=query),
                'description': (
                    'Operator sourcing — what each operator came back with on an enquiry '
                    '(scope §6.7 and §6.9).\n\n**Sourcing adds one table, not two.** The board\'s '
                    'rows are trip requests being worked: client, broker, route, departure and '
                    'budget are all TripRequest columns, and the New Sourcing Request form is the '
                    'trip-request form with a quote deadline added. The only genuinely new record '
                    'is this one.\n\n**Scoped through the enquiry.** A broker sees quotes on the '
                    'requests assigned to them plus any unassigned. Doing it through the relation '
                    'rather than copying `assignedBrokerId` onto the quote means reassigning a '
                    'request moves its quotes with it, with no backfill.\n\n**Two fields are '
                    'computed on every read and never stored**: `responseHours`, measured from the '
                    'ask to the answer, and `isOverdue`, the enquiry\'s quote deadline against '
                    'today. A stored "2h" is right for one day and wrong forever after, and the '
                    'operator scorecard is built on response speed.'),
            },
            'response': [
                example('200 · Page of quotes', 'GET', '/operator-quotes?page=1&limit=3', *cap['list']),
                example('200 · One enquiry’s comparison', 'GET', f'/operator-quotes?tripRequestId={request_id}', *cap['list_one']),
                example('400 · Enum is case-sensitive', 'GET', '/operator-quotes?status=received', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/operator-quotes', *cap['list_401']),
            ],
            'event': [script('test', [
                '// The requests below need a real quote, an enquiry and an operator.',
                "pm.test('list returned rows', function () {",
                '    pm.response.to.have.status(200);',
                '    const rows = pm.response.json().data;',
                '    pm.expect(rows.length).to.be.above(0);',
                "    pm.collectionVariables.set('operatorQuoteId', rows[0].id);",
                "    pm.collectionVariables.set('tripRequestId', rows[0].tripRequestId);",
                '});',
            ])],
        },
        {
            'name': '02 · Sourcing tiles',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/operator-quotes/stats', 'stats'),
                'description': (
                    'Counts by state plus the average response time, scoped like the list so a '
                    "broker's tiles always agree with the rows underneath them.\n\n"
                    '`averageResponseHours` is **null, never 0**, when nothing has been answered '
                    'yet. A desk that has just started sourcing has no response time, and 0 would '
                    'read as every operator replying instantly.'),
            },
            'response': [example('200 · Tiles', 'GET', '/operator-quotes/stats', *cap['stats'])],
            'event': [script('test', [
                "pm.test('stats returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('averageResponseHours');",
                '});',
            ])],
        },
        {
            'name': '03 · Get one quote',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/operator-quotes/{{operatorQuoteId}}', '{{operatorQuoteId}}'),
                'description': (
                    'Archived quotes load here too, because the Archived tab links straight to '
                    'them.\n\nA quote outside the caller’s scope returns **404, not 403** — a 403 '
                    'confirms the record exists and turns any id into an oracle.'),
            },
            'response': [
                example('200 · Quote record', 'GET', f"/operator-quotes/{seeded_quote['id']}", *cap['detail']),
                example('404 · Not found or out of scope', 'GET', f'/operator-quotes/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '04 · Ask an operator to quote',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes'),
                'description': (
                    'Creates the ask and moves the enquiry to **SOURCING**.\n\n**One live ask per '
                    'operator per enquiry.** Asking the same operator twice is a mistake, not a '
                    'second quote, and the comparison view would show them twice — the duplicate '
                    'returns 409. Enforced in the service so the message explains itself, and by a '
                    'partial unique index in Postgres so it still holds when two brokers send the '
                    'same ask at the same moment.\n\nA price may be sent with the ask: sent with '
                    'one the quote starts at RECEIVED, without one at AWAITING_RESPONSE.'),
            },
            'response': [
                example('201 · Asked', 'POST', '/operator-quotes', *cap['create'], req_body=payload),
                example('409 · Already asked this operator', 'POST', '/operator-quotes', *cap['create_409'], req_body=payload),
                example('400 · Unknown operator', 'POST', '/operator-quotes', *cap['create_400_operator'],
                        req_body={'tripRequestId': request_id, 'operatorId': MISSING}),
                example('403 · Assistant cannot source', 'POST', '/operator-quotes', *cap['create_403'], req_body=payload),
            ],
            'event': [script('test', [
                "pm.test('asked', function () {",
                '    pm.response.to.have.status(201);',
                "    pm.collectionVariables.set('operatorQuoteId', pm.response.json().data.id);",
                '    // Kept separately from the id the list captures, which later requests',
                '    // overwrite. The teardown needs the row *this run* created.',
                "    pm.collectionVariables.set('newOperatorQuoteId', pm.response.json().data.id);",
                '});',
            ])],
        },
        {
            'name': '05 · Edit a quote',
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/{{operatorQuoteId}}', '{{operatorQuoteId}}'),
                'description': (
                    'Corrects the ask or the recorded answer. **Does not move the quote’s state** '
                    'and does not accept `status` — use the response and decision endpoints below, '
                    'which enforce the rules those transitions carry.'),
            },
            'response': [
                example('200 · Updated', 'PATCH', '/operator-quotes/{{operatorQuoteId}}', *cap['update'],
                        req_body={'price': 28900, 'terms': 'Net 30. Revised after the call.'}),
                example('404 · Not found or out of scope', 'PATCH', f'/operator-quotes/{MISSING}', *cap['update_404'],
                        req_body={'price': 1000}),
            ],
        },
        {
            'name': '06 · Record the response',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': RESPONSE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/{{operatorQuoteId}}/response', '{{operatorQuoteId}}', 'response'),
                'description': (
                    'The operator came back. Moves the quote to **RECEIVED** and stamps '
                    '`respondedAt` — **once, and never again**, so a later correction cannot '
                    'restart the clock and flatter them. Corrections go through PATCH.\n\n'
                    'Returns 409 on a quote already approved, rejected or declined; reopen it '
                    'first.'),
            },
            'response': [
                example('200 · Response recorded', 'POST', '/operator-quotes/{{operatorQuoteId}}/response', *cap['response'],
                        req_body={'price': 31200, 'terms': 'Net 15. 10% non-refundable deposit.'}),
            ],
        },
        {
            'name': '07 · Approve a quote',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/{{operatorQuoteId}}/approve', '{{operatorQuoteId}}', 'approve'),
                'description': (
                    'Chooses this operator for the trip, and moves the enquiry to **QUOTED**.\n\n'
                    '**Only one quote per request can be approved.** A second attempt returns 409 '
                    'naming the operator already chosen, rather than silently demoting them — two '
                    'approved quotes would mean two operators booked for one flight, and the fix '
                    'has to be a deliberate act: reopen the wrong one, then approve the right one.'),
            },
            'response': [
                example('200 · Approved', 'POST', '/operator-quotes/{{operatorQuoteId}}/approve', *cap['approve'],
                        req_body={'decisionNote': 'Best price, and the only one with a galley.'}),
                example('409 · Another operator already approved', 'POST', f"/operator-quotes/{rival['id']}/approve", *cap['approve_409'], req_body={}),
            ],
        },
        {
            'name': '08 · Reject a quote',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/{{operatorQuoteId}}/reject', '{{operatorQuoteId}}', 'reject'),
                'description': (
                    'The broker rules this one out. **It stays in the comparison and in the '
                    'operator’s scorecard** — that is the difference between rejecting a quote and '
                    'archiving it, and why brokers can do the first but not the second.'),
            },
            'response': [
                example('200 · Rejected', 'POST', '/operator-quotes/{{operatorQuoteId}}/reject', *cap['reject'],
                        req_body={'decisionNote': 'Client went with the cabin, not the price.'}),
            ],
        },
        {
            'name': '09 · Record a decline',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/{{operatorQuoteId}}/decline', '{{operatorQuoteId}}', 'decline'),
                'description': (
                    'The operator came back and said no. Kept distinct from a rejection: one '
                    'counts against their availability, the other against their price.\n\nBoth '
                    'count as a reply, so neither hides from their response rate — an operator who '
                    'declines promptly is not the same as one who never answers.'),
            },
            'response': [
                example('200 · Declined', 'POST', f"/operator-quotes/{rival['id']}/decline", *cap['decline'],
                        req_body={'decisionNote': 'No tail available on those dates.'}),
            ],
        },
        {
            'name': '10 · Undo a decision',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'url': url('/operator-quotes/{{operatorQuoteId}}/reopen', '{{operatorQuoteId}}', 'reopen'),
                'description': (
                    'Returns an approved, rejected or declined quote to where it was — RECEIVED if '
                    'the operator had answered, AWAITING_RESPONSE if not.\n\nWithout this a '
                    'mis-click on Approve is unfixable, because the board disables both buttons '
                    'once a quote is decided. Returns 409 on a quote that has not been decided.'),
            },
            'response': [
                example('200 · Reopened', 'POST', '/operator-quotes/{{operatorQuoteId}}/reopen', *cap['reopen']),
                example('409 · Not decided yet', 'POST', '/operator-quotes/{{operatorQuoteId}}/reopen', *cap['reopen_409']),
            ],
        },
        {
            'name': '11 · Remove a quote (soft)',
            'request': {
                'method': 'DELETE', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': url('/operator-quotes/{{operatorQuoteId}}', '{{operatorQuoteId}}'),
                'description': (
                    'Soft delete — `deletedAt` is set and nothing is destroyed. **Administrators '
                    'only.**\n\nNever the way to say "we are not going with them": that is Reject, '
                    'which keeps the quote in the comparison and in the operator’s scorecard. A '
                    'broker quietly removing a quote that came in over budget would improve their '
                    'own sourcing numbers, which is the wrong incentive to build into the tool.'),
            },
            'response': [
                example('403 · Broker cannot remove', 'DELETE', '/operator-quotes/{{operatorQuoteId}}', *cap['delete_403']),
                example('204 · Removed', 'DELETE', '/operator-quotes/{{operatorQuoteId}}', *cap['delete']),
            ],
        },
        {
            'name': '12 · Restore a quote',
            'request': {
                'method': 'POST', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': url('/operator-quotes/{{operatorQuoteId}}/restore', '{{operatorQuoteId}}', 'restore'),
                'description': (
                    'Brings an archived quote back exactly as it was.\n\nReturns **409** if the '
                    'operator has since been asked again for this request — one live ask per '
                    'operator per enquiry — rather than surfacing a raw constraint violation.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/operator-quotes/{{operatorQuoteId}}/restore', *cap['restore']),
            ],
        },
        {
            'name': '13 · Remove several (soft)',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{operatorQuoteId}}"]      // required · 1-100 uuids. Unknown or already-archived ids are reported in `skipped` rather than failing the batch.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/bulk-delete', 'bulk-delete'),
                'description': (
                    'Administrators only, same rule as the single remove.\n\nPartial success is '
                    'the design: ids that were already archived or do not exist come back in '
                    '`skipped`, so one stale row in a selection does not lose the whole action.'),
            },
            'response': [
                example('200 · Removed (partial)', 'POST', '/operator-quotes/bulk-delete', *cap['bulk_delete'],
                        req_body={'ids': ['{{operatorQuoteId}}', MISSING]}),
                example('200 · Already removed', 'POST', '/operator-quotes/bulk-delete', *cap['bulk_delete_partial'],
                        req_body={'ids': ['{{operatorQuoteId}}']}),
            ],
        },
        {
            'name': '14 · Restore several',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{operatorQuoteId}}"]      // required · 1-100 uuids.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-quotes/bulk-restore', 'bulk-restore'),
                'description': (
                    'Any quote whose operator has since been asked again for the same request is '
                    'reported in `skipped` rather than failing the batch — one live ask per '
                    'operator per enquiry.'),
            },
            'response': [
                example('200 · Restored (partial)', 'POST', '/operator-quotes/bulk-restore', *cap['bulk_restore'],
                        req_body={'ids': ['{{operatorQuoteId}}', MISSING]}),
            ],
            'event': [script('test', [
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '});',
                '',
                '// Teardown. This is the last request in the folder, and the folder ends',
                '// by restoring the quote it created — so every run would otherwise leave',
                '// one more live quote on the sourcing board. Clients, airports and',
                '// operators each accumulated dozens that way before anyone noticed.',
                '//',
                '// There is no hard delete in this system by design, so the run cannot',
                '// erase its own row. Archiving it is the best available end state.',
                "const id = pm.collectionVariables.get('newOperatorQuoteId');",
                'if (id) {',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/operator-quotes/' + id,",
                "        method: 'DELETE',",
                "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                '    }, function (err) {',
                "        if (err) { console.warn('teardown could not archive ' + id, err); }",
                '    });',
                "    pm.collectionVariables.set('newOperatorQuoteId', '');",
                '}',
            ])],
        },
    ]

    return {
        'name': '09 · Operator Sourcing',
        'description': (
            'Asking operators to price an enquiry, and comparing what comes back (scope §6.7 and '
            '§6.9).\n\n**One new table, not two.** The sourcing board\'s rows are trip requests '
            'being worked — the same record the Open Requests board shows — so the only genuinely '
            'new entity here is the operator\'s answer. A second requests table would have split '
            'one enquiry across two rows the way a leads table would have split one client.\n\n'
            'Uses the **trips** permissions rather than its own pair: sourcing is a stage of a '
            'trip, not something a role is granted separately. `VIEW_TRIPS` to read, `MANAGE_TRIPS` '
            'to write, `DELETE_TRIPS` (administrators only) to archive.\n\nEvery request below is '
            'signed in as the seeded SUPER_ADMIN by the folder\'s pre-request script, except the '
            '403 examples, which were captured as the seeded assistant and broker.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')

    collection = json.loads(COLLECTION.read_text())

    requests_folder = next(
        f for f in collection['item'] if f['name'].startswith('08'))
    folder = build(owner, broker, assistant)
    folder['event'] = json.loads(json.dumps(requests_folder['event']))

    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('operatorQuoteId', 'newOperatorQuoteId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    # Two-space indent and escaped non-ASCII, matching how Postman itself writes
    # the file — anything else reformats all 9,000 lines.
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
