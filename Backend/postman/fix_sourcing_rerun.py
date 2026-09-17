#!/usr/bin/env python3
"""
Makes `04 · Ask an operator to quote` re-runnable.

The request posted `{{operatorId}}` — captured by the Operators folder — against
`{{tripRequestId}}` — captured from the first quote in the sourcing list, which
is by definition an enquiry that has already been sourced. So the pair was
usually one the seed had already asked, and the request returned 409 on the
first run and every run after it.

That 409 is the API behaving correctly: one live ask per operator per enquiry.
The collection was wrong, not the rule.

A pre-request script now picks an operator that has *not* been asked for this
enquiry, the same way the builder does when it captures the examples. If every
operator has been asked, it falls back to the first — the 409 is then the
honest result, and the example for it is documented on the same request.
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

PREREQUEST = [
    '/*',
    ' * Pick an operator nobody has asked for this enquiry yet.',
    ' *',
    ' * One live ask per operator per enquiry is enforced by the API, so posting',
    ' * a pair that already exists returns 409 — which is correct, and which made',
    ' * this request fail on every run when it used whatever operator the',
    ' * Operators folder happened to capture.',
    ' */',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const requestId = pm.collectionVariables.get('tripRequestId');",
    '',
    'pm.sendRequest({',
    "    url: base + '/operator-quotes?limit=100&tripRequestId=' + requestId,",
    "    method: 'GET',",
    '}, function (askedErr, askedRes) {',
    '    const asked = new Set(',
    '        (!askedErr && askedRes.code === 200 ? askedRes.json().data : [])',
    '            .map(function (quote) { return quote.operatorId; })',
    '    );',
    '',
    '    pm.sendRequest({',
    "        url: base + '/operators?limit=100',",
    "        method: 'GET',",
    '    }, function (opErr, opRes) {',
    '        if (opErr || opRes.code !== 200) { return; }',
    '        const operators = opRes.json().data;',
    '        const free = operators.find(function (operator) {',
    '            return !asked.has(operator.id);',
    '        });',
    '        // Falling back to the first operator is deliberate: with every',
    '        // operator already asked, 409 is the honest answer and this request',
    '        // documents that example too.',
    "        pm.collectionVariables.set('operatorId', (free || operators[0]).id);",
    '    });',
    '});',
]


def main() -> None:
    collection = json.loads(COLLECTION.read_text())

    target = None

    def walk(items):
        nonlocal target
        for item in items:
            if 'item' in item:
                walk(item['item'])
            elif item['name'] == '04 · Ask an operator to quote':
                target = item

    walk(collection['item'])
    if target is None:
        raise SystemExit('could not find 04 · Ask an operator to quote')

    events = [e for e in target.get('event', []) if e['listen'] != 'prerequest']
    events.insert(0, {
        'listen': 'prerequest',
        'script': {'type': 'text/javascript', 'exec': PREREQUEST},
    })
    target['event'] = events

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print('sourcing ask: now re-runnable')


if __name__ == '__main__':
    main()
