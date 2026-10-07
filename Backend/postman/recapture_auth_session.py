#!/usr/bin/env python3
"""
Recaptures the `01 · Auth` examples whose bodies carry the session, after the
per-user permissions change (7 Oct 2026): the session now carries
`permissions` (the person's own `{ MODULE: { reach, actions } }`) and `matrix`
(the old role matrix), and every sign-in sets a fourth cookie, `tj_modules`.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/recapture_auth_session.py

Run against an API with `MAIL_DRIVER=log` — the two-factor example reads the
code such an API returns. Also drops `02 · Senior Broker` from Sign in: the
role was withdrawn, and its account is a broker now.
"""

from __future__ import annotations

import json
import pathlib

from builder_common import PASSWORD, Session, example

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

COOKIE_ROW = '| `tj_csrf` | matches refresh | echoed back as `X-CSRF-Token` on writes |'
MODULES_ROW = ('| `tj_modules` | matches refresh | the modules this person may view — the '
               "frontend's proxy reads it to refuse a page before it renders |")


def find(items, name):
    return next(item for item in items if item['name'] == name)


def replace(request_item, name, new_example):
    request_item['response'] = [new_example if r['name'] == name else r for r in request_item['response']]


def login_body(email):
    return {'email': email, 'password': PASSWORD, 'rememberMe': False}


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    auth = next(f for f in collection['item'] if f['name'] == '01 · Auth')
    sign_in = find(auth['item'], '01 · Sign in')

    # --- Senior Broker is gone; renumber what follows -----------------------
    sign_in['item'] = [r for r in sign_in['item'] if r['name'] != '02 · Senior Broker']
    for index, request in enumerate(sign_in['item'], start=1):
        request['name'] = f"{index:02d} · {request['name'].split(' · ', 1)[1]}"
    sign_in['description'] = sign_in['description'].replace('All five share', 'All four share')

    # --- sign-in bodies now carry the session shape ---------------------------
    for request_name, email in (('01 · Owner · SUPER_ADMIN', 'admin@example.com'),
                                ('02 · Broker', 'broker@example.com'),
                                ('03 · Assistant', 'assistant@example.com')):
        status, answer = Session(None).request('POST', '/auth/login', login_body(email))
        replace(find(sign_in['item'], request_name), '200 · Signed in',
                example('200 · Signed in', 'POST', '/auth/login', status, answer, login_body(email)))

    # --- two-factor verify ------------------------------------------------------
    two_factor = find(auth['item'], '02 · Two-factor')
    session = Session(None)
    _, challenge = session.request('POST', '/auth/login', login_body('security@example.com'))
    code = challenge['data']['devCode']['code']
    status, answer = session.request('POST', '/auth/two-factor/verify', {'code': code})
    replace(find(two_factor['item'], '02 · Verify code'), '200 · Verified, session created',
            example('200 · Verified, session created', 'POST', '/auth/two-factor/verify', status, answer,
                    {'code': '{{otpCode}}'}))

    # --- the session itself ----------------------------------------------------
    sessions = find(auth['item'], '03 · Session')
    me = find(sessions['item'], '01 · Current user')
    owner = Session('admin@example.com')
    assistant = Session('assistant@example.com')
    status, answer = owner.request('GET', '/auth/me')
    owner_example = example('200 · Session (SUPER_ADMIN)', 'GET', '/auth/me', status, answer)
    status, answer = assistant.request('GET', '/auth/me')
    assistant_example = example('200 · Session (ASSISTANT — their own permissions)', 'GET', '/auth/me', status, answer)
    me['response'] = [owner_example, assistant_example]
    me['request']['description'] = (
        "Who is signed in. With httpOnly cookies the frontend cannot decode a token, so this endpoint is the "
        "session's source of truth.\n\n"
        "**`permissions` is this person's own set** (7 Oct 2026), as `{ MODULE: { reach, actions } }` — "
        "the modules they may open, what they may do in each, and how far it reaches (OWN, ASSIGNED or ALL, "
        "fixed by their role). A module that is absent has no access: the sidebar hides it and the page "
        "refuses it. Each person's set starts from their role's defaults and can be adjusted for them alone "
        "(`04 · Users`).\n\n"
        "**`matrix`** is the old role matrix, `{ PERMISSION: Scope }`, kept for the modules not yet moved to "
        "per-user permissions.\n\n"
        "**Neither is an enforcement point.** Both travel to a browser, where anyone can edit them; every "
        "route re-checks on the server. This call also rewrites the `tj_modules` cookie, so a change an "
        "administrator made reaches the frontend's page routing.\n\n"
        "Compare the examples: the owner holds every module at ALL; the assistant holds the modules an "
        "assistant starts with, mostly at ASSIGNED."
    )

    refresh = find(sessions['item'], '02 · Refresh session')
    status, answer = Session('broker@example.com').request('POST', '/auth/refresh', {})
    replace(refresh, '200 · Rotated', example('200 · Rotated', 'POST', '/auth/refresh', status, answer, {}))

    # --- the cookie tables name the routing cookie -----------------------------
    def add_cookie_row(node):
        for item in node.get('item', []):
            request = item.get('request')
            if request and COOKIE_ROW in (request.get('description') or '') and MODULES_ROW not in request['description']:
                request['description'] = request['description'].replace(COOKIE_ROW, f'{COOKIE_ROW}\n{MODULES_ROW}')
                request['description'] = request['description'].replace('**Sets three cookies**', '**Sets four cookies**')
            add_cookie_row(item)

    add_cookie_row(auth)

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print('recaptured 01 · Auth session examples; Sign in now has', len(sign_in['item']), 'requests')


if __name__ == '__main__':
    main()
