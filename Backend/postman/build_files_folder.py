#!/usr/bin/env python3
"""
Builds the `11 · Files` folder, capturing every example live.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_files_folder.py

Examples are captured, never typed. A hand-written example drifts from the
response the moment a field is added, and the collection is a deliverable —
the whole point is that what it shows is what the API actually returns.

Re-runnable: every file it uploads is archived at the end, so running it twice
does not grow the document store.

The uploads are real multipart requests against the two fixtures in
`postman/fixtures/`, which are genuine PDF and PNG files rather than stubs —
the API sniffs the bytes, so a placeholder would be refused with a 415.
"""

import json
import mimetypes
import pathlib
import urllib.error
import urllib.request
import uuid
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
HERE = pathlib.Path(__file__).parent
COLLECTION = HERE / 'Tribeca-Jets-API.postman_collection.json'
PASSWORD = 'ChangeMe123!'
MISSING = '00000000-0000-4000-8000-000000000000'

DOCUMENT = HERE / 'fixtures' / 'sample-document.pdf'
PHOTO = HERE / 'fixtures' / 'sample-photo.png'

# Paths as the collection references them: relative to the backend directory,
# which is where `npm run test:api` runs newman from.
DOCUMENT_SRC = 'postman/fixtures/sample-document.pdf'
PHOTO_SRC = 'postman/fixtures/sample-photo.png'


