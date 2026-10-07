#!/usr/bin/env python3
"""
Builds `01 · Auth › 05 · My Account`, capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_account_folder.py
    cd postman && python3 rewrite_body_comments.py

Everything runs as the seeded **assistant**, never the owner: changing a
password and listing or ending sessions signs devices out, and a Postman run
must not sign the person testing the app out of their own browser. Every
write is undone in the same run — the profile is saved with its own values,
two-factor goes on and back off, the password changes and changes back — so
a run leaves the account as it found it.

The folder sits before `06 · Sign out` (renumbered from 05), so a full run
signs out last, as before.
"""

from __future__ import annotations

import json
import pathlib

from builder_common import MISSING, PASSWORD, WRITE_HEADERS, Session, ensure_variables, example, script, status_test, url

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
ASSISTANT = 'assistant@example.com'
TEMP_PASSWORD = 'Interim-Pass-2026'


def body(data: dict) -> dict:
    return {'mode': 'raw', 'raw': json.dumps(data, indent=2), 'options': {'raw': {'language': 'json'}}}


def expect(what, result, status):
    if result[0] != status:
        raise SystemExit(f'{what}: expected {status}, got {result[0]} {json.dumps(result[1])[:300]}')
    return result


def current_session_id(session: Session) -> str:
    _, listed = expect('list sessions', session.request('GET', '/auth/sessions?limit=100'), 200)
    return next(row['id'] for row in listed['data'] if row['current'])


def capture() -> dict:
    me = Session(ASSISTANT)
    other = Session(ASSISTANT)
    anonymous = Session(None)
    cap = {}

    cap['sessions'] = me.request('GET', '/auth/sessions')
    cap['sessions_400'] = me.request('GET', '/auth/sessions?search=Chrome')
    cap['sessions_401'] = anonymous.request('GET', '/auth/sessions')

    _, profile = expect('me', me.request('GET', '/auth/me'), 200)
    same = {'firstName': profile['data']['firstName'], 'lastName': profile['data']['lastName'],
            'phone': profile['data']['phone']}
    cap['profile_body'] = same
    cap['profile'] = me.request('PATCH', '/auth/me', same)
    cap['profile_400'] = me.request('PATCH', '/auth/me', {'role': 'SUPER_ADMIN'})
    cap['profile_401'] = anonymous.request('PATCH', '/auth/me', same)

    cap['2fa_on'] = me.request('PATCH', '/auth/two-factor', {'enabled': True, 'currentPassword': PASSWORD})
    cap['2fa_off'] = me.request('PATCH', '/auth/two-factor', {'enabled': False, 'currentPassword': PASSWORD})
    cap['2fa_400'] = me.request('PATCH', '/auth/two-factor', {'enabled': True, 'currentPassword': 'not-it'})

    other_id = current_session_id(other)
    mine = current_session_id(me)
    cap['revoke'] = me.request('DELETE', f'/auth/sessions/{other_id}')
    cap['revoke_400'] = me.request('DELETE', f'/auth/sessions/{mine}')
    cap['revoke_404'] = me.request('DELETE', f'/auth/sessions/{MISSING}')

    Session(ASSISTANT)  # one more device, so there is something to sign out
    cap['revoke_others'] = me.request('POST', '/auth/sessions/revoke-others', {})

    change = {'currentPassword': PASSWORD, 'newPassword': TEMP_PASSWORD, 'confirmPassword': TEMP_PASSWORD}
    cap['change_400_wrong'] = me.request('POST', '/auth/change-password', {**change, 'currentPassword': 'not-it'})
    cap['change_400_mismatch'] = me.request('POST', '/auth/change-password',
                                            {**change, 'confirmPassword': 'Something-Else-1'})
    cap['change_401'] = anonymous.request('POST', '/auth/change-password', change)
    cap['change'] = expect('change', me.request('POST', '/auth/change-password', change), 200)
    back = {'currentPassword': TEMP_PASSWORD, 'newPassword': PASSWORD, 'confirmPassword': PASSWORD}
    cap['change_back'] = expect('change back', me.request('POST', '/auth/change-password', back), 200)
    cap['change_bodies'] = (change, back)
    return cap


def folder_login(collection: dict) -> list:
    """The `10 · Quotes` folder login, signing in as the assistant instead of the owner."""
    source = next(f for f in collection['item'] if f['name'].startswith('10 ·'))
    event = json.loads(json.dumps(source['event']))
    exec_lines = event[0]['script']['exec']
    joined = '\n'.join(exec_lines)
    for old, new in [("const NEEDED = 'owner';", "const NEEDED = 'assistant';"),
                     ("pm.collectionVariables.get('ownerEmail')", "pm.collectionVariables.get('assistantEmail')"),
                     ('Signs this folder in as the seeded SUPER_ADMIN.',
                      'Signs this folder in as the seeded assistant — never the owner, so a run\n'
                      ' * cannot sign the person testing the app out of their own browser.')]:
        if old not in joined:
            raise SystemExit(f'folder login no longer contains {old!r}; update this builder')
        joined = joined.replace(old, new)
    event[0]['script']['exec'] = joined.split('\n')
    return event


