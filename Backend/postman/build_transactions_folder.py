#!/usr/bin/env python3
"""
Builds `21 · Transactions` (#19), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_transactions_folder.py
    cd postman && python3 rewrite_body_comments.py

The ledger is read-only, so the folder makes its own money move first: it
books a trip, sends and pays a client invoice, records and pays an operator
bill and pays a commission — then lists them, and withdraws and archives all
of it at the end, in the builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    Session, copy_folder_login, ensure_variables, example, script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
KINDS = 'CLIENT_PAYMENT | OPERATOR_PAYMENT | COMMISSION'

# One movement of each kind, made by chained requests so the folder runs alone.
SETUP = [
    '// Make one movement of each kind for this folder to list.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    'function post(path, body, done) {',
    "    pm.sendRequest({ url: base + path, method: 'POST', header: headers, body: { mode: 'raw', raw: JSON.stringify(body) } },",
    '        function (err, res) { done(!err && (res.code === 201 || res.code === 200) ? res.json().data : null); });',
    '}',
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (e1, clients) {",
    "    pm.sendRequest({ url: base + '/operators?limit=1', method: 'GET' }, function (e2, operators) {",
    "        pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (e3, airports) {",
    '            if (e1 || e2 || e3) { return; }',
    '            const a = airports.json().data;',
    "            post('/trips', {",
    "                clientId: clients.json().data[0].id, operatorId: operators.json().data[0].id, type: 'ONE_WAY', status: 'BOOKED',",
    "                legs: [{ originAirportId: a[0].id, destinationAirportId: a[1].id, departureDate: '2026-12-18' }],",
    '                basePrice: 60000, operatorCost: 48000,',
    '            }, function (trip) {',
    '                if (!trip) { return; }',
    "                pm.collectionVariables.set('ledgerTripId', trip.id);",
    "                post('/receivables', { tripId: trip.id, amount: 60000, fetAmount: 4500, status: 'SENT' }, function (invoice) {",
    '                    if (!invoice) { return; }',
    "                    pm.collectionVariables.set('ledgerInvoiceId', invoice.id);",
    "                    post('/receivables/' + invoice.id + '/payments', { amount: 20000, method: 'WIRE_TRANSFER', paidAt: '2026-11-20' }, function (paid) {",
    "                        if (paid) { pm.collectionVariables.set('ledgerInvoicePaymentId', paid.payments[0].id); }",
    '                    });',
    '                });',
    "                post('/operator-payments', { tripId: trip.id, amount: 48000 }, function (bill) {",
    '                    if (!bill) { return; }',
    "                    pm.collectionVariables.set('ledgerPayableId', bill.id);",
    "                    post('/operator-payments/' + bill.id + '/payments', { amount: 15000, method: 'ACH', paidAt: '2026-11-21' }, function (paid) {",
    "                        if (paid) { pm.collectionVariables.set('ledgerPayablePaymentId', paid.payments[0].id); }",
    '                    });',
    '                });',
    "                post('/commissions', { tripId: trip.id, recipientType: 'MANUAL', recipientName: 'Harbour Travel', basis: 'FLAT_FEE', amount: 750, status: 'PAID', method: 'CHECK', paidAt: '2026-11-22' }, function (commission) {",
    "                    if (commission) { pm.collectionVariables.set('ledgerCommissionId', commission.id); }",
    '                });',
    '            });',
    '        });',
    '    });',
    '});',
]

TEARDOWN = [
    '// Withdraw the payments, then archive what this folder created. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "const v = (k) => pm.collectionVariables.get(k);",
    "function del(path, done) { pm.sendRequest({ url: base + path, method: 'DELETE', header: headers }, function () { if (done) { done(); } }); }",
    "del('/receivables/' + v('ledgerInvoiceId') + '/payments/' + v('ledgerInvoicePaymentId'), function () {",
    "    del('/receivables/' + v('ledgerInvoiceId'), function () {",
    "        del('/operator-payments/' + v('ledgerPayableId') + '/payments/' + v('ledgerPayablePaymentId'), function () {",
    "            del('/operator-payments/' + v('ledgerPayableId'), function () {",
    "                del('/commissions/' + v('ledgerCommissionId'), function () { del('/trips/' + v('ledgerTripId')); });",
    '            });',
    '        });',
    '    });',
    '});',
]


def build(owner: Session, broker: Session, assistant: Session, anonymous: Session):
    cap = {}
    made = {}
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    operator_id = owner.request('GET', '/operators?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']

    try:
        trip = owner.request('POST', '/trips', {
            'clientId': client_id, 'operatorId': operator_id, 'type': 'ONE_WAY', 'status': 'BOOKED',
            'legs': [{'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
                      'departureDate': '2026-12-18'}],
            'basePrice': 60000, 'operatorCost': 48000,
        })[1]['data']
        made['trip'] = trip['id']
        invoice = owner.request('POST', '/receivables', {'tripId': trip['id'], 'amount': 60000, 'fetAmount': 4500,
                                                         'status': 'SENT'})[1]['data']
        made['invoice'] = invoice['id']
        paid = owner.request('POST', f"/receivables/{invoice['id']}/payments",
                             {'amount': 20000, 'method': 'WIRE_TRANSFER', 'paidAt': '2026-11-20'})[1]['data']
        made['invoice_payment'] = paid['payments'][0]['id']
        bill = owner.request('POST', '/operator-payments', {'tripId': trip['id'], 'amount': 48000})[1]['data']
        made['bill'] = bill['id']
        sent = owner.request('POST', f"/operator-payments/{bill['id']}/payments",
                             {'amount': 15000, 'method': 'ACH', 'paidAt': '2026-11-21'})[1]['data']
        made['bill_payment'] = sent['payments'][0]['id']
        commission = owner.request('POST', '/commissions', {
            'tripId': trip['id'], 'recipientType': 'MANUAL', 'recipientName': 'Harbour Travel', 'basis': 'FLAT_FEE',
            'amount': 750, 'status': 'PAID', 'method': 'CHECK', 'paidAt': '2026-11-22',
        })[1]['data']
        made['commission'] = commission['id']

        cap['list'] = owner.request('GET', f"/transactions?tripId={trip['id']}")
        cap['list_out'] = owner.request('GET', f"/transactions?tripId={trip['id']}&direction=OUT")
        cap['list_400'] = owner.request('GET', '/transactions?kind=REFUND')
        cap['list_400_param'] = owner.request('GET', '/transactions?archived=true')
        cap['list_401'] = anonymous.request('GET', '/transactions')
        cap['list_403'] = assistant.request('GET', '/transactions')
        cap['list_broker'] = broker.request('GET', f"/transactions?tripId={trip['id']}")
        cap['stats'] = owner.request('GET', f"/transactions/stats?tripId={trip['id']}")
        cap['stats_400'] = owner.request('GET', '/transactions/stats?from=2026-12-01&to=2026-11-01')
    finally:
        if 'invoice_payment' in made:
            owner.request('DELETE', f"/receivables/{made['invoice']}/payments/{made['invoice_payment']}")
        if 'invoice' in made:
            owner.request('DELETE', f"/receivables/{made['invoice']}")
        if 'bill_payment' in made:
            owner.request('DELETE', f"/operator-payments/{made['bill']}/payments/{made['bill_payment']}")
        if 'bill' in made:
            owner.request('DELETE', f"/operator-payments/{made['bill']}")
        if 'commission' in made:
            owner.request('DELETE', f"/commissions/{made['commission']}")
        if 'trip' in made:
            owner.request('DELETE', f"/trips/{made['trip']}")

    tid = made['trip']
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True,
         'description': 'optional · a bill number ("INV-2026-0042", "OP-2026-0045", "COM-1001"), a trip ("TJ-1048"), the client, operator or payee, or the payment\'s own reference.'},
        {'key': 'kind', 'value': None, 'disabled': True, 'description': f'optional · {KINDS} (case-sensitive).'},
        {'key': 'direction', 'value': None, 'disabled': True, 'description': 'optional · IN | OUT.'},
        {'key': 'from', 'value': None, 'disabled': True, 'description': 'optional · YYYY-MM-DD, inclusive, by the day the money moved.'},
        {'key': 'to', 'value': None, 'disabled': True, 'description': 'optional · YYYY-MM-DD, inclusive. On or after `from`.'},
        {'key': 'tripId', 'value': '{{ledgerTripId}}', 'description': 'optional · uuid. One trip\'s money.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · date. The only order.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc — newest money first.'},
    ]

    items = [
        {
            'name': '01 · The ledger',
            'event': [script('prerequest', SETUP), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/transactions', list_query),
                'description': (
                    'Every payment received on a client invoice (CLIENT_PAYMENT, IN), every payment sent against an '
                    'operator\'s bill (OPERATOR_PAYMENT, OUT) and every commission paid (COMMISSION, OUT), by the day the '
                    'money moved. `document` is the bill it settles, where it is corrected or withdrawn — the ledger has '
                    'no writes. A view: each kind is read from its own module under its own scope, and a kind the '
                    'caller has no permission for is never read. VIEW_FINANCIALS opens it. Its pre-request makes one '
                    'movement of each kind on a trip of its own.'),
            },
            'response': [
                example('200 · One movement of each kind', 'GET', f'/transactions?tripId={tid}', *cap['list']),
                example('400 · Unknown kind', 'GET', '/transactions?kind=REFUND', *cap['list_400']),
                example('400 · A parameter it does not take', 'GET', '/transactions?archived=true', *cap['list_400_param']),
                example('401 · Not signed in', 'GET', '/transactions', *cap['list_401']),
                example('403 · An assistant cannot read the ledger', 'GET', '/transactions', *cap['list_403']),
            ],
        },
        {
            'name': '02 · Money out only',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/transactions', [
                    {'key': 'direction', 'value': 'OUT', 'description': 'IN | OUT.'},
                    {'key': 'tripId', 'value': '{{ledgerTripId}}', 'description': 'optional · uuid.'},
                ]),
                'description': 'Operator payments and paid commissions — the two kinds of money leaving the company.',
            },
            'response': [example('200 · Operator payment and commission', 'GET', f'/transactions?tripId={tid}&direction=OUT', *cap['list_out'])],
        },
        {
            'name': '03 · As a broker',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/transactions', [{'key': 'tripId', 'value': '{{ledgerTripId}}', 'description': 'optional · uuid.'}]),
                'description': (
                    'Each kind at its own module\'s scope. The folder\'s trip is unassigned, so a broker sees its client '
                    'and operator payments; the commission is booked against no broker, so a broker — who sees '
                    'commissions booked against them — does not. Captured as the seeded broker; in the collection it '
                    'runs as the folder\'s own account.'),
            },
            'response': [example('200 · Scoped per kind (as a broker)', 'GET', f'/transactions?tripId={tid}', *cap['list_broker'])],
        },
        {
            'name': '04 · Totals',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/transactions/stats', [
                    {'key': 'tripId', 'value': '{{ledgerTripId}}', 'description': 'optional · uuid.'},
                    {'key': 'kind', 'value': None, 'disabled': True, 'description': f'optional · {KINDS}.'},
                    {'key': 'direction', 'value': None, 'disabled': True, 'description': 'optional · IN | OUT.'},
                    {'key': 'from', 'value': None, 'disabled': True, 'description': 'optional · YYYY-MM-DD.'},
                    {'key': 'to', 'value': None, 'disabled': True, 'description': 'optional · YYYY-MM-DD.'},
                    {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · as on the list.'},
                ]),
                'description': (
                    'Money in, money out and the net, summed in cents over the same filters as the list, with a count '
                    'and total per kind. A side the caller may not see is null, and so is the net; a paid commission '
                    'whose value cannot be known is in `unvalued`, never in a sum.'),
            },
            'response': [
                example('200 · In, out and net', 'GET', f'/transactions/stats?tripId={tid}', *cap['stats']),
                example('400 · A range that ends before it starts', 'GET', '/transactions/stats?from=2026-12-01&to=2026-11-01',
                        *cap['stats_400']),
            ],
        },
        {
            'name': '05 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows withdrawn and archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/transactions/stats'),
                'description': 'Withdraws both payments and archives the invoice, the bill, the commission and the trip. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '21 · Transactions',
        'description': (
            'The money ledger (#19): money in from clients, money out to operators and in commissions, by the day it '
            'moved. Read-only and stored nowhere — a view over Receivables, Operator Payments and Commissions, each '
            'read under its own scope. Runs alone: it makes one movement of each kind and archives it all afterwards.'),
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
        'ledgerTripId': '', 'ledgerInvoiceId': '', 'ledgerInvoicePaymentId': '', 'ledgerPayableId': '',
        'ledgerPayablePaymentId': '', 'ledgerCommissionId': '',
    })

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
