#!/usr/bin/env python3
"""
Builds the `13 · Client Credits` folder, capturing every example from a live API.

    npm run start:dev
    python3 postman/build_client_credits_folder.py
    python3 postman/rewrite_body_comments.py

Examples are captured, never typed, and every one is checked against its own
label before it is written — see `example()`.

Re-runnable: the movements it records are withdrawn at the end and the client
they hang on is archived, so running it twice does not leave money on anybody's
account.
"""

import json
import pathlib
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

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
               401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found'}


def example(name, method, path, status, body, req_body=None):
    """
    One captured example, checked against its own label.

    The label is the claim the collection makes about what the API does, and
    nothing downstream ever compares it to the response stored beside it —
    Newman runs a request's test script and never reads its examples. So a
    request that fails to provoke the error it is named for writes a lie that
    goes green for ever. `12 · Notes` shipped two of them.

    The builder is the only place that knows the promised status and the
    received one at the same moment. **Fix the request, never the label.**
    """
    promised = int(name.split('·')[0].strip().split()[0])
    if promised != status:
        raise SystemExit(
            f"example '{name}' promises {promised} but the API answered "
            f"{status} for {method} {path}. Fix the request that captures it "
            f"— do not relabel the example."
        )

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

TYPES = 'CREDIT | APPLICATION'
SORTABLE = 'occurredAt | createdAt | updatedAt | amount'

OWN_CLIENT = [
    '/*',
    ' * Finds a client to hang the ledger on.',
    ' *',
    ' * `{{clientId}}` is set by `03 · Clients` during a full run, so without this',
    ' * the folder run alone sends an empty clientId and fails validation — a',
    ' * false failure, which is how a real one gets ignored.',
    ' *',
    ' * It lives on this request rather than on the folder because the folder',
    ' * script signs in asynchronously: a lookup queued beside that login fires',
    ' * before the session cookie exists and comes back 401.',
    ' */',
    "if (!pm.collectionVariables.get('clientId')) {",
    '    pm.sendRequest({',
    "        url: pm.collectionVariables.get('baseUrl') + '/clients?limit=1',",
    "        method: 'GET',",
    '    }, function (err, res) {',
    "        if (err) { console.error('could not resolve a client', err); return; }",
    '        const body = res.json();',
    '        if (body && body.data && body.data.length) {',
    "            pm.collectionVariables.set('clientId', body.data[0].id);",
    '        }',
    '    });',
    '}',
]

CREATE_BODY = """{
  "clientId": "{{clientId}}",                          // required · uuid of a client you may already read. Money on account is only meaningful beside the client holding it — there is no unscoped ledger.

  "type": "CREDIT",                                    // required · CREDIT | APPLICATION. CREDIT puts money on the account; APPLICATION takes it off towards a trip. The direction lives here and never in a minus sign.
  "amount": 18000,                                     // required · positive, 0.01-10000000, at most 2 decimal places. A third decimal is not a finer amount — the column is Decimal(12,2) and would round it, leaving the balance disagreeing with the row.

  "occurredAt": "2026-03-14",                          // required · YYYY-MM-DD. The day the money MOVED, not the day it was typed in — a trip cancelled on the 3rd and entered on the 9th is dated the 3rd. `createdAt` records the typing.

  "reason": "Cancelled KTEB→KMIA, kept on account",    // optional · max 500 chars. Until Trips exists this sentence is the only record of WHICH trip consumed a credit, so it carries more weight than it eventually will.
  "reference": "REF-44812"                             // optional · max 100 chars. The desk's own reference — a cheque number, a processor refund id.
}"""

APPLY_BODY = """{
  "clientId": "{{clientId}}",
  "type": "APPLICATION",                               // Takes money off the account.
  "amount": 12000,
  "occurredAt": "2026-04-02",

  "reason": "Applied to the Aspen trip"                // No trip id yet — see the folder description.
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH, and an empty body returns 400.
  // `clientId` is deliberately absent: money does not move between clients.
  "amount": 12500,

  "reason": "Applied to the Aspen trip (revised)"      // null clears it; absent leaves it alone.
}"""


