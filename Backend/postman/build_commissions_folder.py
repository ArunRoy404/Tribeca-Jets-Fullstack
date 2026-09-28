#!/usr/bin/env python3
"""
Builds `17 · Commissions` (#18, for client adjustment #11), capturing every
example from a live API.

    npm run db:seed          # the seeded referral agent, agent@tribecajets.com
    npm run start:dev
    python3 postman/build_commissions_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: it books its own priced trip, and archives every commission and
the trip at the end, in the builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example,
    script, sign_in_as, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
AGENT_EMAIL = 'agent@tribecajets.com'
STATUSES = 'PENDING | EARNED | PAID | CANCELLED'
BASES = 'PERCENT_OF_PROFIT | FLAT_FEE | CUSTOM'
RECIPIENTS = 'REFERRAL_AGENT | CLIENT | MANUAL'
METHODS = 'WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER'

CREATE_BODY = """{
  "tripId": "{{commissionTripId}}",                    // required · uuid, a live trip
  "recipientType": "REFERRAL_AGENT",                   // required · REFERRAL_AGENT | CLIENT | MANUAL
  "recipientUserId": "{{agentUserId}}",                // REFERRAL_AGENT · a referral agent's user id
  "recipientClientId": null,                           // CLIENT · a live client (e.g. a travel agent)
  "recipientName": null,                               // MANUAL · who is paid. Max 200.
  "recipientCompany": null,                            // MANUAL · optional. Max 200.
  "referralId": null,                                  // optional · uuid, a referral by the same agent
  "brokerId": null,                                    // optional · uuid. Defaults to the trip's broker.

  // Omit basis for a referral agent to copy their standard terms.
  "basis": null,                                       // optional · PERCENT_OF_PROFIT | FLAT_FEE | CUSTOM
  "percentage": null,                                  // PERCENT_OF_PROFIT · 0.01-100, 2 decimals
  "amount": null,                                      // FLAT_FEE · 0.01-10000000, 2 decimals
  "finalAmount": null,                                 // optional · the settled figure, once agreed

  "status": "PENDING",                                 // optional · PENDING | EARNED | PAID | CANCELLED (default PENDING)
  "method": null,                                      // optional · WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER
  "paidAt": null,                                      // optional · YYYY-MM-DD. Defaults to today when PAID.
  "notes": "Standard terms."                           // optional · max 5000. Never shown to the agent.
}"""

UPDATE_BODY = """{
  // Every field optional; null clears.
  "status": "PAID",                                    // optional · PENDING | EARNED | PAID | CANCELLED
  "method": "WIRE_TRANSFER",                           // optional · payment method
  "finalAmount": 1400                                  // optional · the settled amount
}"""

# A priced trip of this folder's own, and the seeded agent's id, per run — so
# the folder passes alone and percent-of-profit has a real value.
SETUP = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/users?role=REFERRAL_AGENT&limit=1', method: 'GET' }, function (err, res) {",
    "    if (!err && res.code === 200 && res.json().data.length) { pm.collectionVariables.set('agentUserId', res.json().data[0].id); }",
    '});',
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (err, clients) {",
    '    if (err || clients.code !== 200 || !clients.json().data.length) { return; }',
    "    pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (e, airports) {",
    '        if (e || airports.code !== 200 || airports.json().data.length < 2) { return; }',
    '        const a = airports.json().data;',
    '        pm.sendRequest({',
    "            url: base + '/trips', method: 'POST', header: headers,",
    '            body: { mode: \'raw\', raw: JSON.stringify({',
    "                clientId: clients.json().data[0].id, type: 'ONE_WAY', status: 'BOOKED',",
    "                legs: [{ originAirportId: a[0].id, destinationAirportId: a[1].id, departureDate: '2026-12-18' }],",
    '                basePrice: 60000, operatorCost: 48000,',
    '            }) },',
    '        }, function (x, trip) {',
    "            if (!x && trip.code === 201) { pm.collectionVariables.set('commissionTripId', trip.json().data.id); }",
    '        });',
    '    });',
    '});',
]

TEARDOWN = [
    '// Archive what this folder created. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "const commission = pm.collectionVariables.get('newCommissionId');",
    "if (commission) { pm.sendRequest({ url: base + '/commissions/' + commission, method: 'DELETE', header: headers }, function () {}); }",
    "const trip = pm.collectionVariables.get('commissionTripId');",
    "if (trip) { pm.sendRequest({ url: base + '/trips/' + trip, method: 'DELETE', header: headers }, function () {}); }",
]


def me(session: Session) -> dict:
    data = session.request('GET', '/auth/me')[1]['data']
    return data.get('user', data)


def build(owner: Session, broker: Session, agent: Session, anonymous: Session):
    cap, commissions, trips = {}, [], []
    agent_id = me(agent)['id']
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']

    try:
        trip = owner.request('POST', '/trips', {
            'clientId': client_id, 'type': 'ONE_WAY', 'status': 'BOOKED',
            'legs': [{'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
                      'departureDate': '2026-12-18'}],
            'basePrice': 60000, 'operatorCost': 48000,
        })[1]['data']
        trips.append(trip['id'])

        payload = {'tripId': trip['id'], 'recipientType': 'REFERRAL_AGENT', 'recipientUserId': agent_id,
                   'status': 'PENDING', 'notes': 'Standard terms.'}
        cap['create'] = owner.request('POST', '/commissions', payload)
        commission = cap['create'][1]['data']
        commissions.append(commission['id'])
        cap['create_400'] = owner.request('POST', '/commissions', {'tripId': trip['id'], 'recipientType': 'MANUAL'})
        cap['create_403'] = broker.request('POST', '/commissions', payload)

        # A commission to somebody else, which the agent must not be able to see.
        manual = owner.request('POST', '/commissions', {
            'tripId': trip['id'], 'recipientType': 'MANUAL', 'recipientName': 'Harbour Travel',
            'basis': 'FLAT_FEE', 'amount': 750,
        })[1]['data']
        commissions.append(manual['id'])

        cap['list'] = owner.request('GET', '/commissions?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/commissions?sortBy=amount')
        cap['list_401'] = anonymous.request('GET', '/commissions')
        cap['list_agent'] = agent.request('GET', '/commissions?page=1&limit=10')
        cap['stats'] = owner.request('GET', '/commissions/stats')
        cap['stats_agent'] = agent.request('GET', '/commissions/stats')
        cap['detail'] = owner.request('GET', f"/commissions/{commission['id']}")
        cap['detail_404'] = agent.request('GET', f"/commissions/{manual['id']}")

        update = {'status': 'PAID', 'method': 'WIRE_TRANSFER', 'finalAmount': 1400}
        cap['update'] = owner.request('PATCH', f"/commissions/{commission['id']}", update)
        cap['update_400'] = owner.request('PATCH', f"/commissions/{commission['id']}", {})

        cap['remove_403'] = broker.request('DELETE', f"/commissions/{commission['id']}")
        cap['remove'] = owner.request('DELETE', f"/commissions/{commission['id']}")
        cap['restore'] = owner.request('POST', f"/commissions/{commission['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/commissions/{commission['id']}/restore")
        cap['bulk'] = owner.request('POST', '/commissions/bulk-delete', {'ids': [commission['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/commissions/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/commissions/bulk-restore', {'ids': [commission['id']]})
    finally:
        for row_id in commissions:
            owner.request('DELETE', f'/commissions/{row_id}')
        for row_id in trips:
            owner.request('DELETE', f'/trips/{row_id}')

    cid = cap['create'][1]['data']['id']
    manual_id = manual['id']  # somebody else's commission, which the agent may not see
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · reference ("COM-1001" or "1001"), recipient, trip.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES} (case-sensitive).'},
        {'key': 'recipientType', 'value': None, 'disabled': True, 'description': f'optional · {RECIPIENTS}.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The trip\'s financial card.'},
        {'key': 'referralId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'recipientUserId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One referral agent\'s commissions.'},
        {'key': 'brokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. Ignored for a referral agent, who never sees archived rows.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | reference | paidAt | status. Default createdAt.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]

    items = [
        {
            'name': '01 · Record a commission',
            'event': [
                script('prerequest', SETUP),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('newCommissionId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/commissions'),
                'description': (
                    'On a trip, to a referral agent, a client (a travel agent) or a named person. With no '
                    '`basis`, an agent\'s standing terms are copied — editing the agent later never rewrites a '
                    'commission already raised. Percent of profit is computed from the trip on every read, in '
                    'cents; `estimatedAmount` is null while the trip\'s profit is unknown, never $0. '
                    f'MANAGE_COMMISSIONS (administrators and senior brokers). Bases: {BASES}. Methods: {METHODS}.'),
            },
            'response': [
                example('201 · Recorded on the agent\'s standard terms', 'POST', '/commissions', *cap['create'], req_body=payload),
                example('400 · A manual recipient needs a name', 'POST', '/commissions', *cap['create_400'],
                        req_body={'tripId': trip['id'], 'recipientType': 'MANUAL'}),
                example('403 · A broker cannot record commissions', 'POST', '/commissions', *cap['create_403']),
            ],
        },
        {
            'name': '02 · List commissions',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions', list_query),
                'description': (
                    'ALL for administrators and senior brokers; a broker sees the commissions on their own '
                    'trips. Each row carries `estimatedAmount` and `value` (final once settled, the estimate '
                    'until then). The trip\'s price, cost and profit are never in the response.'),
            },
            'response': [
                example('200 · A page of commissions', 'GET', '/commissions?page=1&limit=10', *cap['list']),
                example('400 · Unsortable column', 'GET', '/commissions?sortBy=amount', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/commissions', *cap['list_401']),
            ],
        },
        {
            'name': '03 · List as the referral agent',
            'event': [script('prerequest', sign_in_as('agentEmail', 'agent')), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions', list_query[:2]),
                'description': (
                    'The portal\'s Commission Center (#11). Made as the seeded referral agent: only their own '
                    'commissions, projected down to client/trip, trip date, structure, estimated, final, status '
                    'and payment date — no notes, no broker, nothing about the trip\'s money.'),
            },
            'response': [example('200 · The agent\'s own, narrowed', 'GET', '/commissions?page=1&limit=10', *cap['list_agent'])],
        },
        {
            'name': '04 · Totals',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions/stats'),
                'description': (
                    'Pending, earned (unpaid), paid, `earnedToDate` (earned + paid — the portal\'s "total '
                    'commission earned"), total and average, summed in cents over the caller\'s own scope. '
                    '`unvalued` counts commissions whose value waits on the trip\'s figures; they are in no total.'),
            },
            'response': [example('200 · Totals', 'GET', '/commissions/stats', *cap['stats'])],
        },
        {
            'name': '05 · Totals as the referral agent',
            'event': [script('prerequest', sign_in_as('agentEmail', 'agent')), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions/stats'),
                'description': 'The portal dashboard\'s pending / earned / paid tiles — the agent\'s own commissions only.',
            },
            'response': [example('200 · The agent\'s totals', 'GET', '/commissions/stats', *cap['stats_agent'])],
        },
        {
            'name': '06 · Get one commission',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions/{{newCommissionId}}'),
                'description': 'Archived commissions load too. Outside the caller\'s scope — another agent\'s, say — 404, never 403.',
            },
            'response': [
                example('200 · The commission', 'GET', f'/commissions/{cid}', *cap['detail']),
                example('404 · Not theirs (as the agent)', 'GET', f'/commissions/{manual_id}', *cap['detail_404']),
            ],
        },
        {
            'name': '07 · Settle a commission',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/commissions/{{newCommissionId}}'),
                'description': 'Marking it PAID with no `paidAt` stamps today. Only the fields sent change.',
            },
            'response': [
                example('200 · Paid', 'PATCH', f'/commissions/{cid}', *cap['update'],
                        req_body={'status': 'PAID', 'method': 'WIRE_TRANSFER', 'finalAmount': 1400}),
                example('400 · Empty body', 'PATCH', f'/commissions/{cid}', *cap['update_400'], req_body={}),
            ],
        },
        {
            'name': '08 · Archive a commission',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/commissions/{{newCommissionId}}'),
                'description': 'MANAGE_COMMISSIONS. Nothing is deleted; money history never is.',
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/commissions/{cid}', *cap['remove']),
                example('403 · A broker cannot archive', 'DELETE', f'/commissions/{cid}', *cap['remove_403']),
            ],
        },
        {
            'name': '09 · Restore a commission',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/commissions/{{newCommissionId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/commissions/{cid}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/commissions/{cid}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '10 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newCommissionId}}"]  // required · 1-100 uuids. Unknown ids come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/commissions/bulk-delete'),
                'description': 'Partial success is success.',
            },
            'response': [
                example('200 · Archived', 'POST', '/commissions/bulk-delete', *cap['bulk'], req_body={'ids': [cid, MISSING]}),
                example('400 · Nothing selected', 'POST', '/commissions/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '11 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newCommissionId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/commissions/bulk-restore'),
                'description': 'The Archived tab\'s bulk action.',
            },
            'response': [example('200 · Restored', 'POST', '/commissions/bulk-restore', *cap['bulk_restore'], req_body={'ids': [cid]})],
        },
        {
            'name': '12 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/commissions/stats'),
                'description': 'Archives the commission and the trip this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '17 · Commissions',
        'description': (
            'What is paid out on a trip (#18) — to a referral agent, a client or a named person — and the '
            'referral portal\'s Commission Center (#11).\n\nVIEW_COMMISSIONS reads (ALL, or OWN for a broker and a '
            'referral agent); MANAGE_COMMISSIONS writes. Runs alone: it books its own priced trip, finds the '
            'seeded referral agent, signs in as them for `03` and `05`, and archives what it created.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    agent = Session(AGENT_EMAIL)
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {
        'agentEmail': AGENT_EMAIL, 'agentUserId': '', 'commissionTripId': '', 'newCommissionId': '',
    })

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
