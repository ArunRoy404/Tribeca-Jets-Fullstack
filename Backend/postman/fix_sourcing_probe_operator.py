#!/usr/bin/env python3
"""
Makes `09 · Operator Sourcing` pass on any database, and leave nothing live
(10 Nov 2026).

Two faults, found when the collection's lookups stopped going to the dev API
(they read `pm.collectionVariables.get('baseUrl')`, which ignores Newman's
`--env-var`, so every 4100 run had been looking ids up on 4000):

- `04 · Ask an operator to quote` picked "an operator nobody has asked for
  this enquiry yet" from the live list. On a database with one live operator
  (the dev database since the 9 Oct wipe, and so `tribeca_postman`) that one
  was already asked, and the request answered 409 on every run.
- Its teardown was a `pm.sendRequest` in the last test script (`14`), which
  AGENTS.md retired: Newman can finish before it completes.

Now `04` asks a probe operator of its own, created in its pre-request, and
two last requests archive the ask and then the probe — each a request of its
own, never a `pm.sendRequest` in a last test script (AGENTS.md). The probe
sits in the Operators' Archived tab afterwards, never in a picker.

Captures the teardown examples from a live API:

    POSTMAN_BASE=http://localhost:4100/api python3 postman/fix_sourcing_probe_operator.py
"""

import json
import pathlib
import time

from builder_common import WRITE_HEADERS, Session, ensure_variables, example, script, url

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
FOLDER = '09 · Operator Sourcing'

PREREQUEST = [
    '/*',
    ' * Ask a probe operator of our own. "Whichever operator nobody has asked',
    ' * yet" ran out on a database with one live operator, and one live ask per',
    ' * operator per enquiry is the API\'s rule — so every run 409\'d. The probe',
    ' * is archived by the folder\'s teardown (15, 16).',
    ' */',
    "const base = pm.variables.get('baseUrl');",
    'pm.sendRequest({',
    "    url: base + '/operators', method: 'POST',",
    "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
    "    body: { mode: 'raw', raw: JSON.stringify({",
    "        name: 'Postman Sourcing Probe ' + Date.now().toString().slice(-6),",
    "        homeBase: 'Teterboro, NJ', primaryContact: 'Probe Desk',",
    "        contactEmail: 'probe-sourcing@example.com',",
    '    }) },',
    '}, function (err, res) {',
    '    if (err || res.code !== 201) { return; }',
    "    pm.collectionVariables.set('operatorId', res.json().data.id);",
    "    pm.collectionVariables.set('sourcingProbeOperatorId', res.json().data.id);",
    '});',
]


def find(items, name):
    return next(item for item in items if item['name'] == name)


def capture():
    """The two teardown answers, from a live API, on a probe of their own."""
    owner = Session('admin@example.com')
    request = owner.request('GET', '/trip-requests?limit=1')[1]['data'][0]
    stamp = str(int(time.time()))[-6:]
    status, body = owner.request('POST', '/operators', {
        'name': f'Postman Sourcing Probe {stamp}', 'homeBase': 'Teterboro, NJ',
        'primaryContact': 'Probe Desk', 'contactEmail': 'probe-sourcing@example.com'})
    if status != 201:
        raise SystemExit(f'could not create the probe operator: {status} {body}')
    operator = body['data']['id']
    status, body = owner.request('POST', '/operator-quotes', {'tripRequestId': request['id'], 'operatorId': operator})
    if status != 201:
        raise SystemExit(f'could not ask the probe operator: {status} {body}')
    ask = body['data']['id']
    return (owner.request('DELETE', f'/operator-quotes/{ask}'),
            owner.request('DELETE', f'/operators/{operator}'))


def teardown(name, path, variable, captured, description):
    return {
        'name': name,
        'event': [script('test', [
            "pm.test('archived', () => pm.response.to.have.status(204));",
            f"pm.collectionVariables.set('{variable}', '');",
        ])],
        'request': {
            'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url(path.replace(':id', '{{' + variable + '}}')),
            'description': description,
        },
        'response': [example('204 · Archived', 'DELETE', path, *captured)],
    }


def main() -> None:
    ask_archived, probe_archived = capture()
    collection = json.loads(COLLECTION.read_text())
    folder = find(collection['item'], FOLDER)

    ask = find(folder['item'], '04 · Ask an operator to quote')
    ask['event'] = [e for e in ask['event'] if e['listen'] != 'prerequest']
    ask['event'].insert(0, script('prerequest', PREREQUEST))

    # 14 archived the ask with a pm.sendRequest in its test script, which a
    # run can finish before; 15 does it as a request of its own instead.
    restore = find(folder['item'], '14 · Restore several')
    restore['event'] = [e for e in restore['event'] if e['listen'] != 'test']
    restore['event'].append(script('test', [
        "pm.test('restored', function () {",
        '    pm.response.to.have.status(200);',
        '});',
    ]))

    folder['item'] = [i for i in folder['item'] if 'Teardown' not in i['name']]
    folder['item'] += [
        teardown('15 · Teardown — archive the ask', '/operator-quotes/:id', 'newOperatorQuoteId', ask_archived,
                 'Archives the ask `04` created. The folder ends by restoring it (`12`, `14`), so without this '
                 'every run left one more live ask on a real enquiry. A request of its own so it always runs.'),
        teardown('16 · Teardown — archive the probe operator', '/operators/:id', 'sourcingProbeOperatorId',
                 probe_archived,
                 'Archives the probe operator `04` asked, after its ask. It ends in the Operators\' Archived tab, '
                 'never in a picker.'),
    ]
    ensure_variables(collection, {'sourcingProbeOperatorId': '', 'newOperatorQuoteId': ''})
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f'{FOLDER}: 04 asks its own probe operator; teardown 15 (ask) and 16 (probe) added')


if __name__ == '__main__':
    main()
