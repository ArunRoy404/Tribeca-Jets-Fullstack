"""
What every live-capturing folder builder needs, in one place.

Each older builder carries its own copy of a cookie session, `example()` and
the header constants — the copies that let `11 · Uploads` go without a label
check while every other builder had one. New builders import from here; the
older ones move over when their own folder is next rebuilt ("fix a module when
we reach it").
"""

import json
import re
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
PASSWORD = 'ChangeMe123!'
MISSING = '00000000-0000-4000-8000-000000000000'

STATUS_TEXT = {200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
               401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
               415: 'Unsupported Media Type', 422: 'Unprocessable Entity', 429: 'Too Many Requests'}

WRITE_HEADERS = [
    {'key': 'Content-Type', 'value': 'application/json'},
    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
     'description': 'Required on every write. Captured automatically after any login or refresh.'},
]


class Session:
    """
    A cookie-backed caller, echoing the CSRF cookie the way the app does.

    `Session(None)` stays signed out — how a real 401 is captured rather than
    typed.
    """

    def __init__(self, email: str | None) -> None:
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        if email:
            status, body = self.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})
            if status != 200:
                raise SystemExit(f'could not sign in as {email}: {status} {body}')

    @property
    def csrf(self) -> str:
        for cookie in self.jar:
            if cookie.name == 'tj_csrf':
                return cookie.value or ''
        return ''

    def request(self, method: str, path: str, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data is not None:
            req.add_header('Content-Type', 'application/json')
        req.add_header('X-CSRF-Token', self.csrf)
        try:
            with self.opener.open(req) as response:
                raw = response.read().decode()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read().decode()
            try:
                return error.code, json.loads(raw)
            except json.JSONDecodeError:
                return error.code, raw


def url(path: str, query: list | None = None) -> dict:
    """A Postman URL object for `{{baseUrl}}` + path, with described query params."""
    raw = '{{baseUrl}}' + path
    enabled = [q for q in (query or []) if not q.get('disabled')]
    if enabled:
        raw += '?' + '&'.join(f"{q['key']}={q['value']}" for q in enabled)
    out = {'raw': raw, 'host': ['{{baseUrl}}'],
           'path': [p for p in path.lstrip('/').split('/') if p]}
    if query:
        out['query'] = query
    return out


def example(name, method, path, status, body, req_body=None):
    """
    One captured example, refused if its label disagrees with the status.

    The status is read from wherever it sits in the name — `200 · Listed` and
    `Success (200 · …)` alike — because an audit that only read the start of
    the name skipped the Uploads folder, which held a 403 label on a 200.
    **Fix the request, never the label.**
    """
    promised = re.search(r'\b(\d{3})\b', name)
    if not promised or int(promised.group(1)) != status:
        raise SystemExit(
            f"example '{name}' promises {promised.group(1) if promised else '?'} but the API "
            f"answered {status} for {method} {path}: {json.dumps(body)[:300]}"
        )
    original = {
        'method': method, 'header': [],
        'url': {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
                'path': [p for p in path.split('?')[0].lstrip('/').split('/') if p]},
    }
    if req_body is not None:
        original['body'] = {'mode': 'raw', 'raw': json.dumps(req_body, indent=2)}
    return {
        'name': name, 'originalRequest': original,
        'status': STATUS_TEXT[status], 'code': status,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [], 'body': '' if body is None else json.dumps(body, indent=2),
    }


def script(listen: str, lines: list[str]) -> dict:
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


def status_test(code: int, label: str) -> dict:
    """The smallest honest test script: the status the request exists to show."""
    return script('test', [f"pm.test('{label}', () => pm.response.to.have.status({code}));"])


def copy_folder_login(collection: dict, folder: dict, source_prefix: str = '10 ·') -> None:
    """
    Gives `folder` the same folder-level sign-in as an existing folder.

    Written by the builder, never patched in by hand: a hand-added login is lost
    on the next rebuild and the folder then 401s when run alone.
    """
    source = next(f for f in collection['item'] if f['name'].startswith(source_prefix))
    folder['event'] = json.loads(json.dumps(source['event']))
