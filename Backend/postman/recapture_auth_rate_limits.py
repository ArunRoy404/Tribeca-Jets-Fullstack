#!/usr/bin/env python3
"""
Recaptures the `01 · Auth` sign-in and reset-code examples after Settings ›
Rate Limiting (owner's decision, 15 Oct 2026): only failed sign-ins and
emailed codes are limited, the wrong-password message warns when few
attempts are left, and the refusals are 429s that say how long.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/recapture_auth_rate_limits.py
    cd postman && python3 rewrite_body_comments.py

Run against an API with `MAIL_DRIVER=log` and its own Redis (README). Every
failure is made on a fresh probe address on `example.com` — no account, so no
real person's sign-in is paused and no email reaches anyone — under the
company's own limits, which this script does not change.
"""

from __future__ import annotations

import json
import pathlib
import uuid

from builder_common import Session, example

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

SIGN_IN_LIMITS = (
    "\n\n**Only failed sign-ins are limited** (Settings › Rate Limiting, 15 Oct 2026). A correct sign-in is "
    "never limited, however often, for any role — and it clears the count. A wrong password counts, and so "
    "does an email with no account, so the answers never say which addresses exist. When two or fewer "
    "attempts are left the 401 says so; the failure that reaches the limit, and every attempt while sign-in "
    "is paused — the right password too — answers **429** saying how long to wait. The limit, the window, "
    "the pause and whose failures count together (`ACCOUNT_AND_IP` by default) are company settings "
    "(`30 · Settings`); \"Never\" turns it off."
)

CODE_LIMITS = (
    "\n\n**Codes are limited per address** (Settings › Rate Limiting): reset codes and two-factor resends "
    "count together, for registered and unregistered addresses alike, and past the limit the answer is "
    "**429** saying how long. The code a correct sign-in sends is not counted."
)


def find(items, name):
    return next(item for item in items if item['name'] == name)


def replace(request_item, name, new_example):
    names = [r['name'] for r in request_item['response']]
    if name in names:
        request_item['response'] = [new_example if r['name'] == name else r for r in request_item['response']]
    else:
        request_item['response'].append(new_example)


def probe() -> str:
    return f'probe-{uuid.uuid4().hex[:8]}@example.com'


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    auth = find(collection['item'], '01 · Auth')
    owner_sign_in = find(find(auth['item'], '01 · Sign in')['item'], '01 · Owner · SUPER_ADMIN')

    _, settings = Session('admin@example.com').request('GET', '/settings')
    limit = settings['data']['rateLimits']['failedSignInLimit']
    if limit is None:
        raise SystemExit('Failed sign-ins are set to Never on this API; the 429 example cannot be captured.')

    # Wrong password on a real account, then the right one clears the count.
    wrong = {'email': 'admin@example.com', 'password': 'WrongPassword1!'}
    status, answer = Session(None).request('POST', '/auth/login', wrong)
    replace(owner_sign_in, '401 · Wrong password',
            example('401 · Wrong password', 'POST', '/auth/login', status, answer, wrong))
    Session('admin@example.com')

    unknown = {'email': probe(), 'password': 'ChangeMe123!'}
    status, answer = Session(None).request('POST', '/auth/login', unknown)
    replace(owner_sign_in, '401 · No such account (identical to a wrong password)',
            example('401 · No such account (identical to a wrong password)', 'POST', '/auth/login',
                    status, answer, unknown))

    # Fail on one probe until the warning, then the pause.
    caller, body = Session(None), {'email': probe(), 'password': 'not-the-password'}
    answers = [caller.request('POST', '/auth/login', body) for _ in range(limit)]
    replace(owner_sign_in, '401 · One more failed attempt will pause sign-in',
            example('401 · One more failed attempt will pause sign-in', 'POST', '/auth/login',
                    *answers[-2], body))
    replace(owner_sign_in, '429 · Sign-in paused after too many failed attempts',
            example('429 · Sign-in paused after too many failed attempts', 'POST', '/auth/login',
                    *answers[-1], body))
    description = owner_sign_in['request']['description'].split('\n\n**Only failed sign-ins are limited**')[0]
    owner_sign_in['request']['description'] = description + SIGN_IN_LIMITS

    # Reset codes on one probe address until the limit refuses one.
    reset = find(find(auth['item'], '04 · Password reset')['item'], '01 · Request reset code')
    code_limit = settings['data']['rateLimits']['codeSendLimit']
    if code_limit is not None:
        address = {'email': probe()}
        answers = [Session(None).request('POST', '/auth/forgot-password', address) for _ in range(code_limit + 1)]
        replace(reset, '429 · Too many codes for one address',
                example('429 · Too many codes for one address', 'POST', '/auth/forgot-password',
                        *answers[-1], address))
    description = reset['request']['description'].split('\n\n**Codes are limited per address**')[0]
    reset['request']['description'] = description + CODE_LIMITS

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"Sign in: {[r['name'] for r in owner_sign_in['response']]}")
    print(f"Request reset code: {[r['name'] for r in reset['response']]}")


if __name__ == '__main__':
    main()
