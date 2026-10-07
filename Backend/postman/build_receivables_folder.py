#!/usr/bin/env python3
"""
Builds `19 · Receivables` (#16), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_receivables_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: it books its own priced trips, and at the end withdraws its
payments and archives every invoice and trip it made — in the builder and in
the folder's own teardown. Nothing is deleted.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example,
    script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATES = 'DRAFT | DUE | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED'
STATUSES = 'DRAFT | SENT | CANCELLED'
METHODS = 'WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER'

CREATE_BODY = """{
  "tripId": "{{receivableTripId}}",                    // required · uuid, a live trip you may see
  "clientId": null,                                    // optional · uuid, who is billed. Defaults to the trip's client.
  "amount": 60000,                                     // required · 0.01-100000000, 2 decimals. The charge before FET.
  "fetAmount": 4500,                                   // optional · 0-100000000, 2 decimals. Default 0.
  "status": "DRAFT",                                   // optional · DRAFT | SENT (default DRAFT)
  "issuedAt": null,                                    // optional · YYYY-MM-DD. Defaults to today when SENT.
  "dueDate": "2026-12-01",                             // optional · YYYY-MM-DD. No due date, never overdue.
  "notes": "Balance due 14 days before departure."     // optional · max 5000
}"""

UPDATE_BODY = """{
  // Every field optional; null clears. The trip is fixed once raised.
  "status": "SENT",                                    // optional · DRAFT | SENT | CANCELLED
  "dueDate": "2026-12-01"                              // optional · YYYY-MM-DD
}"""

PAYMENT_BODY = """{
  "amount": 20000,                                     // required · 0.01-100000000, 2 decimals. Never past what is owed.
  "paidAt": "2026-11-20",                              // optional · YYYY-MM-DD, the day it arrived. Default today.
  "method": "WIRE_TRANSFER",                           // required · WIRE_TRANSFER | ACH | CHECK | ZELLE | CREDIT_CARD | OTHER
  "reference": "FW-88213",                             // optional · max 100. Wire confirmation, cheque number.
  "notes": "Deposit."                                  // optional · max 5000
}"""

PAYMENT_UPDATE_BODY = """{
  // Every field optional; null clears reference and notes.
  "amount": 25000                                      // optional · checked against the invoice without this payment
}"""

# A priced trip of this folder's own, per run — so the folder passes alone.
SETUP = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
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
    "            if (!x && trip.code === 201) { pm.collectionVariables.set('receivableTripId', trip.json().data.id); }",
    '        });',
    '    });',
    '});',
]

# The main invoice carries a payment, and an invoice with money against it
# cannot be archived — so the archive requests work on a draft of their own.
DRAFT_SETUP = [
    '// A payment-free draft for the archive requests: an invoice with a live',
    '// payment cannot be archived, which is the point of that rule.',
    "const base = pm.collectionVariables.get('baseUrl');",
    'pm.sendRequest({',
    "    url: base + '/receivables', method: 'POST',",
    "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
    "    body: { mode: 'raw', raw: JSON.stringify({ tripId: pm.collectionVariables.get('receivableTripId'), amount: 1500 }) },",
    '}, function (err, res) {',
    "    if (!err && res.code === 201) { pm.collectionVariables.set('draftInvoiceId', res.json().data.id); }",
    '});',
]

TEARDOWN = [
    '// Withdraw the payment, then archive what this folder created. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "const invoice = pm.collectionVariables.get('newInvoiceId');",
    "const payment = pm.collectionVariables.get('newPaymentId');",
    "const draft = pm.collectionVariables.get('draftInvoiceId');",
    "const trip = pm.collectionVariables.get('receivableTripId');",
    'function archiveTrip() {',
    "    if (trip) { pm.sendRequest({ url: base + '/trips/' + trip, method: 'DELETE', header: headers }, function () {}); }",
    '}',
    'function archiveInvoices() {',
    "    if (draft) { pm.sendRequest({ url: base + '/receivables/' + draft, method: 'DELETE', header: headers }, function () {}); }",
    "    if (!invoice) { return archiveTrip(); }",
    "    pm.sendRequest({ url: base + '/receivables/' + invoice, method: 'DELETE', header: headers }, function () { archiveTrip(); });",
    '}',
    'if (invoice && payment) {',
    "    pm.sendRequest({ url: base + '/receivables/' + invoice + '/payments/' + payment, method: 'DELETE', header: headers }, function () { archiveInvoices(); });",
    '} else {',
    '    archiveInvoices();',
    '}',
]


def user_id(session: Session, search: str) -> str:
    rows = session.request('GET', f'/users?search={search}&limit=1')[1]['data']
    if not rows:
        raise SystemExit(f'no seeded user matching {search!r}')
    return rows[0]['id']


def build(owner: Session, broker: Session, assistant: Session, anonymous: Session):
    cap = {}
    trips, invoices, payments = [], [], []
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    mark_id = user_id(owner, 'mark')

    def book(assigned=None):
        body = {
            'clientId': client_id, 'type': 'ONE_WAY', 'status': 'BOOKED',
            'legs': [{'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
                      'departureDate': '2026-12-18'}],
            'basePrice': 60000, 'operatorCost': 48000,
        }
        if assigned:
            body['assignedBrokerId'] = assigned
        trip = owner.request('POST', '/trips', body)[1]['data']
        trips.append(trip['id'])
        return trip

    try:
        trip = book()
        # Another broker's trip: the seeded broker cannot see it, so its
        # invoice is a 404 to them rather than a 403.
        marks_trip = book(mark_id)

        payload = {'tripId': trip['id'], 'amount': 60000, 'fetAmount': 4500, 'status': 'DRAFT',
                   'dueDate': '2026-12-01', 'notes': 'Balance due 14 days before departure.'}
        cap['create'] = owner.request('POST', '/receivables', payload)
        invoice = cap['create'][1]['data']
        invoices.append(invoice['id'])
        cap['create_400'] = owner.request('POST', '/receivables', {'tripId': trip['id']})
        cap['create_403'] = assistant.request('POST', '/receivables', payload)

        hidden = owner.request('POST', '/receivables', {'tripId': marks_trip['id'], 'amount': 9000})[1]['data']
        invoices.append(hidden['id'])

        cap['list'] = owner.request('GET', '/receivables?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/receivables?state=LATE')
        cap['list_401'] = anonymous.request('GET', '/receivables')
        cap['list_403'] = assistant.request('GET', '/receivables')
        cap['stats'] = owner.request('GET', '/receivables/stats')
        cap['stats_400'] = owner.request('GET', '/receivables/stats?page=1')
        cap['detail'] = owner.request('GET', f"/receivables/{invoice['id']}")
        cap['detail_404'] = broker.request('GET', f"/receivables/{hidden['id']}")

        cap['update'] = owner.request('PATCH', f"/receivables/{invoice['id']}", {'status': 'SENT', 'dueDate': '2026-12-01'})
        cap['update_400'] = owner.request('PATCH', f"/receivables/{invoice['id']}", {})

        pay = {'amount': 20000, 'paidAt': '2026-11-20', 'method': 'WIRE_TRANSFER', 'reference': 'FW-88213', 'notes': 'Deposit.'}
        cap['pay_draft_400'] = owner.request('POST', f"/receivables/{hidden['id']}/payments", pay)
        cap['pay'] = owner.request('POST', f"/receivables/{invoice['id']}/payments", pay)
        payment_id = cap['pay'][1]['data']['payments'][0]['id']
        payments.append((invoice['id'], payment_id))
        cap['pay_400'] = owner.request('POST', f"/receivables/{invoice['id']}/payments", {**pay, 'amount': 50000})
        cap['cancel_400'] = owner.request('PATCH', f"/receivables/{invoice['id']}", {'status': 'CANCELLED'})

        payment_path = f"/receivables/{invoice['id']}/payments/{payment_id}"
        cap['correct'] = owner.request('PATCH', payment_path, {'amount': 25000})
        cap['correct_400'] = owner.request('PATCH', payment_path, {'amount': 70000})
        cap['withdraw_403'] = broker.request('DELETE', payment_path)
        cap['withdraw'] = owner.request('DELETE', payment_path)
        cap['restore_payment'] = owner.request('POST', f'{payment_path}/restore')
        cap['restore_payment_404'] = owner.request('POST', f'{payment_path}/restore')

        cap['remove_400'] = owner.request('DELETE', f"/receivables/{invoice['id']}")
        draft = owner.request('POST', '/receivables', {'tripId': trip['id'], 'amount': 1500})[1]['data']
        invoices.append(draft['id'])
        cap['remove_403'] = broker.request('DELETE', f"/receivables/{draft['id']}")
        cap['remove'] = owner.request('DELETE', f"/receivables/{draft['id']}")
        cap['restore'] = owner.request('POST', f"/receivables/{draft['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/receivables/{draft['id']}/restore")
        cap['bulk'] = owner.request('POST', '/receivables/bulk-delete', {'ids': [draft['id'], invoice['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/receivables/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/receivables/bulk-restore', {'ids': [draft['id']]})
    finally:
        for invoice_id, pid in payments:
            owner.request('DELETE', f'/receivables/{invoice_id}/payments/{pid}')
        for row_id in invoices:
            owner.request('DELETE', f'/receivables/{row_id}')
        for row_id in trips:
            owner.request('DELETE', f'/trips/{row_id}')

    iid = invoice['id']
    did = draft['id']
    pid = payment_id
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True,
         'description': 'optional · invoice number ("INV-2026-0042", "42"), trip ("TJ-1048"), the billed client or the trip\'s client, notes.'},
        {'key': 'state', 'value': None, 'disabled': True,
         'description': f'optional · {STATES} (case-sensitive). Computed from payments and the due date, never stored.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One trip\'s invoices — its financial card.'},
        {'key': 'clientId', 'value': None, 'disabled': True, 'description': 'optional · uuid. Who is billed — the client\'s Payments tab.'},
        {'key': 'brokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The broker on the invoice\'s trip.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false.'},
        {'key': 'sortBy', 'value': None, 'disabled': True,
         'description': 'optional · createdAt | updatedAt | reference | dueDate | issuedAt | status. Default createdAt. Dates sort nulls last.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]
    stats_query = [
        {'key': 'clientId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One client — their total spent.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One trip.'},
    ]

    items = [
        {
            'name': '01 · Raise an invoice',
            'event': [
                script('prerequest', SETUP),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('newInvoiceId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables'),
                'description': (
                    'On a live trip the caller may see. The charge and its FET are stored as billed — a deposit '
                    'invoice bills part of a trip, and a later edit to the trip never rewrites what the client was '
                    'sent. `total`, `paid`, `balance` and `state` come back computed. `number` ("INV-2026-0042") is '
                    'the year of creation and a sequence, fixed for good. MANAGE_RECEIVABLES (a broker on their own '
                    f'and unassigned trips). Statuses: {STATUSES}.'),
            },
            'response': [
                example('201 · Raised as a draft', 'POST', '/receivables', *cap['create'], req_body=payload),
                example('400 · No amount', 'POST', '/receivables', *cap['create_400'], req_body={'tripId': trip['id']}),
                example('403 · An assistant cannot invoice', 'POST', '/receivables', *cap['create_403']),
            ],
        },
        {
            'name': '02 · List invoices',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/receivables', list_query),
                'description': (
                    'ALL for administrators and senior brokers; a broker sees the invoices on the trips they may see. '
                    f'`state` is {STATES}: DUE is sent with nothing in and not late; OVERDUE is sent, owing and past '
                    'its due date; a draft is never late and a fully paid invoice is PAID however late it came.'),
            },
            'response': [
                example('200 · A page of invoices', 'GET', '/receivables?page=1&limit=10', *cap['list']),
                example('400 · Unknown state', 'GET', '/receivables?state=LATE', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/receivables', *cap['list_401']),
                example('403 · An assistant cannot read receivables', 'GET', '/receivables', *cap['list_403']),
            ],
        },
        {
            'name': '03 · Totals',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/receivables/stats', stats_query),
                'description': (
                    'Invoiced (sent invoices), collected (every live payment), outstanding and overdue, summed in '
                    'cents over the caller\'s scope, plus a count per state. Drafts are not invoiced; cancelled '
                    'invoices are owed by nobody. Takes no paging, search or sort — any other parameter is a 400.'),
            },
            'response': [
                example('200 · Totals', 'GET', '/receivables/stats', *cap['stats']),
                example('400 · A parameter it does not take', 'GET', '/receivables/stats?page=1', *cap['stats_400']),
            ],
        },
        {
            'name': '04 · Get one invoice',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/receivables/{{newInvoiceId}}'),
                'description': (
                    'With its live `payments` and its `withdrawnPayments` (who withdrew each, and when). Archived '
                    'invoices load too. Outside the caller\'s scope — another broker\'s trip — 404, never 403.'),
            },
            'response': [
                example('200 · The invoice', 'GET', f'/receivables/{iid}', *cap['detail']),
                example('404 · Another broker\'s trip (as a broker)', 'GET', f"/receivables/{hidden['id']}", *cap['detail_404']),
            ],
        },
        {
            'name': '05 · Send an invoice',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables/{{newInvoiceId}}'),
                'description': (
                    'Moving to SENT with no `issuedAt` dates it today; moving to DRAFT clears it. The total may '
                    'change but never below what has been paid, and an invoice with live payments cannot go back to '
                    'DRAFT or be CANCELLED — withdraw the payments first, so the ledger says where the money went.'),
            },
            'response': [
                example('200 · Sent', 'PATCH', f'/receivables/{iid}', *cap['update'], req_body={'status': 'SENT', 'dueDate': '2026-12-01'}),
                example('400 · Empty body', 'PATCH', f'/receivables/{iid}', *cap['update_400'], req_body={}),
                example('400 · Cancelling an invoice with payments', 'PATCH', f'/receivables/{iid}', *cap['cancel_400'],
                        req_body={'status': 'CANCELLED'}),
            ],
        },
        {
            'name': '06 · Record a payment',
            'event': [script('test', [
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.collectionVariables.set('newPaymentId', pm.response.json().data.payments[0].id);",
            ])],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PAYMENT_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables/{{newInvoiceId}}/payments'),
                'description': (
                    'Only on a SENT invoice, and never past what is still owed — an overpayment belongs on the '
                    f'client\'s credit, not on the invoice. Returns the invoice with its new figures. Methods: {METHODS}.'),
            },
            'response': [
                example('201 · Recorded', 'POST', f'/receivables/{iid}/payments', *cap['pay'], req_body=pay),
                example('400 · More than is owed', 'POST', f'/receivables/{iid}/payments', *cap['pay_400'],
                        req_body={**pay, 'amount': 50000}),
                example('400 · A draft takes no payments', 'POST', f"/receivables/{hidden['id']}/payments",
                        *cap['pay_draft_400'], req_body=pay),
            ],
        },
        {
            'name': '07 · Correct a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PAYMENT_UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables/{{newInvoiceId}}/payments/{{newPaymentId}}'),
                'description': 'A new amount is checked against the invoice *without* this payment in it. Returns the invoice.',
            },
            'response': [
                example('200 · Corrected', 'PATCH', f'/receivables/{iid}/payments/{pid}', *cap['correct'], req_body={'amount': 25000}),
                example('400 · More than is owed', 'PATCH', f'/receivables/{iid}/payments/{pid}', *cap['correct_400'],
                        req_body={'amount': 70000}),
            ],
        },
        {
            'name': '08 · Withdraw a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS,
                'url': url('/receivables/{{newInvoiceId}}/payments/{{newPaymentId}}'),
                'description': (
                    'Administrators and senior brokers only — it takes money off the books. The payment stays on '
                    'the record under `withdrawnPayments`. Returns the invoice.'),
            },
            'response': [
                example('200 · Withdrawn', 'DELETE', f'/receivables/{iid}/payments/{pid}', *cap['withdraw']),
                example('403 · A broker cannot withdraw', 'DELETE', f'/receivables/{iid}/payments/{pid}', *cap['withdraw_403']),
            ],
        },
        {
            'name': '09 · Restore a payment',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'url': url('/receivables/{{newInvoiceId}}/payments/{{newPaymentId}}/restore'),
                'description': (
                    'Re-checked against the invoice as it is now — refused if it would overpay it, or if the invoice '
                    'is no longer SENT. 200, not 201.'),
            },
            'response': [
                example('200 · Restored', 'POST', f'/receivables/{iid}/payments/{pid}/restore', *cap['restore_payment']),
                example('404 · Not withdrawn', 'POST', f'/receivables/{iid}/payments/{pid}/restore', *cap['restore_payment_404']),
            ],
        },
        {
            'name': '10 · Archive an invoice',
            'event': [script('prerequest', DRAFT_SETUP), status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/receivables/{{draftInvoiceId}}'),
                'description': (
                    'Administrators and senior brokers only, and only with no live payments — the money would vanish '
                    'from every total with it. Runs on a payment-free draft its pre-request raises. Nothing is deleted.'),
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/receivables/{did}', *cap['remove']),
                example('400 · It has payments', 'DELETE', f'/receivables/{iid}', *cap['remove_400']),
                example('403 · A broker cannot archive', 'DELETE', f'/receivables/{did}', *cap['remove_403']),
            ],
        },
        {
            'name': '11 · Restore an invoice',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/receivables/{{draftInvoiceId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/receivables/{did}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/receivables/{did}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '12 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{draftInvoiceId}}"]  // required · 1-100 uuids. Invoices with payments, and unknown ids, come back in skipped.\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables/bulk-delete'),
                'description': 'Partial success is success: an invoice carrying payments is skipped, not refused.',
            },
            'response': [
                example('200 · Archived, one skipped for its payment', 'POST', '/receivables/bulk-delete', *cap['bulk'],
                        req_body={'ids': [did, iid, MISSING]}),
                example('400 · Nothing selected', 'POST', '/receivables/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '13 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{draftInvoiceId}}"]\n}', 'options': {'raw': {'language': 'json'}}},
                'url': url('/receivables/bulk-restore'),
                'description': 'The Archived tab\'s bulk action.',
            },
            'response': [example('200 · Restored', 'POST', '/receivables/bulk-restore', *cap['bulk_restore'], req_body={'ids': [did]})],
        },
        {
            'name': '14 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/receivables/stats'),
                'description': (
                    'Withdraws the payment, then archives both invoices and the trip this folder created. A GET so '
                    'the request itself changes nothing.'),
            },
            'response': [],
        },
    ]

    return {
        'name': '19 · Receivables',
        'description': (
            'What clients owe for their trips, and what has come in (#16, scope §6.14 and §9.3).\n\nAn invoice '
            'stores what the client was billed; payments are a ledger under it. Paid, balance and state are '
            'computed on every read — nothing is stored beside the rows it would sum. VIEW_RECEIVABLES reads and '
            'MANAGE_RECEIVABLES writes, at the trip\'s scope; archiving and withdrawing are administrators\' and '
            'senior brokers\'. Runs alone: it books its own priced trip and archives everything it made.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@example.com')
    broker = Session('broker@example.com')
    assistant = Session('assistant@example.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {
        'receivableTripId': '', 'newInvoiceId': '', 'newPaymentId': '', 'draftInvoiceId': '',
    })

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
