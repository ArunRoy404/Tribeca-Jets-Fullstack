#!/usr/bin/env python3
"""
Builds `15 · Trips` (#11), capturing every example from a live API.

    npm run start:dev
    python3 postman/build_trips_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: every trip and quote it creates is archived at the end, in the
builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, example, script,
    status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATUSES = 'DRAFT | BOOKED | CONFIRMED | IN_FLIGHT | COMPLETED | CANCELLED'
TYPES = 'ONE_WAY | ROUND_TRIP | MULTI_LEG'

CREATE_BODY = """{
  "clientId": "{{clientId}}",                          // required · uuid. A live client.
  "assignedBrokerId": null,                            // optional · uuid. Defaults to you; naming anyone else needs MANAGE_TRIPS at ALL scope.
  "tripRequestId": null,                               // optional · uuid, same client. Linking one converts it.
  "operatorId": "{{operatorId}}",                      // optional · uuid, a live operator
  "aircraftId": null,                                  // optional · uuid, a fleet aircraft…
  "aircraftDescription": "Challenger 350",             // optional · …or free text for a tail not in the fleet. Max 200.

  "type": "ROUND_TRIP",                                // optional · ONE_WAY | ROUND_TRIP | MULTI_LEG (default ONE_WAY). Must fit the legs: 1, 2, 2+.
  "status": "BOOKED",                                  // optional · DRAFT | BOOKED | CONFIRMED (default DRAFT). Never created in flight or done.
  "operatorConfirmed": false,                          // optional · boolean. Stamps operatorConfirmedAt.
  "passengerCount": 4,                                 // optional · integer 1-200

  // Legs in order. No leg may start and end at the same airport, and the
  // days may not go backwards. Times are LOCAL at the origin, "HH:MM".
  "legs": [
    { "originAirportId": "{{airportId}}", "destinationAirportId": "{{airportId2}}", "departureDate": "2026-11-10", "departureTime": "09:30" },
    { "originAirportId": "{{airportId2}}", "destinationAirportId": "{{airportId}}", "departureDate": "2026-11-14", "departureTime": null }
  ],
  "passengers": [                                      // optional · up to 200. Names usually arrive later.
    { "fullName": "Jonathan Reed", "dateOfBirth": "1978-03-14", "passportNumber": "X1234567" }
  ],

  // Priced inputs, exactly as on a quote. FET, total, profit and margin are
  // computed on every read, never stored.
  "basePrice": 80000,                                  // optional · number 0-100000000. Omit for a draft with no price yet.
  "operatorCost": 65000,                               // optional · number
  "fetEnabled": true,                                  // optional · boolean, default true
  "internalNotes": "Prefers morning departures.",      // optional · max 5000
  "clientNotes": "Seafood catering."                   // optional · max 5000
}"""

UPDATE_BODY = """{
  // Every field optional; null clears. legs / passengers, when sent, are the
  // COMPLETE lists: send an existing row's id to keep it, leave one out to
  // archive it (nothing is deleted). Status is not here — see 06.
  "type": "ONE_WAY",
  "legs": [
    { "id": "{{tripLegId}}", "originAirportId": "{{airportId}}", "destinationAirportId": "{{airportId2}}", "departureDate": "2026-11-10", "departureTime": "10:00" }
  ],
  "clientNotes": null                                  // clears the client notes
}"""


def legs_for(a, b):
    return [
        {'originAirportId': a, 'destinationAirportId': b, 'departureDate': '2026-11-10', 'departureTime': '09:30'},
        {'originAirportId': b, 'destinationAirportId': a, 'departureDate': '2026-11-14', 'departureTime': None},
    ]


# A request-level lookup of everything the create body needs, so the folder
# passes run on its own. Request-level, not folder-level: the folder script
# signs in asynchronously, and a lookup queued beside that login would fire
# before the session cookie exists.
LOOKUPS = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (err, res) {",
    "    if (!err && res.code === 200 && res.json().data.length) { pm.collectionVariables.set('clientId', res.json().data[0].id); }",
    '});',
    "pm.sendRequest({ url: base + '/operators?limit=1', method: 'GET' }, function (err, res) {",
    "    if (!err && res.code === 200 && res.json().data.length) { pm.collectionVariables.set('operatorId', res.json().data[0].id); }",
    '});',
    "pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (err, res) {",
    '    if (err || res.code !== 200) { return; }',
    '    const rows = res.json().data;',
    "    if (rows.length >= 2) { pm.collectionVariables.set('airportId', rows[0].id); pm.collectionVariables.set('airportId2', rows[1].id); }",
    '});',
]

# Creates, sends and approves a quote on the same client and route, so 07 has
# an approved offer to book — every run, on any database.
APPROVED_QUOTE = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    'pm.sendRequest({',
    "    url: base + '/quotes', method: 'POST', header: headers,",
    '    body: { mode: \'raw\', raw: JSON.stringify({',
    "        clientId: pm.collectionVariables.get('clientId'), basePrice: 50000, operatorCost: 41000,",
    "        originAirportId: pm.collectionVariables.get('airportId'), destinationAirportId: pm.collectionVariables.get('airportId2'),",
    "        departureDate: '2026-12-01', returnDate: '2026-12-05', passengers: 3,",
    '    }) },',
    '}, function (err, res) {',
    '    if (err || res.code !== 201) { return; }',
    '    const id = res.json().data.id;',
    "    pm.collectionVariables.set('bookQuoteId', id);",
    "    pm.sendRequest({ url: base + '/quotes/' + id + '/send', method: 'POST', header: headers, body: { mode: 'raw', raw: '{}' } }, function () {",
    "        pm.sendRequest({ url: base + '/quotes/' + id + '/approve', method: 'POST', header: headers, body: { mode: 'raw', raw: '{}' } }, function () {});",
    '    });',
    '});',
]

TEARDOWN = [
    '// Archive what this folder created — the run is a demonstration, not data',
    '// entry. Nothing is deleted: the rows sit in the Archived tabs.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "['newTripId', 'bookedTripId'].forEach(function (key) {",
    '    const id = pm.collectionVariables.get(key);',
    "    if (id) { pm.sendRequest({ url: base + '/trips/' + id, method: 'DELETE', header: headers }, function () {}); }",
    '});',
    "const quote = pm.collectionVariables.get('bookQuoteId');",
    "if (quote) { pm.sendRequest({ url: base + '/quotes/' + quote, method: 'DELETE', header: headers }, function () {}); }",
]


def build(owner: Session, broker: Session, assistant: Session, anonymous: Session):
    cap, created = {}, []
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    operator_id = owner.request('GET', '/operators?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    a, b = airports[0]['id'], airports[1]['id']
    broker_id = broker.request('GET', '/auth/me')[1]['data']
    broker_id = broker_id.get('id') or broker_id['user']['id']

    payload = {
        'clientId': client_id, 'operatorId': operator_id, 'aircraftDescription': 'Challenger 350',
        'type': 'ROUND_TRIP', 'status': 'BOOKED', 'passengerCount': 4, 'legs': legs_for(a, b),
        'passengers': [{'fullName': 'Jonathan Reed', 'dateOfBirth': '1978-03-14', 'passportNumber': 'X1234567'}],
        'basePrice': 80000, 'operatorCost': 65000, 'fetEnabled': True,
        'internalNotes': 'Prefers morning departures.', 'clientNotes': 'Seafood catering.',
    }

    try:
        cap['create'] = owner.request('POST', '/trips', payload)
        trip = cap['create'][1]['data']
        created.append(('trip', trip['id']))
        cap['create_400_legs'] = owner.request('POST', '/trips', {**payload, 'type': 'ONE_WAY'})
        cap['create_400_dates'] = owner.request('POST', '/trips', {
            **payload, 'legs': [{**payload['legs'][0], 'departureDate': '2026-11-20'}, payload['legs'][1]]})
        cap['create_403_reassign'] = broker.request('POST', '/trips', {**payload, 'assignedBrokerId': trip['createdById']})
        cap['create_403'] = assistant.request('POST', '/trips', payload)

        cap['list'] = owner.request('GET', '/trips?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/trips?sortBy=basePrice')
        cap['list_401'] = anonymous.request('GET', '/trips')
        cap['stats'] = owner.request('GET', '/trips/stats')
        cap['detail'] = owner.request('GET', f"/trips/{trip['id']}")
        cap['detail_404'] = owner.request('GET', f'/trips/{MISSING}')

        update = {
            'type': 'ONE_WAY',
            'legs': [{'id': trip['legs'][0]['id'], 'originAirportId': a, 'destinationAirportId': b,
                      'departureDate': '2026-11-10', 'departureTime': '10:00'}],
            'clientNotes': None,
        }
        cap['update'] = owner.request('PATCH', f"/trips/{trip['id']}", update)
        cap['update_400'] = owner.request('PATCH', f"/trips/{trip['id']}", {})

        cap['status'] = owner.request('POST', f"/trips/{trip['id']}/status", {'status': 'CONFIRMED', 'note': 'Operator confirmed the tail.'})
        cap['status_400'] = owner.request('POST', f"/trips/{trip['id']}/status", {'status': 'COMPLETED'})

        # An approved quote to book, and one still in draft to be refused.
        quote_payload = {'clientId': client_id, 'basePrice': 50000, 'operatorCost': 41000,
                         'originAirportId': a, 'destinationAirportId': b,
                         'departureDate': '2026-12-01', 'returnDate': '2026-12-05', 'passengers': 3}
        draft = owner.request('POST', '/quotes', quote_payload)[1]['data']
        created.append(('quote', draft['id']))
        approved = owner.request('POST', '/quotes', quote_payload)[1]['data']
        created.append(('quote', approved['id']))
        owner.request('POST', f"/quotes/{approved['id']}/send", {})
        owner.request('POST', f"/quotes/{approved['id']}/approve", {})
        cap['book'] = owner.request('POST', f"/trips/from-quote/{approved['id']}", {})
        created.append(('trip', cap['book'][1]['data']['id']))
        cap['book_400'] = owner.request('POST', f"/trips/from-quote/{draft['id']}", {})
        cap['book_409'] = owner.request('POST', f"/trips/from-quote/{approved['id']}", {})

        cap['remove_403'] = broker.request('DELETE', f"/trips/{trip['id']}")
        cap['remove'] = owner.request('DELETE', f"/trips/{trip['id']}")
        cap['restore'] = owner.request('POST', f"/trips/{trip['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/trips/{trip['id']}/restore")
        cap['bulk'] = owner.request('POST', '/trips/bulk-delete', {'ids': [trip['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/trips/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/trips/bulk-restore', {'ids': [trip['id']]})
    finally:
        for kind, row_id in created:
            path = f'/trips/{row_id}' if kind == 'trip' else f'/quotes/{row_id}'
            owner.request('DELETE', path)

    trip_id = cap['create'][1]['data']['id']
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · the reference ("TJ-1048" or "1048"), client name or email, tail, model, operator.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES} (case-sensitive).'},
        {'key': 'type', 'value': None, 'disabled': True, 'description': f'optional · {TYPES}.'},
        {'key': 'clientId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The client detail page\'s Trips tab.'},
        {'key': 'assignedBrokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The operator\'s Trip History tab.'},
        {'key': 'aircraftId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The aircraft\'s Trips tab.'},
        {'key': 'departure', 'value': None, 'disabled': True, 'description': 'optional · PAST | TODAY | UPCOMING, on the first leg\'s day.'},
        {'key': 'activeOnly', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. true hides completed and cancelled trips.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. true lists only archived trips.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | reference | departureDate | status. Default createdAt. departureDate sorts undated drafts last.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]

    save_trip = script('test', [
        "pm.test('201 Created', () => pm.response.to.have.status(201));",
        'const body = pm.response.json();',
        "pm.collectionVariables.set('newTripId', body.data.id);",
        "pm.collectionVariables.set('tripLegId', body.data.legs[0].id);",
    ])

    items = [
        {
            'name': '01 · Book a trip by hand',
            'event': [script('prerequest', LOOKUPS), save_trip],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/trips'),
                'description': (
                    'Most trips are booked from an approved quote (`07`); this is the by-hand path.\n\n'
                    'Legs must fit the type (one-way 1, round trip 2, multi-leg 2+), no leg may start and end at '
                    'the same airport, and days may not go backwards. Created as DRAFT, BOOKED or CONFIRMED only. '
                    'A broker may only assign the trip to themselves.\n\nMoney: only what a person typed is stored; '
                    '`fetAmount`, `totalPrice`, `grossProfit` and `marginPercentage` come from the same pricing '
                    'engine as quotes on every read, and the last three are absent without VIEW_FINANCIALS.'),
            },
            'response': [
                example('201 · Booked', 'POST', '/trips', *cap['create'], req_body=payload),
                example('400 · Legs do not fit the type', 'POST', '/trips', *cap['create_400_legs']),
                example('400 · Days go backwards', 'POST', '/trips', *cap['create_400_dates']),
                example('403 · A broker cannot assign someone else', 'POST', '/trips', *cap['create_403_reassign']),
                example('403 · Assistant cannot book trips', 'POST', '/trips', *cap['create_403']),
            ],
        },
        {
            'name': '02 · List trips',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/trips', list_query),
                'description': (
                    'Scoped like trip requests and quotes: a broker sees their own trips and unassigned ones; '
                    'an administrator or senior broker sees all. Each row carries its legs (the route and '
                    'return date are read from them) and the computed money.'),
            },
            'response': [
                example('200 · A page of trips', 'GET', '/trips?page=1&limit=10', *cap['list']),
                example('400 · Unsortable column', 'GET', '/trips?sortBy=basePrice', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/trips', *cap['list_401']),
            ],
        },
        {
            'name': '03 · Board tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/trips/stats'),
                'description': (
                    'Counts by lifecycle stage, and revenue and profit summed from computed totals — for '
                    'VIEW_FINANCIALS only. `profitTripCount` says how many trips had a known operator cost. '
                    '`paymentAttention` is null until Receivables (#16) exists.'),
            },
            'response': [example('200 · Tiles', 'GET', '/trips/stats', *cap['stats'])],
        },
        {
            'name': '04 · Get one trip',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/trips/{{newTripId}}'),
                'description': (
                    'Legs, named passengers (passport numbers included — whoever may read the trip may read its '
                    'manifest), the quote and request it came from, `nextStatuses`, `editable`. Archived trips '
                    'load too. Outside the caller\'s scope: 404, never 403.'),
            },
            'response': [
                example('200 · The trip', 'GET', f'/trips/{trip_id}', *cap['detail']),
                example('404 · Not found or not yours', 'GET', f'/trips/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Edit a trip',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/trips/{{newTripId}}'),
                'description': (
                    '`legs` and `passengers` are complete lists: an existing row\'s `id` keeps it, a row left '
                    'out is archived. A completed or cancelled trip is history — move it back a step first. '
                    'Only links that change are re-validated, so archiving an airport later never locks a trip.'),
            },
            'response': [
                example('200 · Round trip made one-way', 'PATCH', f'/trips/{trip_id}', *cap['update']),
                example('400 · Empty body', 'PATCH', f'/trips/{trip_id}', *cap['update_400'], req_body={}),
            ],
        },
        {
            'name': '06 · Move along the lifecycle',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "status": "CONFIRMED",  // required · ' + STATUSES + '\n  "note": "Operator confirmed the tail."  // optional · max 500, lands on the timeline\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/trips/{{newTripId}}/status'),
                'description': (
                    'DRAFT → BOOKED → CONFIRMED → IN_FLIGHT → COMPLETED, each undoable one step; CANCELLED from '
                    'anywhere before departure; a cancelled trip reopens as DRAFT. A disallowed move is a 400 '
                    'that names the allowed ones.'),
            },
            'response': [
                example('200 · Confirmed', 'POST', f'/trips/{trip_id}/status', *cap['status'],
                        req_body={'status': 'CONFIRMED', 'note': 'Operator confirmed the tail.'}),
                example('400 · Not a move from here', 'POST', f'/trips/{trip_id}/status', *cap['status_400'],
                        req_body={'status': 'COMPLETED'}),
            ],
        },
        {
            'name': '07 · Book an approved quote',
            'event': [
                script('prerequest', APPROVED_QUOTE),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('bookedTripId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "status": "BOOKED"  // optional · DRAFT | BOOKED | CONFIRMED, default BOOKED\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/trips/from-quote/{{bookQuoteId}}'),
                'description': (
                    'Copies the quote\'s client, broker, operator, aircraft, route (a return date makes it a '
                    'round trip), party and priced inputs. Only an **approved** quote books, and only once — a '
                    'second booking is a 409 naming the first. The pre-request script creates, sends and '
                    'approves a quote so this runs on any database.'),
            },
            'response': [
                example('201 · Booked from the quote', 'POST', '/trips/from-quote/{{bookQuoteId}}', *cap['book'], req_body={}),
                example('400 · The quote is not approved', 'POST', '/trips/from-quote/{{draftQuoteId}}', *cap['book_400'], req_body={}),
                example('409 · Already booked', 'POST', '/trips/from-quote/{{bookQuoteId}}', *cap['book_409'], req_body={}),
            ],
        },
        {
            'name': '08 · Archive a trip',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/trips/{{newTripId}}'),
                'description': 'Administrators only (DELETE_TRIPS at ALL). A broker cancels instead. Nothing is deleted.',
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/trips/{trip_id}', *cap['remove']),
                example('403 · A broker cannot archive', 'DELETE', f'/trips/{trip_id}', *cap['remove_403']),
            ],
        },
        {
            'name': '09 · Restore a trip',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/trips/{{newTripId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201 — nothing is created.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/trips/{trip_id}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/trips/{trip_id}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '10 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newTripId}}"]  // required · 1-100 uuids. Unknown ids come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/trips/bulk-delete'),
                'description': 'Administrators only. Partial success is success.',
            },
            'response': [
                example('200 · Archived', 'POST', '/trips/bulk-delete', *cap['bulk'], req_body={'ids': [trip_id, MISSING]}),
                example('400 · Nothing selected', 'POST', '/trips/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '11 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newTripId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/trips/bulk-restore'),
                'description': 'Administrators only.',
            },
            'response': [example('200 · Restored', 'POST', '/trips/bulk-restore', *cap['bulk_restore'], req_body={'ids': [trip_id]})],
        },
        {
            'name': '12 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/trips/stats'),
                'description': 'Archives the trips and quote this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '15 · Trips',
        'description': (
            'The booked flight (#11, scope §6.5) — client, broker, operator, aircraft, legs, passengers and the '
            'money — and what every later module hangs off. Usually born from an approved quote (`07`).\n\n'
            'VIEW_TRIPS reads, MANAGE_TRIPS writes, archiving is an administrator\'s call. Runs alone: it signs '
            'itself in, finds its own client, operator and airports, approves its own quote, and archives '
            'everything it created.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text())
    folder = build(owner, broker, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('newTripId', 'tripLegId', 'bookQuoteId', 'bookedTripId', 'airportId2'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
