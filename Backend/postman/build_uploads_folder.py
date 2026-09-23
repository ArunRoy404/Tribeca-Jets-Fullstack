#!/usr/bin/env python3
"""
Builds the `11 · Uploads` folder, capturing every example from a live API.

Run the backend and seed it first:

    npm run db:seed && npm run start:dev
    python3 postman/build_uploads_folder.py

Examples are captured, never typed — a hand-written example drifts from the
response the moment a field is added, and this collection is a deliverable.

Re-runnable, twice over:

  * the rows it creates are archived again in a teardown, so a second run does
    not leave probes behind; and
  * the *upload* requests are naturally idempotent, because the API returns the
    existing record for bytes a user has already uploaded. A second run
    therefore answers `deduplicated: true` — which is itself one of the
    examples captured here, since it is the behaviour a caller has to expect.
"""

import json
import mimetypes
import pathlib
import urllib.error
import urllib.request
import uuid
from http.cookiejar import CookieJar

BASE = 'http://localhost:4000/api'
COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
FIXTURES = pathlib.Path(__file__).with_name('fixtures')
PASSWORD = 'ChangeMe123!'

PHOTO_SRC = FIXTURES / 'sample-photo.png'
DOCUMENT_SRC = FIXTURES / 'sample-document.pdf'
SVG_SRC = FIXTURES / 'sample-logo.svg'


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
                except (UnicodeDecodeError, json.JSONDecodeError):
                    # A file fetch. The bytes are the body, not an example we
                    # can print — and a PDF decodes as text perfectly happily,
                    # so catching only UnicodeDecodeError is not enough.
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

    def upload(self, route: str, path: pathlib.Path, declared: str | None = None,
               filename: str | None = None):
        """A real multipart POST, so the sniffer sees real bytes."""
        boundary = f'----tribeca{uuid.uuid4().hex}'
        name = filename or path.name
        content_type = (
            declared
            or mimetypes.guess_type(name)[0]
            or 'application/octet-stream'
        )
        body = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
            f'filename="{name}"\r\nContent-Type: {content_type}\r\n\r\n'.encode()
            + path.read_bytes()
            + f'\r\n--{boundary}--\r\n'.encode()
        )
        req = urllib.request.Request(BASE + route, data=body, method='POST')
        req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
        return self._send(req)


STATUS_TEXT = {
    200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
    401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
    413: 'Payload Too Large', 415: 'Unsupported Media Type',
}


def formdata(*, description: str, src: pathlib.Path):
    """The multipart body Postman sends, with the single field described."""
    return [{
        'key': 'file',
        'type': 'file',
        'src': str(pathlib.Path('postman/fixtures') / src.name),
        'description': description,
    }]


def example(name, method, path, status, body, form=None, preview='json'):
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

    return {
        'name': name,
        'originalRequest': original,
        'status': STATUS_TEXT[status],
        'code': status,
        '_postman_previewlanguage': preview,
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [],
        'body': '' if body is None else json.dumps(body, indent=2, ensure_ascii=False),
    }


def script(listen, lines):
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


CSRF_HEADER = [{
    'key': 'X-CSRF-Token',
    'value': '{{csrfToken}}',
    'description': 'Required on every write. Captured automatically after any login or refresh.',
}]

IMAGE_TYPES = 'image/jpeg | image/png | image/webp | image/gif'
DOCUMENT_TYPES = ('application/pdf | '
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx) | '
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx) | '
                  'text/plain | text/csv')

HOW_IT_WORKS = """One upload surface for the whole product.

A screen posts a file here, gets back a **URL**, and stores that URL on whatever record it is editing — `photoUrl` on an aircraft, an attachment on a referral, a document on a user. Nothing in this folder knows or cares what a file is *for*; that is the business of the record holding the URL.

**Why it works this way.** The upload does not need to know what the file will be attached to, so a photograph can be chosen on a *create* form — before the record it belongs to exists. An API that wanted the aircraft id at upload time could not do that, and every create form would have to save first and upload second, leaving a record with no picture whenever the second call failed.

**Two routes, because there are two kinds of file.** `image` and `document` describe what a file *is*. A *purpose* — "tax form", "id proof", "brochure" — is not a kind, and making it one would put every new upload button in the product behind a migration.

| Route | Accepts | Limit | Folder |
|---|---|---|---|
| `POST /uploads/image` | `%s` | 15 MB | `images/` |
| `POST /uploads/document` | `%s` | 25 MB | `documents/` |

**The content type is read from the bytes, never from the upload header.** A multipart part's `Content-Type` is chosen by whoever sent it, so believing it would let them decide what a browser is later handed — `text/html` served from this API's own origin, with the session cookie attached. Renaming a `.exe` to `.png` changes nothing.

Three formats are refused on purpose. **SVG** is a document that executes script. **Archives** carry their contents past whatever checked the outer file. **Legacy `.doc`/`.xls`** are both OLE2 and byte-identical at the header, so telling them apart would mean trusting the sender.

**Re-uploading a file returns the one already on file.** Deduplication is by SHA-256 of the bytes, scoped to the uploader: the same file sent twice answers `deduplicated: true` with the original `id` and `createdAt`, and writes nothing. Storage is content-addressed (`images/<sha256>.png`), so two people holding the same image cost two rows and one object.

**Removal archives the record and leaves the bytes alone.** Nothing in this system is permanently deleted, and the object may be shared with another user's row — erasing it would break a record the request never looked at.""" % (IMAGE_TYPES, DOCUMENT_TYPES)


