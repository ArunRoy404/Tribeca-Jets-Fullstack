#!/usr/bin/env python3
"""
Gives `11 · Uploads` the folder-level login that lets it pass on its own.

Run straight after `build_uploads_folder.py`, which rewrites the folder and so
drops any event attached to it.

The script is *copied from* `10 · Quotes` rather than retyped: two hand-written
copies of a login would drift the first time the cookie or the two-factor step
changed, and the second copy is always the one nobody updates.
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

OWN_BROKER = [
    '',
    '/*',
    ' * Finds a broker to file a document about.',
    ' *',
    ' * `{{userId}}` is set by `04 · Users` during a full run, so without this the',
    ' * folder run alone posts an empty ownerUserId and fails validation — a false',
    ' * failure, which is how a real one gets ignored.',
    ' */',
    "if (!pm.collectionVariables.get('userId')) {",
    '    pm.sendRequest({',
    "        url: pm.collectionVariables.get('baseUrl') + '/users?search=mark&limit=1',",
    "        method: 'GET',",
    '    }, function (err, res) {',
    "        if (err) { console.error('could not resolve a broker', err); return; }",
    '        const body = res.json();',
    '        if (body && body.data && body.data.length) {',
    "            pm.collectionVariables.set('userId', body.data[0].id);",
    '        }',
    '    });',
    '}',
]

HEADER = [
    '/*',
    ' * Signs this folder in as the seeded SUPER_ADMIN.',
    ' *',
    ' * Present so the folder passes when run alone. Without it every request',
    ' * below answers 401, and a false failure here is how a real one gets',
    ' * ignored.',
    ' *',
    ' * Same mechanism as `10 · Quotes`, copied from it at build time: it acts',
    ' * only when the current session is for a different account, so it costs',
    ' * one login per run rather than one per request.',
    ' */',
]


def main() -> None:
    collection = json.loads(COLLECTION.read_text())

    source = next(i for i in collection['item'] if i['name'].startswith('10 ·'))
    prerequest = next(e for e in source['event'] if e['listen'] == 'prerequest')
    lines = list(prerequest['script']['exec'])
    start = next(i for i, line in enumerate(lines) if line.startswith('const NEEDED'))

    exec_lines = HEADER + lines[start:] + OWN_BROKER

    folder = next(i for i in collection['item'] if i['name'] == '11 · Uploads')
    folder['event'] = [{
        'listen': 'prerequest',
        'script': {'type': 'text/javascript', 'exec': exec_lines},
    }]

    COLLECTION.write_text(json.dumps(collection, indent=2, ensure_ascii=False) + '\n')
    print(f'11 · Uploads — folder login attached ({len(exec_lines)} lines)')


if __name__ == '__main__':
    main()
