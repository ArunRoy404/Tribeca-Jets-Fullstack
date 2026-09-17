#!/usr/bin/env python3
"""
Gives the `03 · Clients` folder the teardown every other folder already has.

`04 · Create client` adds a client on every run, and the folder ends by
*restoring* it — so each Newman run left one more live "Marcus Reyes" in the
directory. Twenty-six had accumulated before anyone looked: 26 of the 28 live
clients were Postman debris, which makes the Clients screen useless for
judging anything.

There is no hard delete in this system by design, so the run cannot erase its
own row. Archiving it is the best available end state — the debris sits in the
Archived tab rather than among the clients a broker actually works.

Matches the teardowns in `build_aircraft_folder.py` and
`build_trip_requests_folder.py`.
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

CAPTURE = [
    "pm.test('created', () => {",
    '  pm.response.to.have.status(201);',
    "  pm.collectionVariables.set('clientId', pm.response.json().data.id);",
    '  // Kept separately from clientId, which later requests overwrite. The',
    '  // teardown needs to know which row *this run* created.',
    "  pm.collectionVariables.set('newClientId', pm.response.json().data.id);",
    '});',
]

TEARDOWN = [
    "pm.test('restored', function () {",
    '    pm.response.to.have.status(200);',
    '});',
    '',
    '// Teardown. This is the last request in the folder, and the folder ends by',
    '// restoring the client it created — so every run used to leave one more',
    '// live "Marcus Reyes" in the client directory. Twenty-six had piled up.',
    '//',
    '// There is no hard delete in this system by design, so the run cannot',
    '// erase its own row. Archiving it is the best available end state: the',
    '// debris sits in the Archived tab instead of among the clients a broker',
    '// actually works.',
    "const id = pm.collectionVariables.get('newClientId');",
    'if (id) {',
    '    pm.sendRequest({',
    "        url: pm.collectionVariables.get('baseUrl') + '/clients/' + id,",
    "        method: 'DELETE',",
    "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
    '    }, function (err) {',
    "        if (err) { console.warn('teardown could not archive ' + id, err); }",
    '    });',
    "    pm.collectionVariables.set('newClientId', '');",
    '}',
]


def script(lines: list[str]) -> dict:
    return {'listen': 'test', 'script': {'type': 'text/javascript', 'exec': lines}}


def main() -> None:
    collection = json.loads(COLLECTION.read_text())
    folder = next(f for f in collection['item'] if f['name'].startswith('03 · Clients'))
    by_name = {r['name']: r for r in folder['item']}

    by_name['04 · Create client']['event'] = [script(CAPTURE)]
    by_name['09 · Restore several clients']['event'] = [script(TEARDOWN)]

    existing = {v['key'] for v in collection['variable']}
    if 'newClientId' not in existing:
        collection['variable'].append({'key': 'newClientId', 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print('clients folder: capture + teardown wired')


if __name__ == '__main__':
    main()