SECOND_DEVICE_SCRIPT = [
    '// Signs in once more, as a second device, then picks whichever live',
    '// session is not the one this request will be sent from.',
    "const base = pm.collectionVariables.get('baseUrl');",
    'pm.sendRequest({',
    "    url: base + '/auth/login', method: 'POST',",
    "    header: { 'Content-Type': 'application/json' },",
    "    body: { mode: 'raw', raw: JSON.stringify({",
    "        email: pm.collectionVariables.get('assistantEmail'),",
    "        password: pm.collectionVariables.get('password'),",
    '    }) },',
    '}, function (err, res) {',
    '    if (err || !res) { return; }',
    "    res.headers.all().filter(function (h) { return h.key.toLowerCase() === 'set-cookie'; })",
    '        .forEach(function (h) {',
    '            const match = /tj_csrf=([^;]+)/.exec(h.value);',
    "            if (match) { pm.collectionVariables.set('csrfToken', match[1]); }",
    '        });',
    "    pm.sendRequest({ url: base + '/auth/sessions?limit=100', method: 'GET' }, function (e, listed) {",
    '        const other = ((listed && listed.json().data) || []).find(function (s) { return !s.current; });',
    "        pm.collectionVariables.set('otherSessionId', other ? other.id : '');",
    '    });',
    '});',
]


