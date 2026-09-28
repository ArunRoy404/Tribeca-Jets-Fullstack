#!/usr/bin/env python3
"""
Builds `22 · Itineraries` (#12), capturing every example from a live API.

    npm run start:dev
    python3 postman/build_itineraries_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: every trip and itinerary it creates is archived at the end, in
the builder and in the folder's own teardown. Creates its own trip (with its
own client/airport lookups) rather than reusing a seeded one, so a second run
never collides with "one document per trip".
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, example, script,
    status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

CREATE_BODY = """{
  "tripId": "{{itineraryTripId}}",                     // required · uuid, a live trip within your scope. One document per trip — a second attempt is a 409.

  "logoUrl": null,                                     // optional · an uploaded image's relative URL, e.g. /api/uploads/<id>
  "arrivalTime": "11:45",                              // optional · "HH:MM", 24-hour, local at the destination — nothing else tracks this
  "flightTime": "2h 15m",                              // optional · free text, max 20
  "miles": "620 nm",                                   // optional · free text, max 20

  "departureFbo": "Signature Flight Support — TEB",    // optional · overrides the origin airport's own assigned FBO, max 200
  "arrivalFbo": null,                                  // optional · overrides the destination airport's own assigned FBO, max 200

  "catering": "Continental breakfast",                 // optional · max 300
  "groundTransport": "Cadillac Escalade",              // optional · max 300

  "operatorItineraryUrl": null,                        // optional · an uploaded document's relative URL, for reference — never parsed
  "operatorItineraryText": null,                       // optional · max 5000

  "exteriorImageUrl": null,                            // optional · overrides the aircraft's own fleet photo
  "interiorImageUrl": null,                            // optional · overrides the aircraft's own fleet photo

  "notes": "VIP handling requested at FBO."            // optional · max 5000
}"""

UPDATE_BODY = """{
  // Every field optional; null clears it. tripId is not here — the document
  // stays with the trip it was built for permanently.
  "flightTime": "2h 20m",
  "catering": null                                     // clears the catering note
}"""

# A request-level setup that creates a fresh trip to build the document on —
# its own client and airport lookups, exactly as `15 · Trips` looks up its
# own dependencies. Request-level, not folder-level: the folder script signs
# in asynchronously, and a lookup queued beside that login would fire before
# the session cookie exists.
SETUP_TRIP = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (err, cRes) {",
    '    if (err || cRes.code !== 200 || !cRes.json().data.length) { return; }',
    '    const clientId = cRes.json().data[0].id;',
    "    pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (err2, aRes) {",
    '        if (err2 || aRes.code !== 200 || aRes.json().data.length < 2) { return; }',
    '        const airports = aRes.json().data;',
    '        const body = {',
    "            clientId: clientId, type: 'ONE_WAY', status: 'BOOKED', passengerCount: 2,",
    "            legs: [{ originAirportId: airports[0].id, destinationAirportId: airports[1].id, departureDate: '2026-11-10', departureTime: '09:30' }],",
    "            passengers: [{ fullName: 'Jonathan Reed', passportNumber: 'X1234567' }],",
    '        };',
    "        pm.sendRequest({ url: base + '/trips', method: 'POST', header: headers, body: { mode: 'raw', raw: JSON.stringify(body) } }, function (err3, tRes) {",
    '            if (err3 || tRes.code !== 201) { return; }',
    "            pm.collectionVariables.set('itineraryTripId', tRes.json().data.id);",
    '        });',
    '    });',
    '});',
]

TEARDOWN = [
    '// Archive what this folder created — the run is a demonstration, not data',
    '// entry. Nothing is deleted: the rows sit in the Archived tabs.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "['newItineraryId'].forEach(function (key) {",
    '    const id = pm.collectionVariables.get(key);',
    "    if (id) { pm.sendRequest({ url: base + '/itineraries/' + id, method: 'DELETE', header: headers }, function () {}); }",
    '});',
    "['itineraryTripId', 'archivedTripId'].forEach(function (key) {",
    '    const id = pm.collectionVariables.get(key);',
    "    if (id) { pm.sendRequest({ url: base + '/trips/' + id, method: 'DELETE', header: headers }, function () {}); }",
    '});',
]


def build(owner: Session, assistant: Session, anonymous: Session):
    cap, created = {}, []
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    a, b = airports[0]['id'], airports[1]['id']

    trip_payload = {
        'clientId': client_id, 'type': 'ONE_WAY', 'status': 'BOOKED', 'passengerCount': 2,
        'legs': [{'originAirportId': a, 'destinationAirportId': b, 'departureDate': '2026-11-10', 'departureTime': '09:30'}],
        'passengers': [{'fullName': 'Jonathan Reed', 'passportNumber': 'X1234567'}],
    }

    try:
        trip = owner.request('POST', '/trips', trip_payload)[1]['data']
        created.append(('trip', trip['id']))
        archived_trip = owner.request('POST', '/trips', trip_payload)[1]['data']
        owner.request('DELETE', f"/trips/{archived_trip['id']}")
        created.append(('trip', archived_trip['id']))

        payload = {
            'tripId': trip['id'], 'arrivalTime': '11:45', 'flightTime': '2h 15m', 'miles': '620 nm',
            'departureFbo': 'Signature Flight Support — TEB', 'catering': 'Continental breakfast',
            'groundTransport': 'Cadillac Escalade', 'notes': 'VIP handling requested at FBO.',
        }
        cap['create'] = owner.request('POST', '/itineraries', payload)
        itinerary = cap['create'][1]['data']
        created.append(('itinerary', itinerary['id']))

        cap['create_409'] = owner.request('POST', '/itineraries', {'tripId': trip['id']})
        cap['create_400'] = owner.request('POST', '/itineraries', {'tripId': MISSING})
        cap['create_400_archived'] = owner.request('POST', '/itineraries', {'tripId': archived_trip['id']})
        cap['create_403'] = assistant.request('POST', '/itineraries', {'tripId': MISSING})

        cap['list'] = owner.request('GET', '/itineraries?page=1&limit=10')
        cap['list_401'] = anonymous.request('GET', '/itineraries')
        cap['stats'] = owner.request('GET', '/itineraries/stats')
        cap['detail'] = owner.request('GET', f"/itineraries/{itinerary['id']}")
        cap['detail_404'] = owner.request('GET', f'/itineraries/{MISSING}')

        update = {'flightTime': '2h 20m', 'catering': None}
        cap['update'] = owner.request('PATCH', f"/itineraries/{itinerary['id']}", update)
        cap['update_400'] = owner.request('PATCH', f"/itineraries/{itinerary['id']}", {})
        cap['update_403'] = assistant.request('PATCH', f"/itineraries/{itinerary['id']}", {'notes': 'x'})

        cap['confirm'] = owner.request('POST', f"/itineraries/{itinerary['id']}/confirm")
        cap['send'] = owner.request('POST', f"/itineraries/{itinerary['id']}/send")

        cap['remove_403'] = assistant.request('DELETE', f"/itineraries/{itinerary['id']}")
        cap['remove'] = owner.request('DELETE', f"/itineraries/{itinerary['id']}")
        cap['restore'] = owner.request('POST', f"/itineraries/{itinerary['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/itineraries/{itinerary['id']}/restore")
        cap['bulk'] = owner.request('POST', '/itineraries/bulk-delete', {'ids': [itinerary['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/itineraries/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/itineraries/bulk-restore', {'ids': [itinerary['id']]})
    finally:
        for kind, row_id in created:
            path = f'/itineraries/{row_id}' if kind == 'itinerary' else f'/trips/{row_id}'
            owner.request('DELETE', path)

    itinerary_id = cap['create'][1]['data']['id']
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · the trip\'s reference ("TJ-1048" or "1048"), client, tail or operator.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': 'optional · PENDING | CONFIRMED (case-sensitive).'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. true lists only archived documents.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | status | confirmedAt | departureDate. Default createdAt.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]

    save_itinerary = script('test', [
        "pm.test('201 Created', () => pm.response.to.have.status(201));",
        "pm.collectionVariables.set('newItineraryId', pm.response.json().data.id);",
    ])

    items = [
        {
            'name': '01 · Build an itinerary',
            'event': [script('prerequest', SETUP_TRIP), save_itinerary],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/itineraries'),
                'description': (
                    'One document per trip — a second attempt on the same `tripId` is a 409 naming the '
                    'existing one. Aircraft, operator, tail, route, dates and the passenger manifest are '
                    'never sent here: they are the trip\'s own facts, read on every request. The '
                    'pre-request script books a fresh trip so this runs on any database.'),
            },
            'response': [
                example('201 · Built', 'POST', '/itineraries', *cap['create'], req_body=payload),
                example('409 · This trip already has one', 'POST', '/itineraries', *cap['create_409'], req_body={'tripId': trip['id']}),
                example('400 · That trip does not exist', 'POST', '/itineraries', *cap['create_400'], req_body={'tripId': MISSING}),
                example('400 · The trip has been archived', 'POST', '/itineraries', *cap['create_400_archived'], req_body={'tripId': archived_trip['id']}),
                example('403 · Assistant cannot build one', 'POST', '/itineraries', *cap['create_403'], req_body={'tripId': MISSING}),
            ],
        },
        {
            'name': '02 · List itineraries',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/itineraries', list_query),
                'description': (
                    'Scoped exactly like the trips they belong to. Aircraft, operator, tail, route and the '
                    'passenger manifest are read from each trip on every request, never stored on this row.'),
            },
            'response': [
                example('200 · A page of itineraries', 'GET', '/itineraries?page=1&limit=10', *cap['list']),
                example('401 · Not signed in', 'GET', '/itineraries', *cap['list_401']),
            ],
        },
        {
            'name': '03 · Board tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/itineraries/stats'),
                'description': 'Total documents, confirmed, and the pending remainder — within the caller\'s scope.',
            },
            'response': [example('200 · Tiles', 'GET', '/itineraries/stats', *cap['stats'])],
        },
        {
            'name': '04 · Get one itinerary',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/itineraries/{{newItineraryId}}'),
                'description': (
                    'Every trip-derived field flattened onto the response — client, route, aircraft, operator, '
                    'the passenger manifest — plus this document\'s own content. `exteriorImageUrl` / '
                    '`interiorImageUrl` and `departureFbo` / `arrivalFbo` are the *effective* values (a document '
                    'override, or the trip\'s aircraft / the airport\'s assigned default); the raw override rides '
                    'along under the `*Override` keys for an edit form. Archived documents load too.'),
            },
            'response': [
                example('200 · The document', 'GET', f'/itineraries/{itinerary_id}', *cap['detail']),
                example('404 · Not found or not yours', 'GET', f'/itineraries/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Edit an itinerary',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/itineraries/{{newItineraryId}}'),
                'description': 'Refused with a 400 naming the reason while the underlying trip is archived — restore the trip first.',
            },
            'response': [
                example('200 · Saved', 'PATCH', f'/itineraries/{itinerary_id}', *cap['update']),
                example('400 · Provide at least one field', 'PATCH', f'/itineraries/{itinerary_id}', *cap['update_400'], req_body={}),
                example('403 · Assistant cannot edit one', 'PATCH', f'/itineraries/{itinerary_id}', *cap['update_403'], req_body={'notes': 'x'}),
            ],
        },
        {
            'name': '06 · Confirm the document',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/itineraries/{{newItineraryId}}/confirm'),
                'description': 'Idempotent — confirming an already-confirmed document is a no-op.',
            },
            'response': [example('200 · Confirmed', 'POST', f'/itineraries/{itinerary_id}/confirm', *cap['confirm'])],
        },
        {
            'name': '07 · Mark it sent to the client',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/itineraries/{{newItineraryId}}/send'),
                'description': (
                    'Stamps who marked it sent and when — the same "marks it, does not deliver" a quote\'s Send '
                    'makes. There is no Email Templates module (#21) yet to actually deliver it.'),
            },
            'response': [example('200 · Marked sent', 'POST', f'/itineraries/{itinerary_id}/send', *cap['send'])],
        },
        {
            'name': '08 · Archive an itinerary',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/itineraries/{{newItineraryId}}'),
                'description': 'MANAGE_TRIPS, the same as every other write here — narrower than a trip\'s own DELETE_TRIPS: this is a document, not the booking\'s financial record.',
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/itineraries/{itinerary_id}', *cap['remove']),
                example('403 · Assistant cannot archive one', 'DELETE', f'/itineraries/{itinerary_id}', *cap['remove_403']),
            ],
        },
        {
            'name': '09 · Restore an itinerary',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/itineraries/{{newItineraryId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201 — nothing is created.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/itineraries/{itinerary_id}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/itineraries/{itinerary_id}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '10 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newItineraryId}}"]  // required · 1-100 uuids. Unknown ids come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/itineraries/bulk-delete'),
                'description': 'Partial success is success.',
            },
            'response': [
                example('200 · Archived', 'POST', '/itineraries/bulk-delete', *cap['bulk'], req_body={'ids': [itinerary_id, MISSING]}),
                example('400 · Nothing selected', 'POST', '/itineraries/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '11 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newItineraryId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/itineraries/bulk-restore'),
                'description': '',
            },
            'response': [example('200 · Restored', 'POST', '/itineraries/bulk-restore', *cap['bulk_restore'], req_body={'ids': [itinerary_id]})],
        },
        {
            'name': '12 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/itineraries/stats'),
                'description': 'Archives the itinerary and trips this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '22 · Itineraries',
        'description': (
            'The passenger-facing document for a trip (#12, scope §11): tail, times, passengers and passport '
            'numbers, catering, ground transport, FBO handling, confirmed or pending.\n\n'
            'Aircraft, operator, tail, route and the manifest are never stored here — they are the trip\'s own '
            'facts, read through `tripId` on every request. VIEW_TRIPS reads, MANAGE_TRIPS writes, including '
            'archive and restore. Runs alone: it signs itself in, books its own trip, and archives everything '
            'it created.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text())
    folder = build(owner, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('newItineraryId', 'itineraryTripId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
