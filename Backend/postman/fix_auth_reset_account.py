#!/usr/bin/env python3
"""
Makes `01 · Auth / 04 · Password reset` pass on a database that has never
had the reset-demo account (10 Nov 2026).

The flow resets `reset-demo@example.com` on purpose — completing it really
changes the password, so it must never be an account another folder signs in
with. But nothing created that account: it existed only in databases seeded
before the 9 Oct wipe, so on `tribeca_postman` (a copy of the wiped dev
database) `forgot-password` answered with its decoy challenge and "Verify
reset code" and "Set new password" failed on every run.

`01 · Request reset code` now gets a pre-request that looks the account up
and, when it is missing, invites it — as the administrator the folder signed
in as in `01 · Sign in / 04` and `02 · Two-factor`. An invited account may
reset its password (and the reset promotes it to ACTIVE), so the first run
creates it and every later run finds it. Users are never deleted, so this is
one row per database, not one per run.

Run from Backend/: python3 postman/fix_auth_reset_account.py
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

PREREQUEST = [
    '/*',
    ' * The reset flow needs its own account: it really changes the password,',
    ' * so it must never be one the other folders sign in with. A database',
    ' * copied from the dev one may not have it, so this invites it once, as',
    ' * the administrator signed in above; every later run finds it.',
    ' */',
    "const base = pm.variables.get('baseUrl');",
    "const email = 'reset-demo@example.com';",
    'pm.sendRequest({',
    "    url: base + '/users?limit=10&search=' + encodeURIComponent(email),",
    "    method: 'GET',",
    '}, function (err, res) {',
    '    if (err || !res || res.code !== 200) {',
    "        console.log('Could not look up ' + email + ':', res && res.code);",
    '        return;',
    '    }',
    '    const found = (res.json().data || []).some(function (u) { return u.email === email; });',
    '    if (found) { return; }',
    '    pm.sendRequest({',
    "        url: base + '/users/invite', method: 'POST',",
    '        header: {',
    "            'Content-Type': 'application/json',",
    "            'X-CSRF-Token': pm.collectionVariables.get('csrfToken'),",
    '        },',
    "        body: { mode: 'raw', raw: JSON.stringify({",
    '            email: email,',
    "            password: 'ResetDemo' + Date.now().toString().slice(-6),",
    "            firstName: 'Reset', lastName: 'Demo', role: 'BROKER',",
    '        }) },',
    '    }, function (e, made) {',
    "        console.log('Invited ' + email + ':', made && made.code);",
    '    });',
    '});',
]


def find(items, names):
    for item in items:
        if item['name'] == names[0]:
            return item if len(names) == 1 else find(item.get('item', []), names[1:])
    raise SystemExit(f'Not found: {names[0]}')


def main() -> None:
    collection = json.loads(COLLECTION.read_text())
    request = find(collection['item'], ['01 · Auth', '04 · Password reset', '01 · Request reset code'])
    events = [e for e in request.get('event', []) if e['listen'] != 'prerequest']
    events.insert(0, {'listen': 'prerequest', 'script': {'type': 'text/javascript', 'exec': PREREQUEST}})
    request['event'] = events
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print('01 · Request reset code: provisions reset-demo@example.com when missing')


if __name__ == '__main__':
    main()
