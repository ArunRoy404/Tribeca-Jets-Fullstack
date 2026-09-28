#!/usr/bin/env python3
"""
Builds `20 · Operator Payments` (#17), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_operator_payments_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: it books its own trips (with the first seeded operator), and at
the end withdraws its payments and archives every bill and trip it made — in
the builder and in the folder's own teardown. Nothing is deleted.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example,
    script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATES = 'DUE | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED'
STATUSES = 'OPEN | CANCELLED'
METHODS = 'WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER'

CREATE_BODY = """{
  "tripId": "{{payableTripId}}",                       // required · uuid, a live trip you may see
  "operatorId": null,                                  // optional · uuid, who billed it. Defaults to the trip's operator.
  "amount": 48000,                                     // required · 0.01-100000000, 2 decimals. What the operator billed.
  "dueDate": "2026-12-01",                             // optional · YYYY-MM-DD. No due date, never overdue.
  "operatorReference": "FJ-INV-20931",                 // optional · max 100. The operator's own invoice number.
  "notes": "Net 15 per their terms."                   // optional · max 5000
}"""

UPDATE_BODY = """{
  // Every field optional; null clears. The trip is fixed once recorded.
  "dueDate": "2026-12-05",                             // optional · YYYY-MM-DD
  "status": "OPEN"                                     // optional · OPEN | CANCELLED
}"""

PAYMENT_BODY = """{
  "amount": 20000,                                     // required · 0.01-100000000, 2 decimals. Never past what is owed.
  "paidAt": "2026-11-20",                              // optional · YYYY-MM-DD, the day it left. Default today.
  "method": "WIRE_TRANSFER",                           // required · WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER
  "reference": "OUT-55120",                            // optional · max 100. Wire confirmation, cheque number.
  "notes": "Deposit to secure the aircraft."           // optional · max 5000
}"""

PAYMENT_UPDATE_BODY = """{
  // Every field optional; null clears reference and notes.
  "amount": 25000                                      // optional · checked against the bill without this payment
}"""

# A trip of this folder's own with an operator, per run — so it passes alone.
SETUP = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (err, clients) {",
    '    if (err || clients.code !== 200 || !clients.json().data.length) { return; }',
    "    pm.sendRequest({ url: base + '/operators?limit=1', method: 'GET' }, function (o, operators) {",
    '        if (o || operators.code !== 200 || !operators.json().data.length) { return; }',
    "        pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (e, airports) {",
    '            if (e || airports.code !== 200 || airports.json().data.length < 2) { return; }',
    '            const a = airports.json().data;',
    '            pm.sendRequest({',
    "                url: base + '/trips', method: 'POST', header: headers,",
    '                body: { mode: \'raw\', raw: JSON.stringify({',
    "                    clientId: clients.json().data[0].id, operatorId: operators.json().data[0].id,",
    "                    type: 'ONE_WAY', status: 'BOOKED',",
    "                    legs: [{ originAirportId: a[0].id, destinationAirportId: a[1].id, departureDate: '2026-12-18' }],",
    '                    basePrice: 60000, operatorCost: 48000,',
    '                }) },',
    '            }, function (x, trip) {',
    "                if (!x && trip.code === 201) { pm.collectionVariables.set('payableTripId', trip.json().data.id); }",
    '            });',
    '        });',
    '    });',
    '});',
]

# The main bill carries a payment, and a bill with money against it cannot be
# archived — so the archive requests work on a bill of their own.
SPARE_SETUP = [
    '// A payment-free bill for the archive requests: a bill with a live payment',
    '// cannot be archived, which is the point of that rule.',
    "const base = pm.collectionVariables.get('baseUrl');",
    'pm.sendRequest({',
    "    url: base + '/operator-payments', method: 'POST',",
    "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
    "    body: { mode: 'raw', raw: JSON.stringify({ tripId: pm.collectionVariables.get('payableTripId'), amount: 1200 }) },",
    '}, function (err, res) {',
    "    if (!err && res.code === 201) { pm.collectionVariables.set('sparePayableId', res.json().data.id); }",
    '});',
]

TEARDOWN = [
    '// Withdraw the payment, then archive what this folder created. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "const payable = pm.collectionVariables.get('newPayableId');",
    "const payment = pm.collectionVariables.get('newOperatorPaymentId');",
    "const spare = pm.collectionVariables.get('sparePayableId');",
    "const trip = pm.collectionVariables.get('payableTripId');",
    'function archiveTrip() {',
    "    if (trip) { pm.sendRequest({ url: base + '/trips/' + trip, method: 'DELETE', header: headers }, function () {}); }",
    '}',
    'function archiveBills() {',
    "    if (spare) { pm.sendRequest({ url: base + '/operator-payments/' + spare, method: 'DELETE', header: headers }, function () {}); }",
    "    if (!payable) { return archiveTrip(); }",
    "    pm.sendRequest({ url: base + '/operator-payments/' + payable, method: 'DELETE', header: headers }, function () { archiveTrip(); });",
    '}',
    'if (payable && payment) {',
    "    pm.sendRequest({ url: base + '/operator-payments/' + payable + '/payments/' + payment, method: 'DELETE', header: headers }, function () { archiveBills(); });",
    '} else {',
    '    archiveBills();',
    '}',
]


def user_id(session: Session, search: str) -> str:
    rows = session.request('GET', f'/users?search={search}&limit=1')[1]['data']
    if not rows:
        raise SystemExit(f'no seeded user matching {search!r}')
    return rows[0]['id']


def build(owner: Session, broker: Session, assistant: Session, anonymous: Session):
    cap = {}
    trips, payables, payments = [], [], []
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    operator_id = owner.request('GET', '/operators?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    mark_id = user_id(owner, 'mark')

    def book(assigned=None, operator=operator_id):
        body = {
            'clientId': client_id, 'type': 'ONE_WAY', 'status': 'BOOKED',
            'legs': [{'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
                      'departureDate': '2026-12-18'}],
            'basePrice': 60000, 'operatorCost': 48000,
        }
        if operator:
            body['operatorId'] = operator
        if assigned:
            body['assignedBrokerId'] = assigned
        trip = owner.request('POST', '/trips', body)[1]['data']
        trips.append(trip['id'])
        return trip

    try:
        trip = book()
        # Another broker's trip: the seeded broker cannot see it, so its bill is
        # a 404 to them rather than a 403.
        marks_trip = book(mark_id)
        # A trip with no operator yet, for the 400 that asks who billed it.
        bare_trip = book(operator=None)

        payload = {'tripId': trip['id'], 'amount': 48000, 'dueDate': '2026-12-01',
                   'operatorReference': 'FJ-INV-20931', 'notes': 'Net 15 per their terms.'}
        cap['create'] = owner.request('POST', '/operator-payments', payload)
        bill = cap['create'][1]['data']
        payables.append(bill['id'])
        cap['create_400'] = owner.request('POST', '/operator-payments', {'tripId': bare_trip['id'], 'amount': 5000})
        cap['create_403'] = broker.request('POST', '/operator-payments', payload)

        hidden = owner.request('POST', '/operator-payments', {'tripId': marks_trip['id'], 'amount': 9000})[1]['data']
        payables.append(hidden['id'])

        cap['list'] = owner.request('GET', '/operator-payments?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/operator-payments?state=LATE')
        cap['list_401'] = anonymous.request('GET', '/operator-payments')
        cap['list_403'] = assistant.request('GET', '/operator-payments')
        cap['stats'] = owner.request('GET', '/operator-payments/stats')
        cap['stats_400'] = owner.request('GET', '/operator-payments/stats?page=1')
        cap['detail'] = owner.request('GET', f"/operator-payments/{bill['id']}")
        cap['detail_404'] = broker.request('GET', f"/operator-payments/{hidden['id']}")

        cap['update'] = owner.request('PATCH', f"/operator-payments/{bill['id']}", {'dueDate': '2026-12-05', 'status': 'OPEN'})
        cap['update_400'] = owner.request('PATCH', f"/operator-payments/{bill['id']}", {})

        pay = {'amount': 20000, 'paidAt': '2026-11-20', 'method': 'WIRE_TRANSFER', 'reference': 'OUT-55120',
               'notes': 'Deposit to secure the aircraft.'}
        cap['pay'] = owner.request('POST', f"/operator-payments/{bill['id']}/payments", pay)
        payment_id = cap['pay'][1]['data']['payments'][0]['id']
        payments.append((bill['id'], payment_id))
        cap['pay_400'] = owner.request('POST', f"/operator-payments/{bill['id']}/payments", {**pay, 'amount': 30000})
        cap['pay_403'] = broker.request('POST', f"/operator-payments/{bill['id']}/payments", pay)
        cap['cancel_400'] = owner.request('PATCH', f"/operator-payments/{bill['id']}", {'status': 'CANCELLED'})

        payment_path = f"/operator-payments/{bill['id']}/payments/{payment_id}"
        cap['correct'] = owner.request('PATCH', payment_path, {'amount': 25000})
        cap['correct_400'] = owner.request('PATCH', payment_path, {'amount': 50000})
        cap['withdraw'] = owner.request('DELETE', payment_path)
        cap['restore_payment'] = owner.request('POST', f'{payment_path}/restore')
        cap['restore_payment_404'] = owner.request('POST', f'{payment_path}/restore')

        cap['remove_400'] = owner.request('DELETE', f"/operator-payments/{bill['id']}")
        spare = owner.request('POST', '/operator-payments', {'tripId': trip['id'], 'amount': 1200})[1]['data']
        payables.append(spare['id'])
        cap['remove_403'] = broker.request('DELETE', f"/operator-payments/{spare['id']}")
        cap['remove'] = owner.request('DELETE', f"/operator-payments/{spare['id']}")
        cap['restore'] = owner.request('POST', f"/operator-payments/{spare['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/operator-payments/{spare['id']}/restore")
        cap['bulk'] = owner.request('POST', '/operator-payments/bulk-delete', {'ids': [spare['id'], bill['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/operator-payments/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/operator-payments/bulk-restore', {'ids': [spare['id']]})
    finally:
        for payable_id, pid in payments:
            owner.request('DELETE', f'/operator-payments/{payable_id}/payments/{pid}')
        for row_id in payables:
            owner.request('DELETE', f'/operator-payments/{row_id}')
        for row_id in trips:
            owner.request('DELETE', f'/trips/{row_id}')

    bid = bill['id']
    sid = spare['id']
    pid = payment_id
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True,
         'description': 'optional · bill number ("OP-2026-0045", "45"), trip ("TJ-1048"), operator name, their invoice number, the trip\'s client, notes.'},
        {'key': 'state', 'value': None, 'disabled': True,
         'description': f'optional · {STATES} (case-sensitive). Computed from payments and the due date, never stored.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One trip\'s bills — its financial card.'},
        {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The operator page\'s Payments tab.'},
        {'key': 'brokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The broker on the bill\'s trip.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false.'},
        {'key': 'sortBy', 'value': None, 'disabled': True,
         'description': 'optional · createdAt | updatedAt | reference | dueDate | status. Default createdAt. Due dates sort nulls last.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]
    stats_query = [
        {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One operator — their total paid.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One trip.'},
    ]

    items = [
        {
            'name': '01 · Record an operator bill',
            'event': [
                script('prerequest', SETUP),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('newPayableId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments'),
                'description': (
                    'What an operator billed Tribeca for a trip. Stored as billed — a deposit and a balance are two '
                    'bills, and a later edit to the trip\'s operator cost never rewrites one already received. '
                    '`operatorId` defaults to the trip\'s operator. `number` ("OP-2026-0045") is fixed at creation. '
                    'MANAGE_OPERATOR_PAYMENTS — administrators and senior brokers; it is money leaving the company.'),
            },
            'response': [
                example('201 · Recorded', 'POST', '/operator-payments', *cap['create'], req_body=payload),
                example('400 · The trip has no operator yet', 'POST', '/operator-payments', *cap['create_400'],
                        req_body={'tripId': bare_trip['id'], 'amount': 5000}),
                example('403 · A broker cannot record operator bills', 'POST', '/operator-payments', *cap['create_403']),
            ],
        },
        {
            'name': '02 · List operator bills',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/operator-payments', list_query),
                'description': (
                    'ALL for administrators and senior brokers; a broker reads the bills on the trips they may see. '
                    f'`state` is {STATES}: OVERDUE is owing past its due date; a fully paid bill is PAID however late.'),
            },
            'response': [
                example('200 · A page of bills', 'GET', '/operator-payments?page=1&limit=10', *cap['list']),
                example('400 · Unknown state', 'GET', '/operator-payments?state=LATE', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/operator-payments', *cap['list_401']),
                example('403 · An assistant cannot read operator payments', 'GET', '/operator-payments', *cap['list_403']),
            ],
        },
        {
            'name': '03 · Totals',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/operator-payments/stats', stats_query),
                'description': (
                    'Payable (open bills), paid, outstanding, overdue and due this week (owing, due today or in the next '
                    'six days), summed in cents over the caller\'s scope, plus a count per state. Takes no paging, '
                    'search or sort — any other parameter is a 400.'),
            },
            'response': [
                example('200 · Totals', 'GET', '/operator-payments/stats', *cap['stats']),
                example('400 · A parameter it does not take', 'GET', '/operator-payments/stats?page=1', *cap['stats_400']),
            ],
        },
        {
            'name': '04 · Get one bill',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/operator-payments/{{newPayableId}}'),
                'description': (
                    'With its live `payments` and its `withdrawnPayments`. Archived bills load too. Outside the '
                    'caller\'s scope — another broker\'s trip — 404, never 403.'),
            },
            'response': [
                example('200 · The bill', 'GET', f'/operator-payments/{bid}', *cap['detail']),
                example('404 · Another broker\'s trip (as a broker)', 'GET', f"/operator-payments/{hidden['id']}", *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Edit a bill',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments/{{newPayableId}}'),
                'description': (
                    'The amount cannot drop below what has been paid, and a bill with live payments cannot be '
                    f'cancelled — withdraw them first, so the ledger says where the money went. Statuses: {STATUSES}.'),
            },
            'response': [
                example('200 · Saved', 'PATCH', f'/operator-payments/{bid}', *cap['update'],
                        req_body={'dueDate': '2026-12-05', 'status': 'OPEN'}),
                example('400 · Empty body', 'PATCH', f'/operator-payments/{bid}', *cap['update_400'], req_body={}),
                example('400 · Cancelling a bill with payments', 'PATCH', f'/operator-payments/{bid}', *cap['cancel_400'],
                        req_body={'status': 'CANCELLED'}),
            ],
        },
        {
            'name': '06 · Record a payment',
            'event': [script('test', [
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.collectionVariables.set('newOperatorPaymentId', pm.response.json().data.payments[0].id);",
            ])],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PAYMENT_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments/{{newPayableId}}/payments'),
                'description': f'Money sent to the operator. Never past what the bill still owes. Returns the bill. Methods: {METHODS}.',
            },
            'response': [
                example('201 · Recorded', 'POST', f'/operator-payments/{bid}/payments', *cap['pay'], req_body=pay),
                example('400 · More than is owed', 'POST', f'/operator-payments/{bid}/payments', *cap['pay_400'],
                        req_body={**pay, 'amount': 30000}),
                example('403 · A broker cannot pay operators', 'POST', f'/operator-payments/{bid}/payments', *cap['pay_403'], req_body=pay),
            ],
        },
        {
            'name': '07 · Correct a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PAYMENT_UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments/{{newPayableId}}/payments/{{newOperatorPaymentId}}'),
                'description': 'A new amount is checked against the bill *without* this payment in it. Returns the bill.',
            },
            'response': [
                example('200 · Corrected', 'PATCH', f'/operator-payments/{bid}/payments/{pid}', *cap['correct'], req_body={'amount': 25000}),
                example('400 · More than is owed', 'PATCH', f'/operator-payments/{bid}/payments/{pid}', *cap['correct_400'],
                        req_body={'amount': 50000}),
            ],
        },
        {
            'name': '08 · Withdraw a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS,
                'url': url('/operator-payments/{{newPayableId}}/payments/{{newOperatorPaymentId}}'),
                'description': 'The payment stays on the record under `withdrawnPayments`. Returns the bill.',
            },
            'response': [example('200 · Withdrawn', 'DELETE', f'/operator-payments/{bid}/payments/{pid}', *cap['withdraw'])],
        },
        {
            'name': '09 · Restore a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'url': url('/operator-payments/{{newPayableId}}/payments/{{newOperatorPaymentId}}/restore'),
                'description': 'Re-checked against the bill as it is now — refused if it would overpay it or the bill is cancelled. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/operator-payments/{bid}/payments/{pid}/restore', *cap['restore_payment']),
                example('404 · Not withdrawn', 'POST', f'/operator-payments/{bid}/payments/{pid}/restore', *cap['restore_payment_404']),
            ],
        },
        {
            'name': '10 · Archive a bill',
            'event': [script('prerequest', SPARE_SETUP), status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/operator-payments/{{sparePayableId}}'),
                'description': (
                    'Only with no live payments — the money would vanish from every total with it. Runs on a '
                    'payment-free bill its pre-request records. Nothing is deleted.'),
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/operator-payments/{sid}', *cap['remove']),
                example('400 · It has payments', 'DELETE', f'/operator-payments/{bid}', *cap['remove_400']),
                example('403 · A broker cannot archive', 'DELETE', f'/operator-payments/{sid}', *cap['remove_403']),
            ],
        },
        {
            'name': '11 · Restore a bill',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/operator-payments/{{sparePayableId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/operator-payments/{sid}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/operator-payments/{sid}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '12 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{sparePayableId}}"]  // required · 1-100 uuids. Bills with payments, and unknown ids, come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments/bulk-delete'),
                'description': 'Partial success is success: a bill carrying payments is skipped, not refused.',
            },
            'response': [
                example('200 · Archived, one skipped for its payment', 'POST', '/operator-payments/bulk-delete', *cap['bulk'],
                        req_body={'ids': [sid, bid, MISSING]}),
                example('400 · Nothing selected', 'POST', '/operator-payments/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '13 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{sparePayableId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/operator-payments/bulk-restore'),
                'description': 'The Archived tab\'s bulk action.',
            },
            'response': [example('200 · Restored', 'POST', '/operator-payments/bulk-restore', *cap['bulk_restore'], req_body={'ids': [sid]})],
        },
        {
            'name': '14 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/operator-payments/stats'),
                'description': 'Withdraws the payment, then archives both bills and the trip this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '20 · Operator Payments',
        'description': (
            'What Tribeca owes operators for its trips, and the money sent against each bill (#17, scope §6.14 and '
            '§9.3).\n\nA bill stores what the operator billed; payments are a ledger under it. Paid, balance and state '
            'are computed on every read, with the same arithmetic Receivables uses. VIEW_OPERATOR_PAYMENTS reads at the '
            'trip\'s scope; MANAGE_OPERATOR_PAYMENTS (administrators and senior brokers) writes. Runs alone: it books '
            'its own trip and archives everything it made.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {
        'payableTripId': '', 'newPayableId': '', 'newOperatorPaymentId': '', 'sparePayableId': '',
    })

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
