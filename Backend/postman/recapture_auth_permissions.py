#!/usr/bin/env python3
"""
Re-captures the session payloads in `01 · Auth` after the old role matrix was
deleted (10 Nov 2026).

Every example in the folder that carries a signed-in user — sign-in, the
two-factor verification, `/auth/me`, refresh, the My Account saves — embedded
that account's `matrix` (the old role matrix, no longer returned) and its
`permissions` as they were when it was captured, before Trips gained
Reassign and Approve. The folder has no builder of its own, so this replaces
exactly those two keys: `matrix` is dropped and `permissions` is the account's
real set, read from `/auth/me` on a live API. Everything else in each example
stays as captured.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/recapture_auth_permissions.py
"""

import json
import pathlib

from builder_common import PASSWORD, Session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')


def signed_in(email: str) -> Session:
    """A session for `email`, through two-factor when the account has it on."""
    session = Session(None)
    status, body = session.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})
    data = (body or {}).get('data') or {}
    if status == 200 and data.get('requiresTwoFactor'):
        code = (data.get('devCode') or {}).get('code')
        if not code:
            raise SystemExit(f'{email} needs two-factor and the API sent no devCode — run with MAIL_DRIVER=log')
        status, body = session.request('POST', '/auth/two-factor/verify', {'code': code})
    if status != 200:
        raise SystemExit(f'could not sign in as {email}: {status} {body}')
    return session


def main() -> None:
    collection = json.loads(COLLECTION.read_text())
    auth = next(f for f in collection['item'] if f['name'].startswith('01 ·'))
    permissions: dict[str, dict] = {}
    changed = 0

    def current(email: str) -> dict:
        if email not in permissions:
            status, body = signed_in(email).request('GET', '/auth/me')
            if status != 200:
                raise SystemExit(f'/auth/me for {email}: {status} {body}')
            permissions[email] = body['data']['permissions']
        return permissions[email]

    def walk(items):
        nonlocal changed
        for item in items:
            for response in item.get('response', []):
                if '"matrix"' not in (response.get('body') or ''):
                    continue
                body = json.loads(response['body'])
                data = body.get('data') or {}
                user = data.get('user') if isinstance(data.get('user'), dict) else data
                user.pop('matrix', None)
                user['permissions'] = current(user['email'])
                response['body'] = json.dumps(body, indent=2)
                changed += 1
            walk(item.get('item', []))

    walk(auth['item'])
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f'01 · Auth: {changed} session examples re-captured for {sorted(permissions)}')


if __name__ == '__main__':
    main()
