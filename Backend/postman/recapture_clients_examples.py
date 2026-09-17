#!/usr/bin/env python3
"""
Re-captures every example in the `03 · Clients` folder from a live API.

Run the backend first:

    npm run start:dev
    python3 postman/recapture_clients_examples.py

Why this exists rather than a full builder: the folder's *requests* — bodies,
query parameters, descriptions — are current and hand-tuned. Only its stored
responses had gone stale, and by more than one field. They were captured before
`homeAirport` became a relation (they still show it as the bare string "KOPF"),
before `status`, `priority` and the follow-up columns existed, and before the
archive actor fields were added. They also documented `notes` and `preferences`,
which the service had since stopped selecting — so the collection was right and
the API was wrong, which is exactly the way round that goes unnoticed.

So this script replays each request and replaces the examples in place. Every
example is captured, never typed.

Re-runnable: the probe client it creates is archived at the end, so running it
twice does not add rows to the working directory.
"""

import json
import pathlib
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
PASSWORD = 'ChangeMe123!'
UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'


class Session:
    """A cookie-backed caller, echoing the CSRF cookie the way the app does."""

    def __init__(self, email: str | None = None) -> None:
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )
        if email:
            self.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})

    @property
    def csrf(self) -> str:
        for cookie in self.jar:
            if cookie.name == 'tj_csrf':
                return cookie.value or ''
        return ''

    def request(self, method: str, path: str, body=None, csrf: bool = True):
        """Returns (status, parsed body). Errors are captured, not raised."""
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data is not None:
            req.add_header('Content-Type', 'application/json')
        if csrf:
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


STATUS_TEXT = {200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
               401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict'}


def set_body(example: dict, status: int, body) -> dict:
    """Replaces one stored example's response, leaving its request alone."""
    example['code'] = status
    example['status'] = STATUS_TEXT[status]
    example['body'] = '' if body is None else json.dumps(body, indent=2, ensure_ascii=False)
    return example


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    anon = Session()

    collection = json.loads(COLLECTION.read_text())
    folder = next(f for f in collection['item'] if f['name'].startswith('03 · Clients'))
    by_name = {r['name']: r for r in folder['item']}

    def examples(request_name: str) -> dict:
        return {e['name']: e for e in by_name[request_name]['response']}

    # A probe of our own, so no seeded client is mutated to make a screenshot.
    created_status, created = owner.request('POST', '/clients', {
        'firstName': 'Postman',
        'lastName': 'Probe',
        'type': 'DIRECT',
        'status': 'LEAD',
        'email': 'postman.probe@tribecajets.com',
        'phone': '+1 555 0100',
        'leadSource': 'DIRECT',
        'leadStage': 'NEW',
        'priority': 'MEDIUM',
        'notes': 'Created by the Postman example capture script.',
        'preferences': {'catering': 'None requested'},
        'labels': ['Probe'],
    })
    probe_id = created['data']['id']
    print(f'probe client {probe_id} ({created_status})')

    captured = 0

    # 01 · List clients
    ex = examples('01 · List clients')
    captured += bool(set_body(ex['200 · Page of clients'], *owner.request('GET', '/clients?page=1&limit=2')))
    captured += bool(set_body(ex['400 · Unsortable column'], *owner.request('GET', '/clients?sortBy=notAColumn')))
    captured += bool(set_body(ex['401 · Not signed in'], *anon.request('GET', '/clients')))

    # 02 · Client tiles
    ex = examples('02 · Client tiles')
    captured += bool(set_body(ex['200 · Tiles'], *owner.request('GET', '/clients/stats')))

    # 03 · Get client
    ex = examples('03 · Get client')
    captured += bool(set_body(ex['200 · Client record'], *owner.request('GET', f'/clients/{probe_id}')))
    captured += bool(set_body(ex['404 · Not found or out of scope'], *owner.request('GET', f'/clients/{UNKNOWN_ID}')))

    # 04 · Create client — the probe's own creation, plus the ways it fails.
    ex = examples('04 · Create client')
    captured += bool(set_body(ex['201 · Created'], created_status, created))
    captured += bool(set_body(ex['400 · Validation failed'], *owner.request('POST', '/clients', {'firstName': '', 'lastName': ''})))
    captured += bool(set_body(ex['403 · Missing X-CSRF-Token'], *owner.request('POST', '/clients', {'firstName': 'No', 'lastName': 'Csrf'}, csrf=False)))
    captured += bool(set_body(ex['401 · Not signed in'], *anon.request('POST', '/clients', {'firstName': 'Not', 'lastName': 'SignedIn'})))

    # 05 · Update client — notes and preferences round-trip, which is the whole
    # reason this re-capture was needed.
    ex = examples('05 · Update client')
    captured += bool(set_body(ex['200 · Updated'], *owner.request('PATCH', f'/clients/{probe_id}', {
        'leadStage': 'CONTACTED',
        'priority': 'HIGH',
        'notes': 'Called back; wants KTEB to KMIA in November.',
        'preferences': {'catering': 'None requested', 'preferredAirports': ['KTEB', 'KMIA']},
    })))
    captured += bool(set_body(ex['404 · Not found or out of scope'], *owner.request('PATCH', f'/clients/{UNKNOWN_ID}', {'priority': 'LOW'})))

    # 08 · Remove several clients — captured before the single delete so the
    # probe is still live for it.
    ex = examples('08 · Remove several clients (soft)')
    captured += bool(set_body(ex['200 · Removed'], *owner.request('POST', '/clients/bulk-delete', {'ids': [probe_id]})))
    captured += bool(set_body(ex['200 · Already removed (partial)'], *owner.request('POST', '/clients/bulk-delete', {'ids': [probe_id]})))
    captured += bool(set_body(ex['400 · Nothing selected'], *owner.request('POST', '/clients/bulk-delete', {'ids': []})))
    captured += bool(set_body(ex['403 · Brokers cannot remove clients'], *broker.request('POST', '/clients/bulk-delete', {'ids': [probe_id]})))

    # 09 · Restore several clients
    ex = examples('09 · Restore several clients')
    captured += bool(set_body(ex['200 · Restored'], *owner.request('POST', '/clients/bulk-restore', {'ids': [probe_id]})))
    captured += bool(set_body(ex['200 · Already live (partial)'], *owner.request('POST', '/clients/bulk-restore', {'ids': [probe_id]})))

    # 06 · Delete client (soft)
    ex = examples('06 · Delete client (soft)')
    captured += bool(set_body(ex['403 · Broker lacks permission'], *broker.request('DELETE', f'/clients/{probe_id}')))
    captured += bool(set_body(ex['404 · Not found'], *owner.request('DELETE', f'/clients/{UNKNOWN_ID}')))
    delete_status, delete_body = owner.request('DELETE', f'/clients/{probe_id}')
    deleted_example = ex.get('204 · Deleted') or ex.get('200 · Deleted')
    deleted_example['name'] = f'{delete_status} · Deleted'
    captured += bool(set_body(deleted_example, delete_status, delete_body))

    # 07 · Restore client
    ex = examples('07 · Restore client')
    captured += bool(set_body(ex['200 · Restored'], *owner.request('POST', f'/clients/{probe_id}/restore')))

    # Teardown. There is no hard delete in this system by design, so the run
    # cannot erase its own row; archiving it is the best available end state.
    owner.request('DELETE', f'/clients/{probe_id}')
    print(f'probe {probe_id} archived')

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f'recaptured {captured} examples in {folder["name"]}')


if __name__ == '__main__':
    main()