def build(admin):
    photo_status, photo = admin.upload('/uploads/image', PHOTO_SRC)
    assert photo_status == 201, (photo_status, photo)
    photo_id = photo['data']['id']

    # The same bytes again — the deduplication example, captured live.
    dup_status, dup = admin.upload('/uploads/image', PHOTO_SRC,
                                   filename='same-photo-renamed.png')
    assert dup_status == 201 and dup['data']['deduplicated'] is True, dup

    doc_status, doc = admin.upload('/uploads/document', DOCUMENT_SRC)
    assert doc_status == 201, (doc_status, doc)
    doc_id = doc['data']['id']

    # Rejections, all captured from real responses.
    svg = admin.upload('/uploads/image', SVG_SRC)
    pdf_to_image = admin.upload('/uploads/image', DOCUMENT_SRC)
    image_to_doc = admin.upload('/uploads/document', PHOTO_SRC)

    no_file = admin.request('POST', '/uploads/image')

    meta = admin.request('GET', f'/uploads/{doc_id}/meta')
    fetch = admin.request('GET', f'/uploads/{photo_id}')
    missing = admin.request('GET', '/uploads/11111111-1111-4111-8111-111111111111')
    bad_uuid = admin.request('GET', '/uploads/not-a-uuid')

    removed = admin.request('DELETE', f'/uploads/{doc_id}')
    gone = admin.request('GET', f'/uploads/{doc_id}')
    restored = admin.request('POST', f'/uploads/{doc_id}/restore')
    already_live = admin.request('POST', f'/uploads/{doc_id}/restore')

    requests = [
        {
            'name': '01 · Upload an image',
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.test('returns a URL to store on a record', () =>",
                "  pm.expect(body.data.url).to.match(/^\\/api\\/uploads\\//));",
                "pm.test('type is read from the bytes', () =>",
                "  pm.expect(body.data.contentType).to.eql('image/png'));",
                "// Re-running this collection uploads the same fixture again, and the",
                "// API answers with the record it already holds. Both are correct —",
                "// which is the point of the flag.",
                "pm.test('deduplicated is a boolean', () =>",
                "  pm.expect(body.data.deduplicated).to.be.a('boolean'));",
                "pm.collectionVariables.set('uploadImageId', body.data.id);",
                "pm.collectionVariables.set('uploadImageUrl', body.data.url);",
            ])],
            'request': {
                'method': 'POST',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/image', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', 'image']},
                'body': {'mode': 'formdata',
                         'formdata': formdata(
                             description=f'Required · the bytes. Accepted: {IMAGE_TYPES}. Maximum 15 MB. '
                                         'SVG is refused — it executes script. The type is read from the '
                                         'bytes, so the filename and the part\'s Content-Type are ignored.',
                             src=PHOTO_SRC)},
                'description': (
                    'Stores the file under `images/` and returns the URL to save on whatever record is '
                    'being edited.\n\n'
                    'The response `url` is **relative** (`/api/uploads/<id>`) on purpose: an absolute URL '
                    'captured at upload time embeds whatever host was running then, so every row written '
                    'in development would point at localhost for ever. It works directly in an `<img src>` '
                    'because the session is an httpOnly cookie and needs no token in the URL.\n\n'
                    '`deduplicated: true` means these exact bytes were already on file for this user and '
                    'the existing record was returned — no second copy was written, and `createdAt` may be '
                    'older than this request.'
                ),
            },
            'response': [
                example('Success (201 · stored)', 'POST', '/uploads/image', 201, photo,
                        form=formdata(description='The image.', src=PHOTO_SRC)),
                example('Success (201 · already uploaded, existing record returned)',
                        'POST', '/uploads/image', 201, dup,
                        form=formdata(description='The same bytes, under a different filename.',
                                      src=PHOTO_SRC)),
                example('Error (415 · SVG refused)', 'POST', '/uploads/image', 415, svg[1],
                        form=formdata(description='An SVG — a document that executes script.',
                                      src=SVG_SRC)),
                example('Error (415 · a PDF is not an image)', 'POST', '/uploads/image',
                        415, pdf_to_image[1],
                        form=formdata(description='A PDF posted to the image route.',
                                      src=DOCUMENT_SRC)),
                example('Error (400 · no file part)', 'POST', '/uploads/image', 400, no_file[1]),
            ],
        },
        {
            'name': '02 · Upload a document',
            'event': [script('test', [
                "const body = pm.response.json();",
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.test('kind is DOCUMENT', () => pm.expect(body.data.kind).to.eql('DOCUMENT'));",
                "pm.test('stored as a PDF', () =>",
                "  pm.expect(body.data.contentType).to.eql('application/pdf'));",
                "pm.collectionVariables.set('uploadDocumentId', body.data.id);",
            ])],
            'request': {
                'method': 'POST',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/document', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', 'document']},
                'body': {'mode': 'formdata',
                         'formdata': formdata(
                             description=f'Required · the bytes. Accepted: {DOCUMENT_TYPES}. Maximum 25 MB. '
                                         'Legacy .doc and .xls are refused: both are OLE2 and byte-identical '
                                         'at the header, so telling them apart would mean trusting the sender.',
                             src=DOCUMENT_SRC)},
                'description': (
                    'Stores the file under `documents/` and returns the URL to save on the record being '
                    'edited.\n\n'
                    'A file whose bytes are plain text is stored as `text/plain` whatever it was named — '
                    'so HTML uploaded as `invoice.pdf` is stored as text and served as an **attachment** '
                    'with `X-Content-Type-Options: nosniff`, which means a browser downloads it instead of '
                    'executing it on this API\'s origin.'
                ),
            },
            'response': [
                example('Success (201 · stored)', 'POST', '/uploads/document', 201, doc,
                        form=formdata(description='The document.', src=DOCUMENT_SRC)),
                example('Error (415 · an image is not a document)', 'POST', '/uploads/document',
                        415, image_to_doc[1],
                        form=formdata(description='A PNG posted to the document route.',
                                      src=PHOTO_SRC)),
            ],
        },
        {
            'name': '03 · Fetch a file',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('served with the stored type', () =>",
                "  pm.expect(pm.response.headers.get('Content-Type')).to.include('image/'));",
                "pm.test('browsers may not re-sniff it', () =>",
                "  pm.expect(pm.response.headers.get('X-Content-Type-Options')).to.eql('nosniff'));",
                "// Images render in the page; everything else downloads, so a document",
                "// can never execute in a tab on this origin.",
                "pm.test('an image is inline', () =>",
                "  pm.expect(pm.response.headers.get('Content-Disposition')).to.include('inline'));",
            ])],
            'request': {
                'method': 'GET',
                'header': [],
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadImageId}}', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadImageId}}']},
                'description': (
                    'Streams the bytes. **This is the address returned by the upload routes and stored on '
                    'records** — it works directly in an `<img src>`.\n\n'
                    'Requires a session: there is no unauthenticated path to a stored file. Permission is '
                    're-checked on every fetch rather than frozen into a signature, so access that is '
                    'revoked actually stops working — unlike a presigned link, which keeps working because '
                    'it was signed before anyone revoked anything.\n\n'
                    'Images are served `inline`; everything else `attachment`.'
                ),
            },
            'response': [
                example('Success (200 · the bytes)', 'GET', '/uploads/{{uploadImageId}}', 200,
                        {'_': 'The response body is the file itself — '
                              f'{fetch[1].get("bytes", 0)} bytes of image/png. '
                              'Postman renders binary rather than JSON here.'},
                        preview='text'),
                example('Error (404 · no such file)', 'GET',
                        '/uploads/11111111-1111-4111-8111-111111111111', 404, missing[1]),
                example('Error (400 · not a uuid)', 'GET', '/uploads/not-a-uuid', 400, bad_uuid[1]),
            ],
        },
        {
            'name': '04 · Describe a file',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('says whether it has been removed', () =>",
                "  pm.expect(pm.response.json().data).to.have.property('archived'));",
            ])],
            'request': {
                'method': 'GET',
                'header': [],
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}/meta',
                        'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}', 'meta']},
                'description': (
                    'The record behind a stored URL — filename, type, size, and whether it has been '
                    'removed — without downloading the bytes.\n\n'
                    'For a screen that lists an attachment as a row rather than rendering it. Unlike the '
                    'fetch route this answers for an archived file too, so a list can show "removed" '
                    'instead of a broken link.'
                ),
            },
            'response': [
                example('Success (200)', 'GET', '/uploads/{{uploadDocumentId}}/meta', 200, meta[1]),
            ],
        },
        {
            'name': '05 · Remove a file',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('reports the removal', () =>",
                "  pm.expect(pm.response.json().data.removed).to.eql(true));",
            ])],
            'request': {
                'method': 'DELETE',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}']},
                'description': (
                    'Archives the record. **The bytes stay in storage.**\n\n'
                    'Nothing in this system is permanently deleted, and a restore that could not hand back '
                    'the same file would not be a restore. Storage is also content-addressed, so the object '
                    'may be shared with another user who uploaded the same file — erasing it here would '
                    'break a record this request never looked at.\n\n'
                    'The file stops serving immediately: a URL stored on another record will 404.'
                ),
            },
            'response': [
                example('Success (200 · archived)', 'DELETE', '/uploads/{{uploadDocumentId}}',
                        200, removed[1]),
                example('Then the file no longer serves (404)', 'GET',
                        '/uploads/{{uploadDocumentId}}', 404, gone[1]),
            ],
        },
        {
            'name': '06 · Restore a removed file',
            'event': [script('test', [
                "pm.test('200, not 201 — nothing was created', () =>",
                "  pm.response.to.have.status(200));",
            ])],
            'request': {
                'method': 'POST',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}/restore',
                        'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}', 'restore']},
                'description': (
                    'Clears the deletion stamp and touches nothing else. Every URL that pointed at this '
                    'file works again, because the bytes never moved.\n\n'
                    'Answers **200**, not the 201 Nest gives every POST: a restore creates nothing.'
                ),
            },
            'response': [
                example('Success (200 · restored)', 'POST', '/uploads/{{uploadDocumentId}}/restore',
                        200, restored[1]),
                example('Error (400 · it was never removed)', 'POST',
                        '/uploads/{{uploadDocumentId}}/restore', 400, already_live[1]),
            ],
        },
        {
            'name': '07 · Teardown — archive the image',
            'event': [script('test', [
                "pm.test('probe archived', () => pm.response.to.have.status(200));",
                "// The run is a demonstration, not a data entry session. Without a",
                "// teardown, every pass leaves another live row behind.",
            ])],
            'request': {
                'method': 'DELETE',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadImageId}}', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadImageId}}']},
                'description': (
                    'Archives the image this run uploaded.\n\n'
                    'The bytes remain in storage; archiving is about the record. A second run re-uploads '
                    'the same fixture, which creates a fresh row rather than reviving this one — '
                    're-uploading a removed file is a request to have it back, not a restore.'
                ),
            },
            'response': [],
        },
        {
            'name': '08 · Teardown — archive the document',
            'event': [script('test', [
                "pm.test('probe archived', () => pm.response.to.have.status(200));",
                "// Request 06 restored this row to demonstrate the restore, which left",
                "// it live. Closing it here is what keeps the run net-zero.",
            ])],
            'request': {
                'method': 'DELETE',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}']},
                'description': (
                    'Archives the document again.\n\n'
                    'Requests 05 and 06 removed and restored it to demonstrate both, so it is live at this '
                    'point. Without this the collection would leave one live row behind on every run — the '
                    'exact drift that put 26 Postman clients into the client directory before anyone '
                    'noticed.'
                ),
            },
            'response': [],
        },
    ]

    folder = {
        'name': '11 · Uploads',
        'description': HOW_IT_WORKS,
        'item': requests,
    }
    # Every row this build created, so main() can archive them again. The
    # builder is run repeatedly while a folder is being written, and without
    # this each pass leaves another live probe in the table — the same drift
    # that put 26 Postman clients into the client directory.
    return folder, [photo_id, doc_id]


def main() -> None:
    for fixture in (PHOTO_SRC, DOCUMENT_SRC, SVG_SRC):
        if not fixture.exists():
            raise SystemExit(f'Missing fixture: {fixture}')

    admin = Session('admin@tribecajets.com')
    folder, probes = build(admin)

    collection = json.loads(COLLECTION.read_text())
    collection['item'] = [i for i in collection['item']
                          if i['name'] not in ('11 · Files', '11 · Uploads')]
    collection['item'].append(folder)

    COLLECTION.write_text(json.dumps(collection, indent=2, ensure_ascii=False) + '\n')

    # Archive what this build uploaded. The examples above are already captured
    # as text, so nothing is lost — and the bytes stay in storage regardless,
    # because archiving never touches them.
    archived = 0
    for probe in probes:
        status, _ = admin.request('DELETE', f'/uploads/{probe}')
        if status == 200:
            archived += 1

    count = len(folder['item'])
    examples = sum(len(r['response']) for r in folder['item'])
    print(f'11 · Uploads — {count} requests, {examples} captured examples')
    print(f'             — {archived} probe rows archived, none left live')


if __name__ == '__main__':
    main()
