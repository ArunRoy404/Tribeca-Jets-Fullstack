#!/usr/bin/env python3
"""
Builds `16 · Empty Legs` (#15, with client adjustment #10b's matching),
capturing every example from a live API.

    npm run start:dev
    python3 postman/build_empty_legs_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: the leg it creates is archived at the end, in the builder and in
the folder's own teardown. It runs on the route of an existing trip request, so
the detail example shows real matches.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example,
    script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATUSES = 'AVAILABLE | MATCHED | BOOKED | EXPIRED'

CREATE_BODY = """{
  "originAirportId": "{{legOriginId}}",                // required · uuid, a live airport
  "destinationAirportId": "{{legDestinationId}}",      // required · uuid, a different live airport
  "departureDate": "2026-12-12",                       // required · YYYY-MM-DD
  "departureTime": "14:00",                            // optional · "HH:MM", 24-hour, local at the origin
  "expiresAt": "2026-12-10T18:00:00.000Z",             // optional · ISO timestamp. After it, the leg reads EXPIRED.
  "operatorId": "{{operatorId}}",                      // optional · uuid, a live operator
  "aircraftId": null,                                  // optional · uuid, a fleet aircraft…
  "aircraftDescription": "Citation XLS",               // optional · …or free text. Max 200.
  "seats": 8,                                          // optional · integer 1-500
  "price": 18500,                                      // optional · number, 2 decimals max
  "status": "AVAILABLE",                               // optional · AVAILABLE | MATCHED | BOOKED | EXPIRED (default AVAILABLE)
  "notes": "Repositioning after a drop-off."           // optional · max 5000
}"""

UPDATE_BODY = """{
  // Every field optional; null clears. Links are re-validated only when they change.
  "price": 16900,                                      // optional · number or null
  "status": "MATCHED",                                 // optional · AVAILABLE | MATCHED | BOOKED | EXPIRED
  "notes": null                                        // clears the notes
}"""

# Everything the create body needs, fetched per run so the folder passes alone:
# the route of an existing trip request (so matches appear) and an operator.
LOOKUPS = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/trip-requests?limit=1', method: 'GET' }, function (err, res) {",
    '    if (err || res.code !== 200 || !res.json().data.length) { return; }',
    '    const request = res.json().data[0];',
    "    pm.collectionVariables.set('legOriginId', request.originAirportId);",
    "    pm.collectionVariables.set('legDestinationId', request.destinationAirportId);",
    '});',
    "pm.sendRequest({ url: base + '/operators?limit=1', method: 'GET' }, function (err, res) {",
    "    if (!err && res.code === 200 && res.json().data.length) { pm.collectionVariables.set('operatorId', res.json().data[0].id); }",
    '});',
]

TEARDOWN = [
    '// Archive the leg this folder created — the run is a demonstration, not',
    '// data entry. Nothing is deleted: it sits in the Archived tab.',
    "const id = pm.collectionVariables.get('newEmptyLegId');",
    "if (id) { pm.sendRequest({ url: pm.collectionVariables.get('baseUrl') + '/empty-legs/' + id, method: 'DELETE', header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') } }, function () {}); }",
]


def build(owner: Session, assistant: Session, anonymous: Session):
    cap, created = {}, []
    request = owner.request('GET', '/trip-requests?limit=1')[1]['data'][0]
    origin, destination = request['originAirportId'], request['destinationAirportId']
    operator_id = owner.request('GET', '/operators?limit=1')[1]['data'][0]['id']

    payload = {
        'originAirportId': origin, 'destinationAirportId': destination,
        'departureDate': '2026-12-12', 'departureTime': '14:00',
        'expiresAt': '2026-12-10T18:00:00.000Z', 'operatorId': operator_id,
        'aircraftDescription': 'Citation XLS', 'seats': 8, 'price': 18500,
        'status': 'AVAILABLE', 'notes': 'Repositioning after a drop-off.',
    }

    try:
        cap['create'] = owner.request('POST', '/empty-legs', payload)
        leg = cap['create'][1]['data']
        created.append(leg['id'])
        cap['create_400'] = owner.request('POST', '/empty-legs', {**payload, 'destinationAirportId': origin})
        cap['create_403'] = assistant.request('POST', '/empty-legs', payload)

        cap['list'] = owner.request('GET', '/empty-legs?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/empty-legs?sortBy=seats')
        cap['list_401'] = anonymous.request('GET', '/empty-legs')
        cap['stats'] = owner.request('GET', '/empty-legs/stats')
        cap['detail'] = owner.request('GET', f"/empty-legs/{leg['id']}")
        cap['detail_404'] = owner.request('GET', f'/empty-legs/{MISSING}')

        update = {'price': 16900, 'status': 'MATCHED', 'notes': None}
        cap['update'] = owner.request('PATCH', f"/empty-legs/{leg['id']}", update)
        cap['update_400'] = owner.request('PATCH', f"/empty-legs/{leg['id']}", {})

        cap['remove_403'] = assistant.request('DELETE', f"/empty-legs/{leg['id']}")
        cap['remove'] = owner.request('DELETE', f"/empty-legs/{leg['id']}")
        cap['restore'] = owner.request('POST', f"/empty-legs/{leg['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/empty-legs/{leg['id']}/restore")
        cap['bulk'] = owner.request('POST', '/empty-legs/bulk-delete', {'ids': [leg['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/empty-legs/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/empty-legs/bulk-restore', {'ids': [leg['id']]})
    finally:
        for row_id in created:
            owner.request('DELETE', f'/empty-legs/{row_id}')

    leg_id = cap['create'][1]['data']['id']
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · reference ("EL-1001" or "1001"), airport code, operator, aircraft.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES} (case-sensitive). Filters on the status as read: an open leg past its expiry counts as EXPIRED.'},
        {'key': 'originAirportId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'destinationAirportId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. true lists only archived legs.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | reference | departureDate | expiresAt | price. Default createdAt.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]

    items = [
        {
            'name': '01 · Record an empty leg',
            'event': [
                script('prerequest', LOOKUPS),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('newEmptyLegId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/empty-legs'),
                'description': (
                    'A repositioning flight an operator is flying anyway. OPERATOR_SOURCING to write; an '
                    'assistant reads only. The pre-request script takes the route of an existing trip request, '
                    'so `04` shows real matches.'),
            },
            'response': [
                example('201 · Recorded', 'POST', '/empty-legs', *cap['create'], req_body=payload),
                example('400 · Same airport at both ends', 'POST', '/empty-legs', *cap['create_400']),
                example('403 · Assistant cannot record legs', 'POST', '/empty-legs', *cap['create_403']),
            ],
        },
        {
            'name': '02 · List empty legs',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/empty-legs', list_query),
                'description': (
                    'Each row carries `matchCount` and `dateMatchCount` — how many trip requests share its '
                    'route, and how many of those asked for a day within ±3 days of it. `status` is the status '
                    'as read (EXPIRED once `expiresAt` passes); `storedStatus` is what was set.'),
            },
            'response': [
                example('200 · A page of legs', 'GET', '/empty-legs?page=1&limit=10', *cap['list']),
                example('400 · Unsortable column', 'GET', '/empty-legs?sortBy=seats', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/empty-legs', *cap['list_401']),
            ],
        },
        {
            'name': '03 · Board tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/empty-legs/stats'),
                'description': (
                    'Counts by status as read, and the value of the open legs. `pricedOpenCount` says how many '
                    'open legs carry a price — an unpriced leg is never summed as $0.'),
            },
            'response': [example('200 · Tiles', 'GET', '/empty-legs/stats', *cap['stats'])],
        },
        {
            'name': '04 · Get one, with its matches',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/empty-legs/{{newEmptyLegId}}'),
                'description': (
                    'Client adjustment #10b: `matches` lists every trip request on the same route — **lost, '
                    'converted and archived ones included**, because the point is to call the clients who did '
                    'not fly — with the client\'s phone and email. Requests within ±3 days come first '
                    '(`dateMatch`), then the newest. Scoped like trip requests: a broker sees the matches they '
                    'may see. Archived legs load too.'),
            },
            'response': [
                example('200 · The leg and its matches', 'GET', f'/empty-legs/{leg_id}', *cap['detail']),
                example('404 · Not found', 'GET', f'/empty-legs/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Edit an empty leg',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/empty-legs/{{newEmptyLegId}}'),
                'description': 'Status changes go through here too. An archived leg cannot be edited — restore it first.',
            },
            'response': [
                example('200 · Repriced and matched', 'PATCH', f'/empty-legs/{leg_id}', *cap['update'],
                        req_body={'price': 16900, 'status': 'MATCHED', 'notes': None}),
                example('400 · Empty body', 'PATCH', f'/empty-legs/{leg_id}', *cap['update_400'], req_body={}),
            ],
        },
        {
            'name': '06 · Archive an empty leg',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/empty-legs/{{newEmptyLegId}}'),
                'description': 'Nothing is deleted; the leg moves to the Archived tab.',
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/empty-legs/{leg_id}', *cap['remove']),
                example('403 · Assistant cannot archive', 'DELETE', f'/empty-legs/{leg_id}', *cap['remove_403']),
            ],
        },
        {
            'name': '07 · Restore an empty leg',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/empty-legs/{{newEmptyLegId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/empty-legs/{leg_id}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/empty-legs/{leg_id}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '08 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newEmptyLegId}}"]  // required · 1-100 uuids. Unknown ids come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/empty-legs/bulk-delete'),
                'description': 'Partial success is success.',
            },
            'response': [
                example('200 · Archived', 'POST', '/empty-legs/bulk-delete', *cap['bulk'], req_body={'ids': [leg_id, MISSING]}),
                example('400 · Nothing selected', 'POST', '/empty-legs/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '09 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newEmptyLegId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/empty-legs/bulk-restore'),
                'description': 'The Archived tab\'s bulk action.',
            },
            'response': [example('200 · Restored', 'POST', '/empty-legs/bulk-restore', *cap['bulk_restore'], req_body={'ids': [leg_id]})],
        },
        {
            'name': '10 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe row archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/empty-legs/stats'),
                'description': 'Archives the leg this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '16 · Empty Legs',
        'description': (
            'Repositioning flights offered at a discount (#15), and client adjustment #10b: each leg lists the '
            'past trip requests on its route, lost and archived ones included, so the desk can call those '
            'clients.\n\nOPERATOR_SOURCING reads and writes; an assistant reads. Runs alone: it signs itself '
            'in, borrows an existing request\'s route and an operator, and archives what it created.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {'newEmptyLegId': '', 'legOriginId': '', 'legDestinationId': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
