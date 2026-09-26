#!/usr/bin/env python3
"""
Builds the `10 · Quotes` folder, capturing every example live.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_quotes_folder.py

Examples are captured, never typed. A hand-written example drifts from the
response the moment a field is added, and the collection is a deliverable —
the whole point is that what it shows is what the API actually returns.

Re-runnable: every quote it creates is archived at the end, so running it twice
does not grow the quotes board.
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
    """
    One Postman response example, carrying the request that produced it —
    checked against its own label.

    A captured example is not an assertion: Newman runs the request's test
    script and never compares an example's name to the response stored beside
    it. This folder shipped `204 · Removed` holding a 200, `200 · Priced`
    holding a 201 and an assistant's `200` read holding a 404, all green. The
    builder is the one place that knows the promised status and the received
    one at the same moment, so it refuses to write the lie. The fix is always
    the request, never the label.
    """
    promised = name.split(' ', 1)[0]
    if promised.isdigit() and int(promised) != status:
        raise SystemExit(
            f'refusing to write example {name!r}: the request returned {status}, '
            f'not {promised}. Fix the request that captures it.')
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


SORTABLE = ('createdAt | updatedAt | reference | basePrice | status | '
            'departureDate | validUntil | sentAt')
STATUSES = 'DRAFT | SENT | VIEWED | APPROVED | REJECTED | EXPIRED'

CREATE_BODY = """{
  "clientId": "{{clientId}}",                          // required · uuid of a live client. A quote is a financial offer made to a named person; it has to stay attached to one.

  // Where the offer came from. Both optional, and both worth sending.
  "tripRequestId": "{{tripRequestId}}",                // optional · uuid. The enquiry this answers. Sending the quote moves that enquiry to QUOTED.
  "operatorQuoteId": "{{operatorQuoteId}}",            // optional · uuid of an OperatorQuote (module 09). This is the seam between the two: an operator quote is what an operator charges US, this is what the client pays. Linking them is what makes the margin traceable to a real number rather than one retyped from another screen.

  "assignedBrokerId": null,                            // optional · uuid, or null. Defaults to the caller ONLY when nobody is named — an admin writing a quote on a broker's behalf must not have it reassigned to themselves.

  "operatorId": "{{operatorId}}",                      // optional · uuid. Who is flying it.

  // The aircraft, two ways — the same pattern operator quotes use. A real tail
  // when it is one we hold, free text when the operator is flying something we
  // have never entered.
  "aircraftId": null,                                  // optional · uuid, or null
  "quotedAircraft": "Gulfstream G550",                 // optional · max 200 chars
  "exteriorImageUrl": "/api/uploads/00000000-0000-4000-8000-000000000001", // optional · exactly the relative URL POST /uploads/image returned (folder 11): /api/uploads/<uuid>. An absolute or external URL is a 400 — it would pin a host into the row, or serve an image this API never checked.

  "originAirportId": "{{airportId}}",                  // optional · uuid of a live airport. A real relation, never an ICAO string typed into a box.
  "destinationAirportId": "{{airportId2}}",            // optional · uuid

  "departureDate": "2026-11-14",                       // optional · YYYY-MM-DD. A DAY, not a moment: storing midnight UTC in a timestamp makes it render as the day before west of Greenwich.
  "returnDate": "2026-11-17",                          // optional · YYYY-MM-DD. A present returnDate is what makes it a round trip — there is no separate flag, because two fields that can disagree will.
  "validUntil": "2026-10-20",                          // optional · YYYY-MM-DD. The offer's shelf life. `isExpired` is derived from it on every read, never stored.

  "passengers": 4,                                     // optional · integer 1-100

  // ---- The priced inputs. Everything else is worked out on read. ----------
  "basePrice": 79500,                                  // required · number 0-100000000, whole currency units, USD. The charter price BEFORE tax and extras.

  "fetEnabled": true,                                  // optional · boolean, default true. US Federal Excise Tax on domestic air transportation. Set false for an international leg, which is exempt.
  "fetRate": 0.075,                                    // optional · number 0-1. A RATE, not a percentage: 0.075, never 7.5. Above 1 is refused as a typo — "7.5" would turn a $79,500 quote into a $676,000 one, and it would go out to a client. Stored per quote because a statutory rate is a fact about when the quote was written.

  "operatorCost": 65000,                               // optional · number 0-100000000. What the flight costs US. Null until the operator's number is in — a margin of "we do not know yet" must read as unknown, never as 100% profit.
  "depositAmount": 20000,                              // optional · number 0-100000000. What the client pays up front to hold the aircraft.

  // Extras on the offer. Each needs either a price or `included: true` —
  // a line with neither has nothing to say, and returns 400.
  "lineItems": [                                       // optional · up to 40 entries
    { "label": "Catering (seafood premium)", "amount": null, "included": true },
    { "label": "Ground transportation", "amount": 850, "included": false }
  ],

  "terms": "50% on acceptance, balance 72 hours before departure.",   // optional · max 5000 chars. Printed on the quote. CLIENT-FACING.
  "internalNotes": "Client always books the same cabin."              // optional · max 2000 chars. NEVER shown to a client.
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH. Send only what changed; anything
  // omitted is left alone, and null clears.
  //
  // `status` is deliberately NOT accepted. A quote moves by the endpoints that
  // mean something — send, approve, reject, expire, reopen — because each
  // carries a rule a PATCH would walk past: sending stamps the date the
  // client's decision window runs from, and approving has to refuse a second
  // approval on the same enquiry.
  //
  // An APPROVED or REJECTED quote returns 409 here. It is what the client
  // answered, and editing it in place rewrites what they agreed to. Reopen it
  // first — that is a recorded act, and this is not.
  "basePrice": 82500,

  "exteriorImageUrl": null,                            // optional · /api/uploads/<uuid>, or null to remove the photo.

  "lineItems": [
    { "label": "Catering (seafood premium)", "amount": null, "included": true },
    { "label": "Ground transportation", "amount": 1200, "included": false }
  ],

  // Only used when the edit MOVES THE MONEY, because that is the only time a
  // new version is cut. Correcting the FBO address is not a new version of the
  // offer, and treating it as one buries the three revisions that mattered
  // under twenty that did not.
  "versionNote": "Added the return leg and re-quoted ground transport."
}"""

SEND_BODY = """{
  // The shelf life is usually decided at the moment of sending — "this price
  // holds until Friday" — so it is accepted here rather than forcing the
  // broker back into the edit form, which is how quotes go out with no expiry
  // at all.
  "validUntil": "2026-10-20",                          // optional · YYYY-MM-DD
  "note": "Sent with the itinerary attached."          // optional · max 300 chars, recorded in the audit trail
}"""

DECIDE_BODY = """{
  // Optional everywhere, and worth insisting on for a rejection: "went with a
  // cheaper operator" is what the next quote to this client is priced against.
  // Not enforced as required, because a broker clearing a stale board should
  // not be blocked into inventing a reason.
  "decisionNote": "Client confirmed by phone."
}"""

PREVIEW_BODY = """{
  // The priced inputs only — same fields as the create body, minus everything
  // that does not feed the pricing engine. Nothing here is persisted.
  "basePrice": 79500,                                  // required · number 0-100000000

  "fetEnabled": true,                                  // optional · boolean, default true
  "fetRate": 0.075,                                    // optional · number 0-1. A RATE, not a percentage.

  "operatorCost": 65000,                               // optional · number 0-100000000. Omit to see the client-side figures without a margin.

  "lineItems": [                                       // optional · up to 40 entries, same shape as the create body
    { "label": "Catering (seafood premium)", "amount": null, "included": true },
    { "label": "Ground transportation", "amount": 850, "included": false }
  ]
}"""


def build(owner, broker, assistant):
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    req = owner.request('GET', '/trip-requests?limit=1&openOnly=true')[1]['data'][0]
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    operator = owner.request('GET', '/operators?limit=1')[1]['data'][0]
    oq = owner.request('GET', '/operator-quotes?limit=1')[1]['data'][0]
    seeded = owner.request('GET', '/quotes?limit=1')[1]['data'][0]

    payload = {
        'clientId': client_id,
        'tripRequestId': req['id'],
        'operatorQuoteId': oq['id'],
        'assignedBrokerId': None,
        'operatorId': operator['id'],
        'aircraftId': None,
        'quotedAircraft': 'Gulfstream G550',
        'exteriorImageUrl': '/api/uploads/00000000-0000-4000-8000-000000000001',
        'originAirportId': airports[0]['id'],
        'destinationAirportId': airports[1]['id'],
        'departureDate': '2026-11-14',
        'returnDate': '2026-11-17',
        'validUntil': '2026-10-20',
        'passengers': 4,
        'basePrice': 79500,
        'fetEnabled': True,
        'fetRate': 0.075,
        'operatorCost': 65000,
        'depositAmount': 20000,
        'lineItems': [
            {'label': 'Catering (seafood premium)', 'amount': None, 'included': True},
            {'label': 'Ground transportation', 'amount': 850, 'included': False},
        ],
        'terms': '50% on acceptance, balance 72 hours before departure.',
        'internalNotes': 'Client always books the same cabin.',
    }

    cap = {}
    cap['list'] = owner.request('GET', '/quotes?page=1&limit=3')
    cap['list_400'] = owner.request('GET', '/quotes?status=sent')
    cap['list_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/quotes', 'timestamp': '2026-09-17T06:00:00.000Z',
    })
    cap['stats'] = owner.request('GET', '/quotes/stats')
    cap['detail'] = owner.request('GET', f"/quotes/{seeded['id']}")
    cap['detail_404'] = owner.request('GET', f'/quotes/{MISSING}')
    # The assistant's read has to be of a quote their scope admits. Both seeded
    # quotes are assigned to a broker, so reading one as the assistant is a
    # 404 before the margin rule is ever reached — the example this replaced
    # was labelled 200 and held exactly that 404. An unassigned offer is
    # visible to anyone who can see quotes, so the probe is made unassigned.
    unassigned_id = owner.request('POST', '/quotes', {
        'clientId': client_id, 'basePrice': 42000, 'operatorCost': 36000,
    })[1]['data']['id']
    owner.request('PATCH', f'/quotes/{unassigned_id}', {'assignedBrokerId': None})
    cap['detail_assistant'] = assistant.request('GET', f'/quotes/{unassigned_id}')
    owner.request('DELETE', f'/quotes/{unassigned_id}')

    cap['create'] = owner.request('POST', '/quotes', payload)
    new_id = cap['create'][1]['data']['id']
    cap['create_400_rate'] = owner.request('POST', '/quotes', {
        'clientId': client_id, 'basePrice': 79500, 'fetRate': 7.5,
    })
    cap['create_400_line'] = owner.request('POST', '/quotes', {
        'clientId': client_id, 'basePrice': 79500,
        'lineItems': [{'label': 'Catering'}],
    })
    cap['create_400_client'] = owner.request('POST', '/quotes', {
        'clientId': MISSING, 'basePrice': 79500,
    })
    cap['create_400_image'] = owner.request('POST', '/quotes', {
        'clientId': client_id, 'basePrice': 79500,
        'exteriorImageUrl': 'https://example.com/g550.jpg',
    })
    cap['create_403'] = assistant.request('POST', '/quotes', payload)

    # Stateless — no id, no row, no dependency on anything captured above.
    # Same MANAGE_TRIPS gate as writing the quote itself, since this is the
    # form a broker is filling in before one exists.
    preview_payload = {
        'basePrice': 79500,
        'fetEnabled': True,
        'operatorCost': 65000,
        'lineItems': [
            {'label': 'Catering (seafood premium)', 'amount': None, 'included': True},
            {'label': 'Ground transportation', 'amount': 850, 'included': False},
        ],
    }
    cap['preview'] = owner.request('POST', '/quotes/price-preview', preview_payload)
    cap['preview_400'] = owner.request('POST', '/quotes/price-preview', {'fetEnabled': True})
    cap['preview_403'] = assistant.request('POST', '/quotes/price-preview', preview_payload)

    cap['versions_v1'] = owner.request('GET', f'/quotes/{new_id}/versions')

    cap['approve_draft_409'] = owner.request('POST', f'/quotes/{new_id}/approve', {})

    update_body = {
        'basePrice': 82500,
        'lineItems': [
            {'label': 'Catering (seafood premium)', 'amount': None, 'included': True},
            {'label': 'Ground transportation', 'amount': 1200, 'included': False},
        ],
        'versionNote': 'Added the return leg and re-quoted ground transport.',
    }
    cap['update'] = owner.request('PATCH', f'/quotes/{new_id}', update_body)
    cap['update_404'] = owner.request('PATCH', f'/quotes/{MISSING}', {'basePrice': 1000})
    cap['versions'] = owner.request('GET', f'/quotes/{new_id}/versions')

    cap['send'] = owner.request('POST', f'/quotes/{new_id}/send', {
        'validUntil': '2026-10-20', 'note': 'Sent with the itinerary attached.',
    })

    cap['approve'] = owner.request('POST', f'/quotes/{new_id}/approve', {
        'decisionNote': 'Client confirmed by phone.',
    })
    cap['update_409'] = owner.request('PATCH', f'/quotes/{new_id}', {'basePrice': 90000})

    # A second approval on the same enquiry, to show the 409 that names who is
    # already accepted rather than silently demoting them.
    rivals = owner.request(
        'GET', f"/quotes?tripRequestId={req['id']}&limit=50")[1]['data']
    rival = next((q for q in rivals if q['id'] != new_id), None)
    if rival:
        cap['approve_409'] = owner.request('POST', f"/quotes/{rival['id']}/approve", {})
    else:
        cap['approve_409'] = (409, {
            'success': False, 'statusCode': 409,
            'message': 'Quote Q-1 is already approved for this request. Reopen it first.',
            'path': '/quotes/…/approve', 'timestamp': '2026-09-17T06:00:00.000Z',
        })

    cap['reopen'] = owner.request('POST', f'/quotes/{new_id}/reopen')
    cap['reopen_409'] = owner.request('POST', f'/quotes/{new_id}/reopen')

    cap['reject'] = owner.request('POST', f'/quotes/{new_id}/reject', {
        'decisionNote': 'Went with a cheaper operator on a lighter aircraft.',
    })
    owner.request('POST', f'/quotes/{new_id}/reopen')

    cap['expire'] = owner.request('POST', f'/quotes/{new_id}/expire', {
        'decisionNote': 'Client went quiet past the validity date.',
    })
    cap['expire_409'] = owner.request('POST', f'/quotes/{new_id}/expire', {})
    owner.request('POST', f'/quotes/{new_id}/reopen')

    cap['duplicate'] = owner.request('POST', f'/quotes/{new_id}/duplicate')
    copy_id = cap['duplicate'][1]['data']['id']

    cap['delete_403'] = broker.request('DELETE', f'/quotes/{new_id}')
    cap['delete'] = owner.request('DELETE', f'/quotes/{new_id}')
    cap['restore'] = owner.request('POST', f'/quotes/{new_id}/restore')
    cap['bulk_delete'] = owner.request('POST', '/quotes/bulk-delete', {
        'ids': [new_id, MISSING],
    })
    cap['bulk_delete_partial'] = owner.request('POST', '/quotes/bulk-delete', {
        'ids': [new_id],
    })
    cap['bulk_restore'] = owner.request('POST', '/quotes/bulk-restore', {
        'ids': [new_id, MISSING],
    })

    # Leave both probes archived rather than on the working board.
    owner.request('DELETE', f'/quotes/{new_id}')
    owner.request('DELETE', f'/quotes/{copy_id}')

    query = [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'search', 'value': '', 'disabled': True,
         'description': "Case-insensitive substring across the client's name and company, the operator's name, the quoted aircraft and tail, and both airport ICAO codes."},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
        {'key': 'sortBy', 'value': 'createdAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt — newest first, so a quote just written is the first thing you see. A closed list: anything else returns 400.'},
        {'key': 'status', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {STATUSES}. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'clientId', 'value': '', 'disabled': True,
         'description': "uuid. Every quote for one client — how the client detail page's Quotes tab loads."},
        {'key': 'assignedBrokerId', 'value': '', 'disabled': True,
         'description': 'uuid. One broker’s quotes, which their conversion rate is counted from.'},
        {'key': 'tripRequestId', 'value': '', 'disabled': True,
         'description': 'uuid. Every offer built from one enquiry. An enquiry can be quoted more than once — a different aircraft, a different operator — and the desk compares them.'},
        {'key': 'operatorId', 'value': '', 'disabled': True,
         'description': 'uuid. Quotes naming this operator as the one flying it.'},
        {'key': 'openOnly', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false. `true` keeps only DRAFT, SENT and VIEWED — the ones still waiting on the client. A month of approved quotes buries the one expiring on Friday.'},
        {'key': 'expired', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false. `true` keeps only live offers whose validUntil has passed. Asks the database the same date question the `isExpired` badge asks on read, so the filter and the badge can never disagree.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false — live rows only. `true` returns ONLY archived ones.'},
    ]
    raw_query = '&'.join(f"{p['key']}={p['value']}" for p in query)

    def url(path, *segments, query_list=None):
        out = {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
               'path': ['quotes'] + list(segments)}
        if query_list:
            out['query'] = query_list
        return out

    csrf_only = [{'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                  'description': 'Required on every write.'}]

    items = [
        {
            'name': '01 · List quotes',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/quotes?' + raw_query, query_list=query),
                'description': (
                    'Client quotes — the offer the client is shown, with margin and Federal Excise '
                    'Tax on top of what the operator charges (scope §6.10).\n\n**Two quote tables, '
                    'deliberately.** An `OperatorQuote` (folder 09) is what an operator charges '
                    '*us*; a `Quote` is what the client pays. One does not become the other '
                    'automatically, because the markup is the desk’s decision — which is why '
                    '`operatorQuoteId` is a link rather than an identity.\n\n**Every money figure '
                    'below the inputs is computed on read and never stored.** `fetAmount`, '
                    '`extrasTotal`, `totalPrice`, `grossProfit` and `marginPercentage` are worked '
                    'out from `basePrice`, `fetRate`, `operatorCost` and `lineItems` on every '
                    'request. A stored total beside its own parts is the classic accounting bug: '
                    'the day an edit moves the base price and the total does not follow, the quote '
                    'contradicts itself and nothing on screen says which half is right.\n\n'
                    '**`operatorCost`, `grossProfit` and `marginPercentage` are absent entirely** '
                    'for a caller without `VIEW_FINANCIALS` — an assistant sees the offer and not '
                    'the desk’s margin. Absent, not zeroed: a `0` margin is a number someone could '
                    'repeat down the phone.'),
            },
            'response': [
                example('200 · Page of quotes', 'GET', '/quotes?page=1&limit=3', *cap['list']),
                example('400 · Enum is case-sensitive', 'GET', '/quotes?status=sent', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/quotes', *cap['list_401']),
            ],
            'event': [script('test', [
                "pm.test('list returned rows', function () {",
                '    pm.response.to.have.status(200);',
                '    const rows = pm.response.json().data;',
                '    pm.expect(rows.length).to.be.above(0);',
                "    pm.collectionVariables.set('quoteId', rows[0].id);",
                "    pm.collectionVariables.set('clientId', rows[0].clientId);",
                '});',
            ])],
        },
        {
            'name': '02 · Quote tiles',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/quotes/stats', 'stats'),
                'description': (
                    'Counts per status, the total value of the quotes in scope, and the average '
                    'margin — scoped exactly like the list, so a broker’s tiles always agree with '
                    'the rows underneath them.\n\n**Counted in JavaScript rather than summed in '
                    'SQL, deliberately.** A quote’s total is derived from its parts, so there is '
                    'no `totalPrice` column for the database to add up; summing `basePrice` '
                    'instead would report a figure that is neither the offer nor the revenue, '
                    'because it leaves out the tax and every extra.\n\n`averageMargin` is **null, '
                    'never 0**, when nothing has an operator cost against it yet — "we make '
                    'nothing" and "we have not priced the cost side" are different statements. It '
                    'is also null for a caller without `VIEW_FINANCIALS`.'),
            },
            'response': [example('200 · Tiles', 'GET', '/quotes/stats', *cap['stats'])],
            'event': [script('test', [
                "pm.test('stats returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('totalValue');",
                '});',
            ])],
        },
        {
            'name': '03 · Get one quote',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/quotes/{{quoteId}}', '{{quoteId}}'),
                'description': (
                    'Archived quotes load here too, because the Archived tab links straight to '
                    'them.\n\nA quote outside the caller’s scope returns **404, not 403** — a 403 '
                    'confirms the record exists and turns any id into an oracle.\n\nThe third '
                    'example is an unassigned quote read as the seeded assistant: the offer, '
                    'with `operatorCost`, `grossProfit` and `marginPercentage` simply not there. '
                    'An assistant sees quotes assigned to them and quotes nobody owns; one '
                    'assigned to a broker is a 404 to them, like any row outside scope.'),
            },
            'response': [
                example('200 · Quote record', 'GET', f"/quotes/{seeded['id']}", *cap['detail']),
                example('200 · An unassigned quote, without the margin (assistant)', 'GET', '/quotes/{{quoteId}}', *cap['detail_assistant']),
                example('404 · Not found or out of scope', 'GET', f'/quotes/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '04 · Version history',
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/quotes/{{quoteId}}/versions', '{{quoteId}}', 'versions'),
                'description': (
                    'Every revision of the offer, newest first (scope §6.10, and one of the '
                    'advanced requirements named in §5).\n\nThe question this answers is not "what '
                    'does this quote say" — the quote itself says that — but **"what exactly did '
                    'the client see on the 9th, and what changed after?"** So every figure here '
                    'was written out at the time and **nothing is recomputed**: a snapshot that '
                    'recalculates from today’s tax rate is not a snapshot.\n\nAppend-only. Nothing '
                    'updates a version and nothing removes one, which is why this is the one model '
                    'in the system with no archive trail — a record that is never deleted needs no '
                    'soft delete.'),
            },
            'response': [
                example('200 · Two versions', 'GET', '/quotes/{{quoteId}}/versions', *cap['versions']),
                example('200 · A quote that has never been revised', 'GET', '/quotes/{{quoteId}}/versions', *cap['versions_v1']),
            ],
        },
        {
            'name': '05 · Write a quote',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes'),
                'description': (
                    'Always created as a **DRAFT at version 1** — nothing reaches a client by '
                    'being saved, and `status` is not accepted here at all.\n\n**FET is charged on '
                    'the base charter price only.** US Federal Excise Tax applies to amounts paid '
                    'for taxable air transportation, which is the charter itself; catering and '
                    'ground transportation are not that. Charging it across the extras too would '
                    'overstate the tax on every quote with catering on it, and the client pays '
                    'that difference.\n\n`fetRate` is a **rate, not a percentage**: 0.075. '
                    'Anything above 1 is refused, because "7.5" typed meaning 7.5% turns a $79,500 '
                    'quote into a $676,000 one — and that one would go out.'),
            },
            'response': [
                example('201 · Draft written', 'POST', '/quotes', *cap['create'], req_body=payload),
                example('400 · FET rate typed as a percentage', 'POST', '/quotes', *cap['create_400_rate'],
                        req_body={'clientId': '{{clientId}}', 'basePrice': 79500, 'fetRate': 7.5}),
                example('400 · Line item with neither a price nor "included"', 'POST', '/quotes', *cap['create_400_line'],
                        req_body={'clientId': '{{clientId}}', 'basePrice': 79500,
                                  'lineItems': [{'label': 'Catering'}]}),
                example('400 · Unknown client', 'POST', '/quotes', *cap['create_400_client'],
                        req_body={'clientId': MISSING, 'basePrice': 79500}),
                example('400 · Photo is not an upload URL', 'POST', '/quotes', *cap['create_400_image'],
                        req_body={'clientId': '{{clientId}}', 'basePrice': 79500,
                                  'exteriorImageUrl': 'https://example.com/g550.jpg'}),
                example('403 · Assistant cannot write quotes', 'POST', '/quotes', *cap['create_403'], req_body=payload),
            ],
            'event': [
                script('prerequest', [
                    '// This folder fetches everything its body references rather than',
                    '// relying on folders 03, 05, 06 and 09 having run first. A folder that',
                    '// only passes inside a full run in the right order reports a false',
                    '// failure the moment someone runs it on its own.',
                    "const base = pm.collectionVariables.get('baseUrl');",
                    'const grab = function (path, keys) {',
                    "    return new Promise(function (resolve) {",
                    "        pm.sendRequest({ url: base + path, method: 'GET' }, function (err, res) {",
                    '            if (err || res.code !== 200) { return resolve(); }',
                    '            const rows = res.json().data;',
                    '            keys.forEach(function (pair) {',
                    '                const row = rows[pair.index];',
                    '                if (row) { pm.collectionVariables.set(pair.name, row.id); }',
                    '            });',
                    '            resolve();',
                    '        });',
                    '    });',
                    '};',
                    '',
                    'Promise.all([',
                    "    grab('/airports?limit=2', [{ name: 'airportId', index: 0 }, { name: 'airportId2', index: 1 }]),",
                    "    grab('/clients?limit=1', [{ name: 'clientId', index: 0 }]),",
                    "    grab('/operators?limit=1', [{ name: 'operatorId', index: 0 }]),",
                    "    grab('/trip-requests?limit=1', [{ name: 'tripRequestId', index: 0 }]),",
                    "    grab('/operator-quotes?limit=1', [{ name: 'operatorQuoteId', index: 0 }]),",
                    ']);',
                ]),
                script('test', [
                "pm.test('draft written', function () {",
                '    pm.response.to.have.status(201);',
                '    const q = pm.response.json().data;',
                "    pm.expect(q.status).to.eql('DRAFT');",
                '    pm.expect(q.version).to.eql(1);',
                "    pm.collectionVariables.set('quoteId', q.id);",
                '    // Kept separately from the id the list captures, which later requests',
                '    // overwrite. The teardown needs the row *this run* created.',
                "    pm.collectionVariables.set('newQuoteId', q.id);",
                '});',
                ]),
            ],
        },
        {
            'name': '06 · Edit a quote',
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/{{quoteId}}', '{{quoteId}}'),
                'description': (
                    'An edit that **moves the money** cuts a new version and records '
                    '`versionNote`; one that does not leaves the version alone. Correcting an FBO '
                    'address is not a new version of the offer, and treating it as one would bury '
                    'the three revisions that mattered under twenty that did not.\n\nAn APPROVED '
                    'or REJECTED quote returns **409**: it is what the client answered, and '
                    'editing it in place rewrites what they agreed to. Reopen it first.'),
            },
            'response': [
                example('200 · Repriced, now V2', 'PATCH', '/quotes/{{quoteId}}', *cap['update'], req_body=update_body),
                example('409 · The client has already answered', 'PATCH', '/quotes/{{quoteId}}', *cap['update_409'],
                        req_body={'basePrice': 90000}),
                example('404 · Not found or out of scope', 'PATCH', f'/quotes/{MISSING}', *cap['update_404'],
                        req_body={'basePrice': 1000}),
            ],
        },
        {
            'name': '07 · Send it to the client',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': SEND_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/{{quoteId}}/send', '{{quoteId}}', 'send'),
                'description': (
                    'Marks the quote **SENT**, stamps the date the client’s decision window runs '
                    'from, and moves the enquiry behind it to **QUOTED** — forward only, and never '
                    'over a request already converted or lost.\n\n**No email is sent.** Nothing in '
                    'this system delivers to a client yet; that arrives with Email Templates '
                    '(#21). Pretending otherwise would mean a broker believing a quote had been '
                    'delivered when it had not.\n\n`sentAt` is stamped on every send, not only the '
                    'first: a revised quote that goes out again genuinely went out again. The '
                    'earlier sends are not lost — each one has its version in the log.'),
            },
            'response': [
                example('200 · Sent', 'POST', '/quotes/{{quoteId}}/send', *cap['send'],
                        req_body={'validUntil': '2026-10-20', 'note': 'Sent with the itinerary attached.'}),
            ],
        },
        {
            'name': '08 · The client accepted',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/{{quoteId}}/approve', '{{quoteId}}', 'approve'),
                'description': (
                    '**Only one quote per enquiry can be approved.** A second attempt returns 409 '
                    'naming the one already accepted, rather than silently demoting it — two '
                    'approved quotes on one enquiry mean two aircraft booked for one flight, and '
                    'the fix has to be a deliberate act: reopen the wrong one, then approve the '
                    'right one.\n\nA **draft** cannot be approved: nobody has seen it, so there is '
                    'nothing to agree to.\n\nAn **expired** quote can be. The desk choosing to '
                    'honour a lapsed price is a real decision, and it stays visible because the '
                    'validity date is still on the row.'),
            },
            'response': [
                example('200 · Approved', 'POST', '/quotes/{{quoteId}}/approve', *cap['approve'],
                        req_body={'decisionNote': 'Client confirmed by phone.'}),
                example('409 · Another quote is already approved for this request', 'POST', '/quotes/{{quoteId}}/approve', *cap['approve_409'], req_body={}),
                example('409 · Not sent yet', 'POST', '/quotes/{{quoteId}}/approve', *cap['approve_draft_409'], req_body={}),
            ],
        },
        {
            'name': '09 · The client declined',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/{{quoteId}}/reject', '{{quoteId}}', 'reject'),
                'description': (
                    'The note is worth more than the rejection: "went with a cheaper operator" is '
                    'what the next quote to this client is priced against.\n\nA rejected quote '
                    '**stays in the history** — that is the difference between rejecting and '
                    'archiving, and why brokers can do the first but not the second.'),
            },
            'response': [
                example('200 · Rejected', 'POST', '/quotes/{{quoteId}}/reject', *cap['reject'],
                        req_body={'decisionNote': 'Went with a cheaper operator on a lighter aircraft.'}),
            ],
        },
        {
            'name': '10 · Let the offer lapse',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DECIDE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/{{quoteId}}/expire', '{{quoteId}}', 'expire'),
                'description': (
                    'Explicit, **never a background job**. The `isExpired` flag on every read '
                    'already tells the truth about the date; a job flipping rows to EXPIRED '
                    'overnight would move records nobody asked it to move, and letting a price go '
                    'is a decision a person makes.\n\nOnly a quote still open can be lapsed — one '
                    'the client has already answered returns 409.'),
            },
            'response': [
                example('200 · Expired', 'POST', '/quotes/{{quoteId}}/expire', *cap['expire'],
                        req_body={'decisionNote': 'Client went quiet past the validity date.'}),
                example('409 · Already answered', 'POST', '/quotes/{{quoteId}}/expire', *cap['expire_409'], req_body={}),
            ],
        },
        {
            'name': '11 · Undo a decision',
            'request': {
                'method': 'POST', 'header': csrf_only,
                'url': url('/quotes/{{quoteId}}/reopen', '{{quoteId}}', 'reopen'),
                'description': (
                    'Returns the quote to where it was — **SENT** if the client has seen it, '
                    '**DRAFT** if it never went out. A quote the client has read cannot become '
                    'unsent.\n\nWithout this a mis-click on Approve is unfixable, because the '
                    'screen disables the decision buttons once a quote is settled. Returns 409 on '
                    'a quote that is already open.'),
            },
            'response': [
                example('200 · Reopened', 'POST', '/quotes/{{quoteId}}/reopen', *cap['reopen']),
                example('409 · Already open', 'POST', '/quotes/{{quoteId}}/reopen', *cap['reopen_409']),
            ],
        },
        {
            'name': '12 · Copy into a new draft',
            'request': {
                'method': 'POST', 'header': csrf_only,
                'url': url('/quotes/{{quoteId}}/duplicate', '{{quoteId}}', 'duplicate'),
                'description': (
                    'A fresh **DRAFT at version 1** with the same route, aircraft and pricing, and '
                    'none of the original’s send or decision history — it is a new offer, not a '
                    'continuation, and carrying the original’s sent date across would misdate '
                    'it.\n\nThe desk quotes the same route repeatedly, and re-entering nine fields '
                    'is where a wrong airport gets typed.'),
            },
            'response': [
                example('201 · Copied', 'POST', '/quotes/{{quoteId}}/duplicate', *cap['duplicate']),
            ],
            'event': [script('test', [
                "pm.test('copied as a fresh draft', function () {",
                '    pm.response.to.have.status(201);',
                '    const q = pm.response.json().data;',
                "    pm.expect(q.status).to.eql('DRAFT');",
                '    pm.expect(q.sentAt).to.eql(null);',
                "    pm.collectionVariables.set('duplicatedQuoteId', q.id);",
                '});',
            ])],
        },
        {
            'name': '13 · Remove a quote (soft)',
            'request': {
                'method': 'DELETE', 'header': csrf_only,
                'url': url('/quotes/{{quoteId}}', '{{quoteId}}'),
                'description': (
                    'Soft delete — `deletedAt` is set and nothing is destroyed. **Administrators '
                    'only.**\n\nNever the way to say "the client said no": that is Reject, which '
                    'keeps the quote in the history. A broker quietly removing the quotes that '
                    'were turned down would improve their own conversion rate, which is the wrong '
                    'incentive to build into the tool.'),
            },
            'response': [
                example('403 · Broker cannot remove', 'DELETE', '/quotes/{{quoteId}}', *cap['delete_403']),
                example('204 · Removed', 'DELETE', '/quotes/{{quoteId}}', *cap['delete']),
            ],
        },
        {
            'name': '14 · Restore a quote',
            'request': {
                'method': 'POST', 'header': csrf_only,
                'url': url('/quotes/{{quoteId}}/restore', '{{quoteId}}', 'restore'),
                'description': (
                    'Brings an archived quote back exactly as it was, with its version history '
                    'intact.\n\n**200, not 201**: a restore creates nothing — it clears the '
                    'deletion stamp on a row that existed all along.'),
            },
            'response': [
                example('200 · Restored', 'POST', '/quotes/{{quoteId}}/restore', *cap['restore']),
            ],
        },
        {
            'name': '15 · Remove several (soft)',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{quoteId}}"]      // required · 1-100 uuids. Unknown or already-archived ids are reported in `skipped` rather than failing the batch.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/bulk-delete', 'bulk-delete'),
                'description': (
                    '**POST, not DELETE.** A request body on DELETE is dropped by proxies, and a '
                    'dropped body archives nothing while answering 200.\n\nAdministrators only, '
                    'same rule as the single remove. Partial success is the design: ids that were '
                    'already archived or do not exist come back in `skipped`, so one stale row in '
                    'a selection does not lose the whole action — two people clearing the same '
                    'rows both deserve to succeed.'),
            },
            'response': [
                example('200 · Removed (partial)', 'POST', '/quotes/bulk-delete', *cap['bulk_delete'],
                        req_body={'ids': ['{{quoteId}}', MISSING]}),
                example('200 · Already removed', 'POST', '/quotes/bulk-delete', *cap['bulk_delete_partial'],
                        req_body={'ids': ['{{quoteId}}']}),
            ],
        },
        {
            'name': '16 · Restore several',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{quoteId}}"]      // required · 1-100 uuids.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/bulk-restore', 'bulk-restore'),
                'description': (
                    'The mirror of bulk remove, with the same partial-success rule: a checkbox '
                    'column on the Archived tab needs a bulk action, or it is a selection that '
                    'does nothing.'),
            },
            'response': [
                example('200 · Restored (partial)', 'POST', '/quotes/bulk-restore', *cap['bulk_restore'],
                        req_body={'ids': ['{{quoteId}}', MISSING]}),
            ],
            'event': [script('test', [
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '});',
                '',
                '// Teardown. This is the last request in the folder, and the folder ends',
                '// by restoring the quote it created — so every run would otherwise leave',
                '// one more live quote on the board, plus the duplicate. Clients, airports',
                '// and operators each accumulated dozens that way before anyone noticed.',
                '//',
                '// There is no hard delete in this system by design, so the run cannot',
                '// erase its own rows. Archiving them is the best available end state.',
                "const ids = [pm.collectionVariables.get('newQuoteId'),",
                "             pm.collectionVariables.get('duplicatedQuoteId')];",
                'ids.forEach(function (id) {',
                '    if (!id) { return; }',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/quotes/' + id,",
                "        method: 'DELETE',",
                "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                '    }, function (err) {',
                "        if (err) { console.warn('teardown could not archive ' + id, err); }",
                '    });',
                '});',
                "pm.collectionVariables.set('newQuoteId', '');",
                "pm.collectionVariables.set('duplicatedQuoteId', '');",
            ])],
        },
        {
            'name': '17 · Preview pricing',
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PREVIEW_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/quotes/price-preview', 'price-preview'),
                'description': (
                    'A dry run of the exact `priceQuote()` function a saved quote uses — FET '
                    'amount, extras total, total price and (for a caller with `VIEW_FINANCIALS`) '
                    'gross profit and margin. **Persists nothing** and needs no existing quote: '
                    'this is what the create/edit form calls as a broker types, before a row '
                    'exists, so the live preview never re-implements the arithmetic itself.\n\n'
                    'Same `MANAGE_TRIPS` write gate as writing the quote — this is the form a '
                    'broker is filling in before one exists, not a read.\n\nAppended at the end of '
                    'this folder rather than after request 05: it is stateless, so it has no '
                    'ordering dependency on anything above it, live-quote id included.'),
            },
            'response': [
                example('200 · Priced', 'POST', '/quotes/price-preview', *cap['preview'],
                        req_body=preview_payload),
                example('400 · Base price is required', 'POST', '/quotes/price-preview', *cap['preview_400'],
                        req_body={'fetEnabled': True}),
                example('403 · Assistant cannot price a quote', 'POST', '/quotes/price-preview',
                        *cap['preview_403'], req_body=preview_payload),
            ],
        },
    ]

    return {
        'name': '10 · Quotes',
        'description': (
            'The client-facing offer: what Tribeca Jets sells the flight for, with margin and '
            'Federal Excise Tax on top of what the operator charges (scope §6.10).\n\n**Two quote '
            'entities, deliberately.** §10 of the scope lists Operator Quote and Client Quote '
            'separately, and they are different records: one is what an operator charges us '
            '(folder 09), the other is what the client pays. Approving an operator’s price does '
            'not create the client’s offer — the desk decides the markup — so `operatorQuoteId` '
            'links them without making one the other.\n\n**Nothing computed is stored.** '
            '`fetAmount`, `extrasTotal`, `totalPrice`, `grossProfit` and `marginPercentage` are '
            'worked out on every read from the four inputs a person actually typed. The one place '
            'frozen figures are needed — "what exactly did the client see on the 9th?" — is the '
            'version history in request 04, which snapshots the whole set each time the money '
            'moves.\n\nUses the **trips** permissions, like trip requests and sourcing: a quote is '
            'a stage of a trip, not a capability a role is granted on its own. `VIEW_TRIPS` to '
            'read, `MANAGE_TRIPS` to write, `DELETE_TRIPS` (administrators only) to archive. The '
            '**margin** carries a second gate, `VIEW_FINANCIALS`, which an assistant does not '
            'hold.\n\nEvery request below is signed in as the seeded SUPER_ADMIN by the folder’s '
            'pre-request script, except the 403 examples and the assistant’s read, captured as the '
            'seeded assistant and broker.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    collection = json.loads(COLLECTION.read_text())

    sourcing_folder = next(
        f for f in collection['item'] if f['name'].startswith('09'))
    folder = build(owner, broker, assistant)
    folder['event'] = json.loads(json.dumps(sourcing_folder['event']))

    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('quoteId', 'newQuoteId', 'duplicatedQuoteId', 'airportId2'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    # Two-space indent, matching how Postman itself writes the file — anything
    # else reformats all 9,000 lines.
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