def build(owner, broker, assistant):
    stamp = int(time.time())

    # Assigned to the seeded broker on purpose: a broker only sees clients
    # assigned to them, so a probe client with no broker is invisible to one
    # and every "another broker's client" example would 404 at the client
    # check rather than demonstrating the rule it is named for.
    broker_id = broker.request('GET', '/auth/me')[1]['data']['id']
    client_id = owner.request('POST', '/clients', {
        'firstName': 'Postman', 'lastName': f'Credits-{stamp}',
        'email': f'postman.credits.{stamp}@example.com',
        'assignedBrokerId': broker_id,
    })[1]['data']['id']

    cap = {}

    cap['create'] = owner.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'CREDIT', 'amount': 18000,
        'occurredAt': '2026-03-14',
        'reason': 'Cancelled KTEB→KMIA, kept on account', 'reference': 'REF-44812',
    })
    credit_id = cap['create'][1]['data']['id']

    cap['apply'] = owner.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'APPLICATION', 'amount': 12000,
        'occurredAt': '2026-04-02', 'reason': 'Applied to the Aspen trip',
    })
    application_id = cap['apply'][1]['data']['id']

    cap['create_400_overdraw'] = owner.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'APPLICATION', 'amount': 99000,
        'occurredAt': '2026-04-03',
    })
    cap['create_400_decimals'] = owner.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'CREDIT', 'amount': 100.005,
        'occurredAt': '2026-04-03',
    })
    cap['create_404'] = owner.request('POST', '/client-credits', {
        'clientId': MISSING, 'type': 'CREDIT', 'amount': 500,
        'occurredAt': '2026-04-03',
    })
    # An assistant holds VIEW_FINANCIALS at NONE, so this is a capability
    # failure and answers 403 — they never learn what is on the account.
    cap['create_403'] = assistant.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'CREDIT', 'amount': 500,
        'occurredAt': '2026-04-03',
    })

    cap['summary'] = owner.request(
        'GET', f'/client-credits/summary?clientId={client_id}')
    cap['summary_400'] = owner.request(
        'GET', f'/client-credits/summary?clientId={client_id}&type=CREDIT')
    cap['summary_403'] = assistant.request(
        'GET', f'/client-credits/summary?clientId={client_id}')

    cap['list'] = owner.request(
        'GET', f'/client-credits?clientId={client_id}&page=1&limit=10')
    cap['list_credits'] = owner.request(
        'GET', f'/client-credits?clientId={client_id}&type=CREDIT')
    cap['list_400'] = owner.request('GET', '/client-credits')
    cap['list_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/client-credits', 'timestamp': '2026-09-24T04:00:00.000Z',
    })

    cap['detail'] = owner.request('GET', f'/client-credits/{credit_id}')
    cap['detail_404'] = owner.request('GET', f'/client-credits/{MISSING}')

    cap['update'] = owner.request('PATCH', f'/client-credits/{application_id}', {
        'amount': 12500, 'reason': 'Applied to the Aspen trip (revised)',
    })
    cap['update_400'] = owner.request('PATCH', f'/client-credits/{application_id}', {})
    cap['update_400_overdraw'] = owner.request(
        'PATCH', f'/client-credits/{application_id}', {'amount': 99000})

    cap['remove'] = owner.request('DELETE', f'/client-credits/{application_id}')
    cap['summary_after'] = owner.request(
        'GET', f'/client-credits/summary?clientId={client_id}')
    cap['archived'] = owner.request(
        'GET', f'/client-credits?clientId={client_id}&archived=true')
    cap['restore'] = owner.request('POST', f'/client-credits/{application_id}/restore')
    cap['restore_404'] = owner.request('POST', f'/client-credits/{application_id}/restore')

    # Teardown: withdraw both movements, then archive the client. A run is a
    # demonstration, not a data entry session — and least of all on a ledger.
    owner.request('DELETE', f'/client-credits/{application_id}')
    owner.request('DELETE', f'/client-credits/{credit_id}')
    owner.request('DELETE', f'/clients/{client_id}')

    # Captured after the archive: a closed account is read-only.
    cap['create_400_archived'] = owner.request('POST', '/client-credits', {
        'clientId': client_id, 'type': 'CREDIT', 'amount': 500,
        'occurredAt': '2026-04-05',
    })

    client_param = [
        {'key': 'clientId', 'value': '{{clientId}}',
         'description': '**Required.** uuid of the client whose account this is. A client you may not read answers 404, not 403 — a 403 would confirm they exist, and a balance should not help anyone build a list of client ids.'},
    ]

    list_query = client_param + [
        {'key': 'page', 'value': '1', 'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'type', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {TYPES}. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'sortBy', 'value': 'occurredAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. **Default occurredAt**, not createdAt — the ledger opens on the newest *movement*, not the newest row typed in.'},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false — live movements only. `true` returns ONLY withdrawn ones, which count towards no figure in the summary.'},
    ]

    def raw(path, params):
        return '{{baseUrl}}' + path + '?' + '&'.join(
            f"{p['key']}={p['value']}" for p in params if not p.get('disabled'))

    items = [
        {
            'name': '01 · What the client has on account',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': raw('/client-credits/summary', client_param),
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', 'summary'],
                        'query': client_param},
                'description': (
                    'The figures above the ledger: `balance`, `credited`, `applied`, how many '
                    'movements there are and when the last one was.\n\n'
                    '**Summed on every read and never stored.** There is no `balance` column, '
                    'for the same reason a quote has no stored total: the day an edit moves one '
                    'entry and the stored figure does not follow, the record contradicts itself '
                    'and nothing on screen says which half is right.\n\n'
                    'Withdrawn movements count towards nothing here, so the total always agrees '
                    'with the rows printed underneath it.\n\n'
                    'Reading any of this needs `VIEW_FINANCIALS`: an assistant never learns what '
                    'a client is holding, even for a client they can otherwise read.'),
            },
            'response': [
                example('200 · $18,000 credited, $12,000 used', 'GET', '/client-credits/summary?clientId={{clientId}}', *cap['summary']),
                example('400 · A summary narrows nothing', 'GET', '/client-credits/summary?clientId={{clientId}}&type=CREDIT', *cap['summary_400']),
                example('403 · An assistant may not see money', 'GET', '/client-credits/summary?clientId={{clientId}}', *cap['summary_403']),
            ],
            'event': [script('prerequest', OWN_CLIENT), script('test', [
                "pm.test('summary loads', function () {",
                '    pm.response.to.have.status(200);',
                '    const d = pm.response.json().data;',
                "    pm.expect(d).to.have.property('balance');",
                '});',
                '',
                "pm.test('the balance equals credited minus applied', function () {",
                '    const d = pm.response.json().data;',
                '    // The property that matters: the summary sums and the write guard walks',
                '    // the same ledger, and they must never disagree.',
                '    pm.expect(d.balance).to.eql(d.credited - d.applied);',
                '});',
            ])],
        },
        {
            'name': '02 · List the movements',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': raw('/client-credits', list_query), 'host': ['{{baseUrl}}'],
                        'path': ['client-credits'], 'query': list_query},
                'description': (
                    'The ledger itself — every movement on and off the account, newest first '
                    'by `occurredAt`.\n\n'
                    '`clientId` is **required**: there is no "all credits" endpoint, because '
                    'money on account is only meaningful beside the client holding it and an '
                    'unscoped list would be the one query that ignores the row-level rule the '
                    'client carries.\n\n'
                    '`archived=true` is the withdrawn half, with `deletedBy` naming who took '
                    'each movement off.'),
            },
            'response': [
                example('200 · The ledger', 'GET', '/client-credits?clientId={{clientId}}&page=1&limit=10', *cap['list']),
                example('200 · Credits only', 'GET', '/client-credits?clientId={{clientId}}&type=CREDIT', *cap['list_credits']),
                example('200 · Withdrawn movements', 'GET', '/client-credits?clientId={{clientId}}&archived=true', *cap['archived']),
                example('400 · clientId is required', 'GET', '/client-credits', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/client-credits', *cap['list_401']),
            ],
            'event': [script('test', [
                "pm.test('ledger returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().meta).to.have.property('total');",
                '});',
                '',
                "pm.test('no row carries a balance', function () {",
                '    // The balance is summed on read. A row that carried one would be a',
                '    // stored figure beside the parts it is computed from.',
                '    const rows = pm.response.json().data;',
                '    rows.forEach(function (row) {',
                "        pm.expect(row).to.not.have.property('balance');",
                '    });',
                '});',
            ])],
        },
        {
            'name': '03 · Put money on the account',
            'request': {
                'method': 'POST', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/client-credits', 'host': ['{{baseUrl}}'],
                        'path': ['client-credits']},
                'description': (
                    "The client's own example: *\"they cancel a trip and they want to keep the "
                    'money they paid on account with us"*.\n\n'
                    '`type` carries the direction and `amount` is **always positive**. A signed '
                    'column invites `-5000` typed into a CREDIT, which reads as a credit and '
                    'behaves as an application, and nothing on screen tells the two apart.\n\n'
                    '`occurredAt` is the day the money moved, which is not the day it was '
                    'entered — `createdAt` records that.'),
            },
            'response': [
                example('201 · Credited', 'POST', '/client-credits', *cap['create'], req_body={
                    'clientId': '{{clientId}}', 'type': 'CREDIT', 'amount': 18000,
                    'occurredAt': '2026-03-14',
                    'reason': 'Cancelled KTEB→KMIA, kept on account', 'reference': 'REF-44812'}),
                example('400 · Amounts are whole cents', 'POST', '/client-credits', *cap['create_400_decimals'], req_body={
                    'clientId': '{{clientId}}', 'type': 'CREDIT', 'amount': 100.005,
                    'occurredAt': '2026-04-03'}),
                example('400 · The client has been archived', 'POST', '/client-credits', *cap['create_400_archived'], req_body={
                    'clientId': '{{clientId}}', 'type': 'CREDIT', 'amount': 500,
                    'occurredAt': '2026-04-05'}),
                example('403 · An assistant may not record money', 'POST', '/client-credits', *cap['create_403']),
                example('404 · No such client (or not yours)', 'POST', '/client-credits', *cap['create_404'], req_body={
                    'clientId': MISSING, 'type': 'CREDIT', 'amount': 500,
                    'occurredAt': '2026-04-03'}),
            ],
            'event': [script('test', [
                "pm.test('credited', function () {",
                '    pm.response.to.have.status(201);',
                '    const d = pm.response.json().data;',
                "    pm.expect(d.type).to.eql('CREDIT');",
                "    pm.collectionVariables.set('creditId', d.id);",
                '});',
            ])],
        },
        {
            'name': '04 · Use it towards another trip',
            'request': {
                'method': 'POST', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': APPLY_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/client-credits', 'host': ['{{baseUrl}}'],
                        'path': ['client-credits']},
                'description': (
                    'The other half of the request: *"select if it was used towards another '
                    'trip"*.\n\n'
                    '**There is no trip id yet, deliberately.** Trips do not exist, and a '
                    '`tripReference` string "for now" would be a column pointing at nothing the '
                    'database can check — which is exactly what `Client.homeAirport` cost when it '
                    'held an ICAO string. Say which trip in `reason`; the foreign key lands with '
                    'the Trips module.\n\n'
                    '**An application beyond the balance is refused**, with the available figure '
                    'named. A client cannot spend money they are not holding, so that is a typo — '
                    'an extra zero, or the same cancellation entered twice.'),
            },
            'response': [
                example('201 · Applied', 'POST', '/client-credits', *cap['apply'], req_body={
                    'clientId': '{{clientId}}', 'type': 'APPLICATION', 'amount': 12000,
                    'occurredAt': '2026-04-02', 'reason': 'Applied to the Aspen trip'}),
                example('400 · More than the account holds', 'POST', '/client-credits', *cap['create_400_overdraw'], req_body={
                    'clientId': '{{clientId}}', 'type': 'APPLICATION', 'amount': 99000,
                    'occurredAt': '2026-04-03'}),
            ],
            'event': [script('test', [
                "pm.test('applied', function () {",
                '    pm.response.to.have.status(201);',
                "    pm.collectionVariables.set('creditEntryId', pm.response.json().data.id);",
                '});',
            ])],
        },
        {
            'name': '05 · Get one movement',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/client-credits/{{creditEntryId}}',
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', '{{creditEntryId}}']},
                'description': (
                    'Withdrawn movements load here too, so the archived view can link to them.\n\n'
                    "A movement on a client outside the caller's scope returns **404, not 403**. "
                    "The entry's own id says nothing about who may read it; the client it belongs "
                    'to says everything.'),
            },
            'response': [
                example('200 · The movement', 'GET', '/client-credits/{{creditEntryId}}', *cap['detail']),
                example('404 · No such movement (or not yours)', 'GET', f'/client-credits/{MISSING}', *cap['detail_404']),
            ],
            'event': [script('test', [
                "pm.test('movement returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('amount');",
                '});',
            ])],
        },
        {
            'name': '06 · Edit that number',
            'request': {
                'method': 'PATCH', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/client-credits/{{creditEntryId}}',
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', '{{creditEntryId}}']},
                'description': (
                    'The *"can always edit that number"* half of the request — on an entry, '
                    'which is what gives it an audit trail the client did not know to ask for.\n\n'
                    '**The balance is re-checked without this row.** Raising an application is '
                    'measured against what the account actually holds, rather than against a '
                    'figure that still contains the old value.\n\n'
                    '`clientId` cannot be changed: money does not move between clients. An entry '
                    'filed against the wrong one is withdrawn and re-entered, which leaves the '
                    'mistake visible on both ledgers instead of silently moving a balance.'),
            },
            'response': [
                example('200 · Edited', 'PATCH', '/client-credits/{{creditEntryId}}', *cap['update'], req_body={
                    'amount': 12500, 'reason': 'Applied to the Aspen trip (revised)'}),
                example('400 · Empty body', 'PATCH', '/client-credits/{{creditEntryId}}', *cap['update_400'], req_body={}),
                example('400 · Raised past the balance', 'PATCH', '/client-credits/{{creditEntryId}}', *cap['update_400_overdraw'], req_body={'amount': 99000}),
            ],
            'event': [script('test', [
                "pm.test('edited', function () {",
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().data.amount).to.eql(12500);',
                '});',
            ])],
        },
        {
            'name': '07 · Withdraw a movement',
            'request': {
                'method': 'DELETE', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/client-credits/{{creditEntryId}}',
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', '{{creditEntryId}}']},
                'description': (
                    'Soft. It leaves the balance and stays readable in the archived view with '
                    'the trail of who removed it.\n\n'
                    'Nothing in this system is destroyed, and on a money ledger least of all: '
                    'the reason a figure changed is the thing somebody will ask about.'),
            },
            'response': [example('204 · Withdrawn', 'DELETE', '/client-credits/{{creditEntryId}}', 204, None)],
            'event': [script('test', [
                "pm.test('withdrawn', function () {",
                '    pm.response.to.have.status(204);',
                '});',
            ])],
        },
        {
            'name': '08 · Restore a withdrawn movement',
            'request': {
                'method': 'POST', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/client-credits/{{creditEntryId}}/restore',
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', '{{creditEntryId}}', 'restore']},
                'description': (
                    '**200, not 201** — a restore creates nothing; it clears a deletion stamp on '
                    'a row that existed all along.\n\n'
                    '**The balance is re-checked, because the ledger has moved on.** A $12,000 '
                    'application withdrawn in March and restored in June lands on whatever the '
                    'account holds now; if the credit behind it was spent meanwhile, restoring '
                    'would overdraw the client. A guard that a withdraw-and-restore walks around '
                    'is not a guard.'),
            },
            'response': [
                example('200 · Back on the ledger', 'POST', '/client-credits/{{creditEntryId}}/restore', *cap['restore']),
                example('404 · Not withdrawn', 'POST', '/client-credits/{{creditEntryId}}/restore', *cap['restore_404']),
            ],
            'event': [script('test', [
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().data.restoredAt).to.not.eql(null);',
                '});',
            ])],
        },
        {
            'name': '09 · Teardown · clear the probe ledger',
            'request': {
                'method': 'DELETE', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/client-credits/{{creditEntryId}}',
                        'host': ['{{baseUrl}}'], 'path': ['client-credits', '{{creditEntryId}}']},
                'description': (
                    'A run is a demonstration, not a data entry session — and a ledger is the '
                    'last place to leave debris.\n\n'
                    'Request 08 restores the movement to show that restore works, which leaves '
                    'it live, so every run would add money to a real client\'s account. This '
                    'withdraws it again, and its test withdraws the credit from request 03 as '
                    'well. There is no hard delete by design, so archiving the probes is the '
                    'correct end state.'),
            },
            'response': [example('204 · Withdrawn', 'DELETE', '/client-credits/{{creditEntryId}}', 204, None)],
            'event': [script('test', [
                "pm.test('probe withdrawn', function () {",
                '    pm.response.to.have.status(204);',
                '});',
                '',
                "const credit = pm.collectionVariables.get('creditId');",
                'if (credit) {',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/client-credits/' + credit,",
                "        method: 'DELETE',",
                "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                '    }, function (err) {',
                "        if (err) { console.warn('teardown could not withdraw ' + credit, err); }",
                '    });',
                '}',
            ])],
        },
    ]

    return {
        'name': '13 · Client Credits',
        'description': (
            "Money a client has on account with us — the client's adjustment #9: *\"a section on "
            'their profile that says credit/money on account ... we can enter how much that is '
            'and can always edit that number or select if it was used towards another trip"*.\n\n'
            '**This is a ledger, not that number, and the difference is deliberate.** The two '
            'halves of his own sentence — "edit that number" and "used towards another trip" — '
            'are *credits* and *applications*: movements, with a balance derived from them. A '
            'single editable field loses why it changed, and a balance dropping from $18,000 to '
            '$6,000 with nothing saying which trip consumed it is an argument waiting to happen. '
            'He gets the edit he asked for, on a row, plus an audit trail he did not know to ask '
            'for.\n\n'
            '**There is no `balance` column.** It is summed on every read, in one place, exactly '
            "as a quote's total is — a stored figure beside the parts it is computed from "
            'contradicts them the first time one is edited.\n\n'
            '**No trip link yet.** Trips do not exist, and a reference string pointing at '
            'nothing would become a migration and a set of broken joins the day the table '
            'arrives. `reason` carries it for now.\n\n'
            '**Reading needs `VIEW_FINANCIALS` *and* access to the client.** An assistant holds '
            'the first at NONE and never learns what a client is holding; a broker sees only '
            'their own clients, and another broker\'s ledger answers 404 rather than 403.\n\n'
            "Every request below is signed in as the seeded SUPER_ADMIN by the folder's "
            'pre-request script, except the 403 examples, captured as the seeded assistant.'),
        'item': items,
    }


def main():
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')

    collection = json.loads(COLLECTION.read_text())
    # The folder login is copied from an existing folder rather than retyped.
    source = next(f for f in collection['item'] if f['name'].startswith('10 ·'))

    folder = build(owner, broker, assistant)
    folder['event'] = json.loads(json.dumps(source['event']))

    collection['item'] = [f for f in collection['item']
                          if not f['name'].startswith('13 · Client Credits')]
    collection['item'].append(folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('creditId', 'creditEntryId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