def build(cap: dict) -> dict:
    change, back = cap['change_bodies']
    items = [
        {
            'name': '01 · Your signed-in devices',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/auth/sessions', [
                    {'key': 'page', 'value': '1', 'disabled': True,
                     'description': 'optional · integer ≥ 1. Default 1.'},
                    {'key': 'limit', 'value': '10', 'disabled': True,
                     'description': 'optional · integer 1–100. Default 10.'},
                ]),
                'description': (
                    'One row per live session — not revoked, not expired, and renewed recently enough that the '
                    'idle rule would still let it refresh. Most recently active first. `device` is read from the '
                    'browser\'s User-Agent ("Chrome on macOS"), null when unrecognisable. `signedInAt` is the '
                    'sign-in, `lastActiveAt` the last renewal; `current` marks the device asking. No location: '
                    'that needs a paid IP-lookup service. Any parameter but page and limit is a 400.'),
            },
            'response': [
                example('200 · Two devices, this one current', 'GET', '/auth/sessions', *cap['sessions']),
                example('400 · A parameter the endpoint does not take', 'GET', '/auth/sessions?search=Chrome',
                        *cap['sessions_400']),
                example('401 · Not signed in', 'GET', '/auth/sessions', *cap['sessions_401']),
            ],
        },
        {
            'name': '02 · Update your profile',
            'event': [
                script('prerequest', [
                    '// Saves the account\'s own values back, so a run changes nothing.',
                    "pm.sendRequest({ url: pm.collectionVariables.get('baseUrl') + '/auth/me', method: 'GET' },",
                    '    function (err, res) {',
                    '        const me = (res && res.json().data) || {};',
                    "        pm.variables.set('acctFirstName', me.firstName || 'Assistant');",
                    "        pm.variables.set('acctLastName', me.lastName || 'User');",
                    '    });',
                ]),
                status_test(200, '200 OK'),
            ],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS, 'url': url('/auth/me'),
                'body': body({'firstName': '{{acctFirstName}}', 'lastName': '{{acctLastName}}'}),
                'description': (
                    'The signed-in user\'s own firstName, lastName, phone (null clears it) and avatarUrl (an upload '
                    'URL from POST /uploads/image, or null). Email, role and status are refused with a 400 — '
                    'they are an administrator\'s, through PATCH /users/:id. Answers with the GET /auth/me shape.'),
            },
            'response': [
                example('200 · Saved', 'PATCH', '/auth/me', *cap['profile'], req_body=cap['profile_body']),
                example('400 · A field this route does not take', 'PATCH', '/auth/me', *cap['profile_400'],
                        req_body={'role': 'SUPER_ADMIN'}),
                example('401 · Not signed in', 'PATCH', '/auth/me', *cap['profile_401'], req_body=cap['profile_body']),
            ],
        },
        {
            'name': '03 · Turn your two-factor on',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS, 'url': url('/auth/two-factor'),
                'body': body({'enabled': True, 'currentPassword': '{{password}}'}),
                'description': (
                    '`enabled` true or false; `currentPassword` is required either way. From the next sign-in the '
                    'account is asked for an emailed code. Answers with the GET /auth/me shape. The next request '
                    'turns it off again.'),
            },
            'response': [
                example('200 · Turned on', 'PATCH', '/auth/two-factor', *cap['2fa_on'],
                        req_body={'enabled': True, 'currentPassword': '…'}),
                example('400 · Wrong password', 'PATCH', '/auth/two-factor', *cap['2fa_400'],
                        req_body={'enabled': True, 'currentPassword': 'not-it'}),
            ],
        },
        {
            'name': '04 · Turn your two-factor off',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS, 'url': url('/auth/two-factor'),
                'body': body({'enabled': False, 'currentPassword': '{{password}}'}),
                'description': 'Puts the account back as the previous request found it.',
            },
            'response': [
                example('200 · Turned off', 'PATCH', '/auth/two-factor', *cap['2fa_off'],
                        req_body={'enabled': False, 'currentPassword': '…'}),
            ],
        },
        {
            'name': '05 · Sign out one other device',
            'event': [script('prerequest', SECOND_DEVICE_SCRIPT), status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS[1:], 'url': url('/auth/sessions/{{otherSessionId}}'),
                'description': (
                    'Ends one of your sessions on another device. 404 for an id that is not one of your live '
                    'sessions (someone else\'s is not confirmed to exist); 400 for this device — use logout.'),
            },
            'response': [
                example('204 · Signed out', 'DELETE', '/auth/sessions/{{otherSessionId}}', *cap['revoke']),
                example('400 · That is this device', 'DELETE', '/auth/sessions/<this session>', *cap['revoke_400']),
                example('404 · Not one of your sessions', 'DELETE', f'/auth/sessions/{MISSING}', *cap['revoke_404']),
            ],
        },
        {
            'name': '06 · Sign out all other devices',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/auth/sessions/revoke-others'),
                'body': body({}),
                'description': 'Ends every session but this one. `signedOutSessions` says how many.',
            },
            'response': [
                example('200 · Others signed out', 'POST', '/auth/sessions/revoke-others', *cap['revoke_others'],
                        req_body={}),
            ],
        },
        {
            'name': '07 · Change your password',
            'event': [
                script('prerequest', [
                    '// A fresh interim password per run; the next request changes it back.',
                    "pm.collectionVariables.set('interimPassword', 'Interim-' + Date.now() + 'aA');",
                ]),
                status_test(200, '200 OK'),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/auth/change-password'),
                'body': body({'currentPassword': '{{password}}', 'newPassword': '{{interimPassword}}',
                              'confirmPassword': '{{interimPassword}}'}),
                'description': (
                    'Needs the current password. The new one: 10–128 characters with an uppercase letter, a '
                    'lowercase letter and a number, different from the current one. Every other session is signed '
                    'out; this one stays signed in. A wrong current password is a 400, not a 401 — the session is '
                    'fine, the form is not.'),
            },
            'response': [
                example('200 · Changed', 'POST', '/auth/change-password', *cap['change'],
                        req_body={**change, 'currentPassword': '…'}),
                example('400 · Wrong current password', 'POST', '/auth/change-password', *cap['change_400_wrong'],
                        req_body={**change, 'currentPassword': 'not-it'}),
                example('400 · Confirmation does not match', 'POST', '/auth/change-password',
                        *cap['change_400_mismatch'], req_body={**change, 'confirmPassword': 'Something-Else-1'}),
                example('401 · Not signed in', 'POST', '/auth/change-password', *cap['change_401'], req_body=change),
            ],
        },
        {
            'name': '08 · Change it back',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/auth/change-password'),
                'body': body({'currentPassword': '{{interimPassword}}', 'newPassword': '{{password}}',
                              'confirmPassword': '{{password}}'}),
                'description': 'Restores the seeded password, so the run leaves the account as it found it.',
            },
            'response': [
                example('200 · Changed back', 'POST', '/auth/change-password', *cap['change_back'], req_body=back),
            ],
        },
    ]
    return {
        'name': '05 · My Account',
        'description': (
            'The signed-in user\'s own profile, two-factor, password and devices. No permission applies: every '
            'route acts only on the caller\'s own account. Runs as the seeded assistant, never the owner, and '
            'undoes every change before it ends.'),
        'item': items,
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {'assistantEmail': ASSISTANT, 'otherSessionId': '', 'interimPassword': ''})

    folder = build(capture())
    folder['event'] = folder_login(collection)

    auth = next(f for f in collection['item'] if f['name'].startswith('01 ·') and f['name'].endswith('Auth'))
    for sub in auth['item']:
        if sub['name'] == '05 · Sign out':
            sub['name'] = '06 · Sign out'
    auth['item'] = [sub for sub in auth['item'] if sub['name'] != folder['name']] + [folder]
    auth['item'].sort(key=lambda sub: sub['name'].split(' ', 1)[0])

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote 01 · Auth › {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
