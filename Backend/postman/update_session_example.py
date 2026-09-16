#!/usr/bin/env python3
"""
Captures `GET /auth/me` into `01 Auth / 03 Session`.

`/auth/me` gained `permissions` — the caller's row of the permission matrix —
which the frontend now uses to decide whether to render write controls. That is
a contract, so it needs a captured example rather than a description that says
it exists.

Run with the backend up and seeded.
"""

import json
import pathlib
import urllib.request
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')


def session(email: str):
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    body = json.dumps({'email': email, 'password': 'ChangeMe123!'}).encode()
    req = urllib.request.Request(BASE + '/auth/login', data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    opener.open(req).read()
    return opener


def get(opener, path):
    with opener.open(urllib.request.Request(BASE + path)) as response:
        return json.loads(response.read().decode())


def example(name, body):
    return {
        'name': name,
        'originalRequest': {
            'method': 'GET', 'header': [],
            'url': {'raw': '{{baseUrl}}/auth/me', 'host': ['{{baseUrl}}'],
                    'path': ['auth', 'me']},
        },
        'status': 'OK', 'code': 200,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [],
        'body': json.dumps(body, indent=2),
    }


def main():
    owner = get(session('admin@tribecajets.com'), '/auth/me')
    assistant = get(session('assistant@tribecajets.com'), '/auth/me')

    collection = json.loads(COLLECTION.read_text())
    # `01 Auth` nests its requests in sub-folders, so `03 Session` is a folder
    # and the request is `01 Current user` inside it.
    auth = next(f for f in collection['item'] if f['name'].startswith('01'))
    folder = next(f for f in auth['item'] if 'Session' in f['name'])
    request = next(r for r in folder['item'] if 'Current user' in r['name'])

    request['request']['description'] = (
        'Who is signed in. With httpOnly cookies the frontend cannot decode a token, so this '
        'endpoint is the session\'s source of truth.\n\n'
        '**`permissions` is the caller\'s row of the permission matrix**, as `{ PERMISSION: Scope }`. '
        'The UI reads it to avoid offering actions the guard would refuse — a role seeing Edit and '
        'Remove on every row and collecting a 403 reads as a broken app rather than a permission '
        'boundary.\n\n'
        '**It is not an enforcement point and cannot be.** It travels to a browser, where anyone can '
        'edit it. Every route re-checks the same matrix server-side. It is sent from here so the '
        'frontend never re-derives the matrix from `role` — a second copy in JavaScript drifts the '
        'first time a scope changes, and it drifts silently.\n\n'
        'Compare the two examples: the assistant holds `MANAGE_AIRCRAFT` at `READ` (may look, may '
        'not change) and `MANAGE_USERS` at `NONE`, where the owner holds `ALL` throughout.'
    )
    request['response'] = [
        example('200 · Session (SUPER_ADMIN)', owner),
        example('200 · Session (ASSISTANT — read-only scopes)', assistant),
    ]

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"captured {len(request['response'])} examples into {request['name']}")


if __name__ == '__main__':
    main()