class Session:
    """A cookie-backed caller, echoing the CSRF cookie the way the app does."""

    def __init__(self, email: str) -> None:
        self.jar = CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )
        self.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})

    @property
    def csrf(self) -> str:
        for cookie in self.jar:
            if cookie.name == 'tj_csrf':
                return cookie.value or ''
        return ''

    def _send(self, req):
        """Returns (status, parsed body). Errors are captured, not raised."""
        req.add_header('X-CSRF-Token', self.csrf)
        try:
            with self.opener.open(req) as response:
                raw = response.read()
                if not raw:
                    return response.status, None
                try:
                    return response.status, json.loads(raw.decode())
                except UnicodeDecodeError:
                    # A download. The bytes are not an example we can print.
                    return response.status, {'bytes': len(raw)}
        except urllib.error.HTTPError as error:
            raw = error.read().decode()
            try:
                return error.code, json.loads(raw)
            except json.JSONDecodeError:
                return error.code, raw

    def request(self, method: str, path: str, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(BASE + path, data=data, method=method)
        if data is not None:
            req.add_header('Content-Type', 'application/json')
        return self._send(req)

    def upload(self, path: pathlib.Path, fields: dict, declared: str | None = None):
        """A real multipart/form-data POST, so the sniffer sees real bytes."""
        boundary = f'----tribeca{uuid.uuid4().hex}'
        parts = []
        for key, value in fields.items():
            parts.append(
                f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"'
                f'\r\n\r\n{value}\r\n'.encode()
            )
        content_type = declared or mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{path.name}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()
            + path.read_bytes()
            + b'\r\n'
        )
        parts.append(f'--{boundary}--\r\n'.encode())

        req = urllib.request.Request(BASE + '/files', data=b''.join(parts), method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        return self._send(req)


STATUS_TEXT = {
    200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
    401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
    413: 'Payload Too Large', 415: 'Unsupported Media Type',
}


def example(name, method, path, status, body, form=None, req_body=None):
    """One Postman response example, carrying the request that produced it."""
    original = {
        'method': method,
        'header': [],
        'url': {
            'raw': '{{baseUrl}}' + path,
            'host': ['{{baseUrl}}'],
            'path': [p for p in path.lstrip('/').split('/') if p and '?' not in p],
        },
    }
    if form is not None:
        original['body'] = {'mode': 'formdata', 'formdata': form}
    elif req_body is not None:
        original['body'] = {'mode': 'raw', 'raw': json.dumps(req_body, indent=2)}

    return {
        'name': name,
        'originalRequest': original,
        'status': STATUS_TEXT[status],
        'code': status,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [],
        'body': '' if body is None else json.dumps(body, indent=2, ensure_ascii=False),
    }


def script(listen: str, lines: list[str]):
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


CSRF_HEADER = {
    'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
    'description': 'Required on every write. Captured automatically after any login or refresh.',
}
JSON_HEADERS = [{'key': 'Content-Type', 'value': 'application/json'}, CSRF_HEADER]



def ensure_refs():
    """
    Fetches what request 03 and 05 need if nothing upstream has set it.

    A folder has to pass on its own, not only inside a full run: `{{userId}}`
    and `{{aircraftId}}` happen to be set by folders 04 and 07, so running this
    folder alone would send empty strings and fail validation — which reports a
    false failure to anyone debugging one folder, and that is how a real
    failure gets ignored.
    """
    return script('prerequest', [
        "const base = pm.collectionVariables.get('baseUrl');",
        "",
        "if (!pm.collectionVariables.get('userId')) {",
        "    pm.sendRequest({ url: base + '/users?limit=1', method: 'GET' }, (err, res) => {",
        "        if (!err && res.code === 200) {",
        "            pm.collectionVariables.set('userId', res.json().data[0].id);",
        "        }",
        "    });",
        "}",
        "",
        "if (!pm.collectionVariables.get('aircraftId')) {",
        "    pm.sendRequest({ url: base + '/aircraft?limit=1', method: 'GET' }, (err, res) => {",
        "        if (!err && res.code === 200) {",
        "            pm.collectionVariables.set('aircraftId', res.json().data[0].id);",
        "        }",
        "    });",
        "}",
    ])


def formdata(category, *, owner_user=None, aircraft=None, src=DOCUMENT_SRC,
             label=None, notes=None):
    """The multipart body Postman sends, with each field described."""
    rows = [{
        'key': 'file', 'type': 'file', 'src': src,
        'description': (
            'required · the bytes. The content type is read from these, NOT from the '
            'part header — a sender-chosen type would decide what the download route '
            'later hands a browser. Renaming a file changes nothing.'),
    }, {
        'key': 'category', 'value': category, 'type': 'text',
        'description': (
            'required · USER_DOCUMENT | RESOURCE | AIRCRAFT_PHOTO. Case-sensitive. '
            'This single field decides who may read the file, who may replace it, '
            'which formats are accepted and how large it may be.'),
    }]
    if owner_user is not None:
        rows.append({
            'key': 'ownerUserId', 'value': owner_user, 'type': 'text',
            'description': (
                'required for USER_DOCUMENT, rejected for every other category · uuid of '
                'a live user. Whose personal folder this lands in.'),
        })
    if aircraft is not None:
        rows.append({
            'key': 'aircraftId', 'value': aircraft, 'type': 'text',
            'description': (
                'required for AIRCRAFT_PHOTO, rejected for every other category · uuid of '
                'a live aircraft.'),
        })
    if label is not None:
        rows.append({
            'key': 'label', 'value': label, 'type': 'text',
            'description': 'optional · max 200 chars. Shown instead of the filename where given.',
        })
    if notes is not None:
        rows.append({
            'key': 'notes', 'value': notes, 'type': 'text',
            'description': 'optional · max 5000 chars.',
        })
    return rows


UPDATE_BODY = """{
  // Every field optional — this is a PATCH. Send only what changed; null clears.
  //
  // Only these two. The bytes, the `category` and the owner are immutable:
  // re-categorising a stored file would move it between access rules without
  // anybody re-reading it, so replacing a document means uploading a new one
  // and archiving the old — which is also the only version history this table
  // keeps.
  "label": "2025 Form 1099-NEC (corrected)",   // optional · max 200 chars, or null
  "notes": "Supersedes the copy issued in January."   // optional · max 5000 chars, or null
}"""

BULK_BODY = """{
  // 1-100 uuids. Duplicates are removed rather than rejected.
  //
  // Ids that match nothing, that the caller cannot see, or whose category the
  // caller cannot write come back in `skipped` rather than failing the batch:
  // a mixed selection must not force a choice between revealing which rows
  // exist and refusing the whole action.
  "ids": ["{{fileId}}", "{{photoId}}"]
}"""

SORTABLE = 'createdAt | updatedAt | filename | size | category'
CATEGORIES = 'USER_DOCUMENT | RESOURCE | AIRCRAFT_PHOTO'


def query_params():
    return [
        {'key': 'page', 'value': '1', 'description': 'integer ≥ 1 · default 1'},
        {'key': 'limit', 'value': '10', 'description': 'integer 1-100 · default 10'},
        {'key': 'search', 'value': None, 'disabled': True,
         'description': 'string 1-200 chars · case-insensitive, across filename and label'},
        {'key': 'sortBy', 'value': None, 'disabled': True,
         'description': f'{SORTABLE} · default createdAt'},
        {'key': 'sortOrder', 'value': None, 'disabled': True,
         'description': 'asc | desc · default desc, so the newest upload is first'},
        {'key': 'category', 'value': None, 'disabled': True,
         'description': f'{CATEGORIES} · case-sensitive. Naming a category this role cannot read at all returns 403, not an empty list.'},
        {'key': 'ownerUserId', 'value': None, 'disabled': True,
         'description': "uuid · one user's personal folder"},
        {'key': 'aircraftId', 'value': None, 'disabled': True,
         'description': "uuid · one aircraft's photographs"},
        {'key': 'archived', 'value': None, 'disabled': True,
         'description': 'true | false · default false. `true` serves the Archived tab, and returns ONLY archived rows.'},
    ]


def build(admin, broker, assistant):
    users = admin.request('GET', '/users?limit=100')[1]['data']
    mark = next(u for u in users if u['email'] == 'mark@tribecajets.com')
    aircraft = admin.request('GET', '/aircraft?limit=1')[1]['data'][0]

    created = []

    def keep(response):
        if isinstance(response, dict) and response.get('success'):
            created.append(response['data']['id'])
        return response

    # ---- Captured live ----------------------------------------------------
    doc = keep(admin.upload(DOCUMENT, {
        'category': 'USER_DOCUMENT', 'ownerUserId': mark['id'],
        'label': '2025 Form 1099-NEC',
    })[1])
    doc_id = doc['data']['id']

    resource = keep(admin.upload(DOCUMENT, {
        'category': 'RESOURCE', 'label': 'Tribeca Jets brochure',
    })[1])
    resource_id = resource['data']['id']

    photo = keep(broker.upload(PHOTO, {
        'category': 'AIRCRAFT_PHOTO', 'aircraftId': aircraft['id'],
        'label': f"{aircraft['tailNumber']} cabin",
    })[1])
    photo_id = photo['data']['id']

    listed = admin.request('GET', '/files?limit=5')[1]
    stats = admin.request('GET', '/files/stats')[1]
    one = admin.request('GET', f'/files/{doc_id}')[1]

    # The refusals, each captured from a real attempt.
    _, wrong_format = admin.upload(PHOTO, {
        'category': 'USER_DOCUMENT', 'ownerUserId': mark['id'],
    })
    _, lying_header = admin.upload(
        PHOTO, {'category': 'USER_DOCUMENT', 'ownerUserId': mark['id']},
        declared='application/pdf')
    _, broker_publish = broker.upload(DOCUMENT, {'category': 'RESOURCE'})
    _, owner_mismatch = admin.upload(DOCUMENT, {
        'category': 'RESOURCE', 'ownerUserId': mark['id'],
    })
    _, missing_owner = admin.upload(DOCUMENT, {'category': 'USER_DOCUMENT'})
    _, other_brokers_doc = assistant.request('GET', f'/files/{doc_id}')
    _, not_found = admin.request('GET', f'/files/{MISSING}')

    renamed = admin.request('PATCH', f'/files/{resource_id}', {
        'label': 'Tribeca Jets brochure (2026)',
        'notes': 'Replaces the 2025 edition.',
    })[1]

    _, removed = admin.request('DELETE', f'/files/{photo_id}')
    restored = admin.request('POST', f'/files/{photo_id}/restore')[1]
    bulk_removed = admin.request('POST', '/files/bulk-delete',
                                 {'ids': [photo_id, MISSING]})[1]
    bulk_restored = admin.request('POST', '/files/bulk-restore',
                                  {'ids': [photo_id, MISSING]})[1]

    # A broker asked to archive a company resource: a capability failure, and
    # therefore a 403 rather than the 404 a *read* failure earns.
    _, broker_delete = broker.request('DELETE', f'/files/{resource_id}')

    items = [
        {
            'name': '01 · List files',
            'request': {
                'method': 'GET',
                'header': [],
                'url': {
                    'raw': '{{baseUrl}}/files?page=1&limit=10',
                    'host': ['{{baseUrl}}'], 'path': ['files'],
                    'query': query_params(),
                },
                'description': (
                    'Returns only what the caller may see, and the three categories differ '
                    'genuinely:\n\n- **RESOURCE** — every signed-in caller.\n- **USER_DOCUMENT** '
                    '— an administrator, or the person whose folder it is. A broker sees their '
                    'own 1099 and nobody else’s, and another broker’s does not appear here at '
                    'all.\n- **AIRCRAFT_PHOTO** — anyone who may read the fleet.\n\nThat is why '
                    'two roles legitimately get different totals from the same request.'),
            },
            'response': [
                example('One page of files', 'GET', '/files?page=1&limit=10', 200, listed),
            ],
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('200 and an envelope', () => {",
                "  pm.response.to.have.status(200);",
                "  pm.expect(body.success).to.be.true;",
                "  pm.expect(body.meta).to.have.property('total');",
                "});",
                "pm.test('storageKey never leaves the service', () => {",
                "  pm.expect(pm.response.text()).to.not.include('storageKey');",
                "});",
            ])],
        },
        {
            'name': '02 · File counts',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/files/stats', 'host': ['{{baseUrl}}'],
                        'path': ['files', 'stats']},
                'description': (
                    'Counts for the tiles above a file list, scoped to what the caller may '
                    'see — so an administrator and a broker legitimately disagree.'),
            },
            'response': [example('Counts', 'GET', '/files/stats', 200, stats)],
            'event': [script('test', [
                "pm.test('200', () => pm.response.to.have.status(200));",
            ])],
        },
        {
            'name': '03 · File a document in a user’s folder',
            'request': {
                'method': 'POST',
                'header': [CSRF_HEADER],
                'body': {'mode': 'formdata',
                         'formdata': formdata('USER_DOCUMENT', owner_user='{{userId}}',
                                              label='2025 Form 1099-NEC')},
                'url': {'raw': '{{baseUrl}}/files', 'host': ['{{baseUrl}}'], 'path': ['files']},
                'description': (
                    'The client’s example: a broker earns commission, the company issues them a '
                    '1099, and it goes in their personal folder.\n\n**The most sensitive rows in '
                    'the system.** Only an administrator may file one, and only an administrator '
                    'or the person it belongs to may read it — a broker of identical rank at the '
                    'next desk gets a **404**, not a 403, because a 403 would confirm the '
                    'document exists and turn a list of user ids into a register of who has been '
                    'paid.\n\nAccepts PDF, DOCX, XLSX, TXT and CSV up to 25 MB. Refuses SVG '
                    '(a document that executes script), archives, and legacy `.doc`/`.xls` '
                    '(byte-identical at the header, so they cannot be told apart, and they are '
                    'the macro-bearing formats).\n\nThe `file` part points at '
                    '`postman/fixtures/sample-document.pdf`, resolved relative to the backend '
                    'directory — which is where `npm run test:api` runs newman from.'),
            },
            'response': [
                example('Filed against the broker', 'POST', '/files', 201, doc,
                        form=formdata('USER_DOCUMENT', owner_user=mark['id'],
                                      label='2025 Form 1099-NEC')),
                example('A photograph is not a document', 'POST', '/files', 415, wrong_format,
                        form=formdata('USER_DOCUMENT', owner_user=mark['id'], src=PHOTO_SRC)),
                example('Renaming a PNG to .pdf changes nothing', 'POST', '/files', 415,
                        lying_header,
                        form=formdata('USER_DOCUMENT', owner_user=mark['id'], src=PHOTO_SRC)),
                example('A personal document needs an owner', 'POST', '/files', 400,
                        missing_owner, form=formdata('USER_DOCUMENT')),
                example('A broker may not file one at all', 'POST', '/files', 403,
                        broker_publish, form=formdata('RESOURCE')),
            ],
            'event': [ensure_refs(), script('test', [
                "const body = pm.response.json();",
                "pm.test('201 and a stored file', () => {",
                "  pm.response.to.have.status(201);",
                "  pm.expect(body.data.category).to.eql('USER_DOCUMENT');",
                "});",
                "pm.test('the sniffed type is stored, not the part header', () => {",
                "  pm.expect(body.data.contentType).to.eql('application/pdf');",
                "});",
                "pm.collectionVariables.set('fileId', body.data.id);",
            ])],
        },
        {
            'name': '04 · Publish a company resource',
            'request': {
                'method': 'POST',
                'header': [CSRF_HEADER],
                'body': {'mode': 'formdata',
                         'formdata': formdata('RESOURCE', label='Tribeca Jets brochure')},
                'url': {'raw': '{{baseUrl}}/files', 'host': ['{{baseUrl}}'], 'path': ['files']},
                'description': (
                    'Company-wide material: the brochure, the aircraft category guide, the '
                    'referral programme terms, marketing collateral.\n\nReadable by everyone '
                    'signed in — that is what publishing means — and writable only by an '
                    'administrator, through `MANAGE_RESOURCES`. That is deliberately its own '
                    'permission rather than borrowing `MANAGE_USERS`: filing a broker’s 1099 and '
                    'publishing a marketing PDF are different acts on different audiences, and '
                    'the referral-agent portal will need to grant the second to a role that must '
                    'never have the first.\n\nAccepts documents and images up to 50 MB. A '
                    'resource belongs to the company, so sending an `ownerUserId` is refused '
                    'rather than ignored — silently dropping it would publish company-wide a '
                    'file the uploader believed they had filed against one person.'),
            },
            'response': [
                example('Published', 'POST', '/files', 201, resource,
                        form=formdata('RESOURCE', label='Tribeca Jets brochure')),
                example('A resource belongs to nobody', 'POST', '/files', 400, owner_mismatch,
                        form=formdata('RESOURCE', owner_user=mark['id'])),
            ],
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('201, owned by the company', () => {",
                "  pm.response.to.have.status(201);",
                "  pm.expect(body.data.ownerUserId).to.be.null;",
                "});",
                "pm.collectionVariables.set('resourceFileId', body.data.id);",
            ])],
        },
        {
            'name': '05 · Add a photograph of a tail',
            'request': {
                'method': 'POST',
                'header': [CSRF_HEADER],
                'body': {'mode': 'formdata',
                         'formdata': formdata('AIRCRAFT_PHOTO', aircraft='{{aircraftId}}',
                                              src=PHOTO_SRC, label='Cabin')},
                'url': {'raw': '{{baseUrl}}/files', 'host': ['{{baseUrl}}'], 'path': ['files']},
                'description': (
                    'Cabin and exterior photographs, for quotes and itineraries (the client’s '
                    '"stock image database").\n\nFollows the fleet’s own permission exactly: '
                    'whoever may edit a tail may photograph it, and an assistant who may read '
                    'the fleet may see the pictures. A separate permission here would mean a '
                    'broker could rename a tail but not photograph it, which nobody could '
                    'explain.\n\nImages only — JPEG, PNG, WEBP, GIF — up to 15 MB. **SVG is '
                    'refused**: it is a document that executes script, and serving one from the '
                    'API’s own origin is stored XSS wearing an image’s clothes.'),
            },
            'response': [
                example('Added to the fleet', 'POST', '/files', 201, photo,
                        form=formdata('AIRCRAFT_PHOTO', aircraft=aircraft['id'],
                                      src=PHOTO_SRC, label='Cabin')),
            ],
            'event': [ensure_refs(), script('test', [
                "const body = pm.response.json();",
                "pm.test('201 and linked to the aircraft', () => {",
                "  pm.response.to.have.status(201);",
                "  pm.expect(body.data.aircraftId).to.not.be.null;",
                "});",
                "pm.collectionVariables.set('photoId', body.data.id);",
            ])],
        },
        {
            'name': '06 · Get one file',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/files/{{fileId}}', 'host': ['{{baseUrl}}'],
                        'path': ['files', '{{fileId}}']},
                'description': (
                    'Metadata only — the bytes come from request 07.\n\nArchived files are '
                    'returned, with their archive trail, because the Archived tab links straight '
                    'here; excluding them would list a row and then 404 it.\n\n`storageKey` is '
                    'never in the payload. It is the address of the bytes, and every permission '
                    'check in this module assumes reaching them means going through a route that '
                    're-checks it — a key in a JSON response is that check bypassed.'),
            },
            'response': [
                example('The file', 'GET', '/files/{{fileId}}', 200, one),
                example('Another broker’s personal document', 'GET', '/files/{{fileId}}', 404,
                        other_brokers_doc),
                example('No such file', 'GET', f'/files/{MISSING}', 404, not_found),
            ],
            'event': [script('test', [
                "pm.test('200', () => pm.response.to.have.status(200));",
                "pm.test('no storage key', () => {",
                "  pm.expect(pm.response.text()).to.not.include('storageKey');",
                "});",
            ])],
        },
        {
            'name': '07 · Download a file',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/files/{{fileId}}/download',
                        'host': ['{{baseUrl}}'], 'path': ['files', '{{fileId}}', 'download']},
                'description': (
                    'Streams the stored bytes with the content type **detected at upload**, never '
                    'one supplied by a caller.\n\nImages are served `inline` so a photograph can '
                    'be used in an `<img>`; everything else is `attachment`, which is what stops '
                    'a document being rendered as a page on the API’s own origin. Every response '
                    'carries `X-Content-Type-Options: nosniff`.\n\nSessions are httpOnly cookies, '
                    'so this URL works directly in an `<img src>` — and because it is a route '
                    'rather than a presigned link, permission is re-checked on every fetch '
                    'instead of being frozen at the moment the link was minted.\n\nAn archived '
                    'file still downloads: the row is archived, the bytes are not, and refusing '
                    'here would make the Archived tab a list of documents nobody can open.'),
            },
            'response': [],
            'event': [script('test', [
                "pm.test('200 with the stored type', () => {",
                "  pm.response.to.have.status(200);",
                "  pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf');",
                "});",
                "pm.test('a document downloads rather than rendering', () => {",
                "  pm.expect(pm.response.headers.get('Content-Disposition')).to.include('attachment');",
                "  pm.expect(pm.response.headers.get('X-Content-Type-Options')).to.eql('nosniff');",
                "});",
            ])],
        },
        {
            'name': '08 · Rename a file',
            'request': {
                'method': 'PATCH',
                'header': JSON_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/files/{{resourceFileId}}',
                        'host': ['{{baseUrl}}'], 'path': ['files', '{{resourceFileId}}']},
                'description': (
                    'The label and the notes, and nothing else.\n\nThe bytes, the `category` and '
                    'the owner are immutable by design: re-categorising a stored file would move '
                    'it between access rules without anybody re-reading it. Replacing a document '
                    'means uploading a new one and archiving the old — which is also the only '
                    'version history this table keeps.'),
            },
            'response': [
                example('Renamed', 'PATCH', '/files/{{resourceFileId}}', 200, renamed,
                        req_body={'label': 'Tribeca Jets brochure (2026)',
                                  'notes': 'Replaces the 2025 edition.'}),
            ],
            'event': [script('test', [
                "pm.test('200', () => pm.response.to.have.status(200));",
            ])],
        },
        {
            'name': '09 · Remove a file (soft)',
            'request': {
                'method': 'DELETE',
                'header': [CSRF_HEADER],
                'url': {'raw': '{{baseUrl}}/files/{{photoId}}', 'host': ['{{baseUrl}}'],
                        'path': ['files', '{{photoId}}']},
                'description': (
                    'Archives the row and **leaves the object in storage untouched**.\n\nThere is '
                    'no permanent delete in this system, and a restore that could not return the '
                    'same bytes would not be a restore — deleting the object here would quietly '
                    'make the Archived tab a list of files that can never come back. Storage cost '
                    'is the price of that promise.\n\n204, no body. A caller who may read the row '
                    'but not write its category gets 403; one who may not read it at all gets '
                    '404.'),
            },
            'response': [
                example('Archived', 'DELETE', '/files/{{photoId}}', 204, removed),
                example('Not a broker’s to withdraw', 'DELETE', '/files/{{resourceFileId}}', 403,
                        broker_delete),
            ],
            'event': [script('test', [
                "pm.test('204, no body', () => {",
                "  pm.response.to.have.status(204);",
                "  pm.expect(pm.response.text()).to.be.empty;",
                "});",
            ])],
        },
        {
            'name': '10 · Restore an archived file',
            'request': {
                'method': 'POST',
                'header': [CSRF_HEADER],
                'url': {'raw': '{{baseUrl}}/files/{{photoId}}/restore',
                        'host': ['{{baseUrl}}'], 'path': ['files', '{{photoId}}', 'restore']},
                'description': (
                    'Clears the deletion stamp and nothing else — every field comes back '
                    'untouched, because nothing was ever changed.\n\n**200, not 201.** Nest gives '
                    'every POST a 201 by default and a restore creates nothing; it clears a '
                    'stamp on a row that existed all along. A row that is not archived returns '
                    '404.'),
            },
            'response': [
                example('Restored', 'POST', '/files/{{photoId}}/restore', 200, restored),
            ],
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('200, not 201', () => pm.response.to.have.status(200));",
                "pm.test('the deletion stamp is cleared', () => {",
                "  pm.expect(body.data.deletedAt).to.be.null;",
                "  pm.expect(body.data.restoredAt).to.not.be.null;",
                "});",
            ])],
        },
        {
            'name': '11 · Remove several files at once',
            'request': {
                'method': 'POST',
                'header': JSON_HEADERS,
                'body': {'mode': 'raw', 'raw': BULK_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/files/bulk-delete', 'host': ['{{baseUrl}}'],
                        'path': ['files', 'bulk-delete']},
                'description': (
                    'For the table’s checkbox column.\n\nPOST rather than DELETE-with-body: '
                    'request bodies on DELETE are dropped by proxies, and a dropped body removes '
                    'nothing while answering 200.\n\nPartial success is success. Ids that match '
                    'nothing, that the caller cannot see, or whose category the caller cannot '
                    'write come back in `skipped` — a mixed selection must not force a choice '
                    'between revealing which rows exist and refusing the whole action.'),
            },
            'response': [
                example('One archived, one unknown id skipped', 'POST', '/files/bulk-delete', 200,
                        bulk_removed, req_body={'ids': ['{{photoId}}', MISSING]}),
            ],
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('200 and a partial-success report', () => {",
                "  pm.response.to.have.status(200);",
                "  pm.expect(body.data).to.have.property('affected');",
                "  pm.expect(body.data.skipped).to.be.an('array');",
                "});",
            ])],
        },
        {
            'name': '12 · Restore several files at once',
            'request': {
                'method': 'POST',
                'header': JSON_HEADERS,
                'body': {'mode': 'raw', 'raw': BULK_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/files/bulk-restore', 'host': ['{{baseUrl}}'],
                        'path': ['files', 'bulk-restore']},
                'description': (
                    'The mirror of request 11, for the Archived tab’s checkbox column. Same '
                    'body, same partial-success rule — ids that are not archived are reported as '
                    '`skipped` rather than failing the batch, so two people restoring the same '
                    'selection both succeed.'),
            },
            'response': [
                example('One restored, one unknown id skipped', 'POST', '/files/bulk-restore', 200,
                        bulk_restored, req_body={'ids': ['{{photoId}}', MISSING]}),
            ],
            'event': [script('test', [
                "pm.test('200', () => pm.response.to.have.status(200));",
            ])],
        },
        {
            'name': '13 · Teardown — archive this run’s uploads',
            'request': {
                'method': 'POST',
                'header': JSON_HEADERS,
                'body': {'mode': 'raw',
                         'raw': '{\n  "ids": ["{{fileId}}", "{{resourceFileId}}", "{{photoId}}"]\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/files/bulk-delete', 'host': ['{{baseUrl}}'],
                        'path': ['files', 'bulk-delete']},
                'description': (
                    'The run is a demonstration, not a data entry session.\n\nWithout this, every '
                    'pass would leave three more files in the store — which is exactly how 26 of '
                    '28 "live" clients turned out to be Postman debris. There is no hard delete '
                    'by design, so archiving the probes is the correct end state: they sit in the '
                    'Archived tab rather than among the documents anybody works with.'),
            },
            'response': [],
            'event': [script('test', [
                "pm.test('the run leaves nothing behind', () => pm.response.to.have.status(200));",
                "pm.collectionVariables.set('fileId', '');",
                "pm.collectionVariables.set('resourceFileId', '');",
                "pm.collectionVariables.set('photoId', '');",
            ])],
        },
    ]

    # Leave nothing behind from the capture itself, for the same reason.
    for file_id in created:
        admin.request('DELETE', f'/files/{file_id}')

    return {
        'name': '11 · Files',
        'description': (
            'Every document the desk keeps, in one table and one bucket: a broker’s tax forms, '
            'the company’s published resources, photographs of a tail.\n\n**`category` is the '
            'whole authorization model.** A 1099 and a marketing brochure are both rows here and '
            'are not remotely the same secret, so the permission that governs a file is a '
            'property of the file, not of the route. That is why these endpoints carry no blanket '
            'permission decorator — the check happens in the service, against the same matrix '
            'every other module uses:\n\n| Category | Who may read | Who may write |\n'
            '|---|---|---|\n| `USER_DOCUMENT` | the owner, or `MANAGE_USERS` | `MANAGE_USERS` |\n'
            '| `RESOURCE` | everyone signed in | `MANAGE_RESOURCES` |\n'
            '| `AIRCRAFT_PHOTO` | `MANAGE_AIRCRAFT` | `MANAGE_AIRCRAFT` |\n\n**Reads that fail '
            'answer 404, writes that fail answer 403.** A 403 on a read would confirm the row '
            'exists, and for a personal document that turns a list of user ids into a register of '
            'who has been paid.\n\n**The content type is read from the bytes**, never from the '
            'upload header — see requests 03 and 07 for what that prevents. SVG, archives and '
            'legacy `.doc`/`.xls` are refused outright.\n\nThe two uploads use fixtures in '
            '`postman/fixtures/`, referenced relative to the backend directory. They are real PDF '
            'and PNG files rather than placeholders, because the API sniffs them.\n\nEvery '
            'request is signed in as the seeded SUPER_ADMIN by the folder’s pre-request script, '
            'except the 403 and 404 examples, captured as the seeded broker and assistant.'),
        'item': items,
    }


def main() -> None:
    admin = Session('admin@tribecajets.com')
    broker = Session('mark@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    collection = json.loads(COLLECTION.read_text())

    quotes_folder = next(f for f in collection['item'] if f['name'].startswith('10'))
    folder = build(admin, broker, assistant)
    folder['event'] = json.loads(json.dumps(quotes_folder['event']))

    collection['item'] = [
        f for f in collection['item'] if not f['name'].startswith('11 · Files')
    ]
    collection['item'].append(folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('fileId', 'resourceFileId', 'photoId', 'userId', 'aircraftId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    # Two-space indent, matching how Postman itself writes the file — anything
    # else reformats all 9,000 lines.
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
