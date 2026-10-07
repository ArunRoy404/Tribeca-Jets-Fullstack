#!/usr/bin/env python3
"""
Builds the `11 · Uploads` folder, capturing every example from a live API.

Capture against a second API with `MAIL_DRIVER=log` and its own Redis
database (see README), then tidy the body comments:

    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_uploads_folder.py

Examples are captured, never typed — a hand-written example drifts from the
response the moment a field is added, and this collection is a deliverable.

Rebuilt on `builder_common` for the Uploads review (7 Oct 2026), when role
restrictions came back on: the access examples — another broker refused a
file filed about Mark, a referral agent kept to their own uploads — could not
be captured while every account acted as SUPER_ADMIN.

Re-runnable, twice over:

  * the rows it creates are archived again in a teardown, so a second run does
    not leave probes behind; and
  * the *upload* requests are naturally idempotent, because the API returns the
    existing record for bytes a user has already uploaded. A second run
    therefore answers `deduplicated: true` — which is itself one of the
    examples captured here, since it is the behaviour a caller has to expect.
"""

from __future__ import annotations

import json
import pathlib
import urllib.error
import urllib.request

from builder_common import BASE, FIXTURES, MISSING, Session, copy_folder_login, example, script
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

PHOTO_SRC = FIXTURES / 'sample-photo.png'
DOCUMENT_SRC = FIXTURES / 'sample-document.pdf'
SVG_SRC = FIXTURES / 'sample-logo.svg'
ARCHIVE_SRC = FIXTURES / 'sample-archive.zip'

CSRF_HEADER = [{
    'key': 'X-CSRF-Token',
    'value': '{{csrfToken}}',
    'description': 'Required on every write. Captured automatically after any login or refresh.',
}]

IMAGE_TYPES = 'image/jpeg | image/png | image/webp | image/gif | image/avif'
DOCUMENT_TYPES = ('application/pdf | '
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx) | '
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx) | '
                  'text/plain | text/csv')

VISIBILITY_DESC = (
    'optional · PUBLIC | PRIVATE (case-sensitive). Default PRIVATE. PUBLIC is any signed-in user — '
    'aircraft photographs, brochures, logos. PRIVATE is the uploader, the person named in ownerUserId, '
    'and SUPER_ADMIN / ADMIN. The default fails closed on purpose: the mistake is then a brochure '
    'nobody can see, not a tax form everybody can. A REFERRAL_AGENT may not send PUBLIC (403).'
)

OWNER_DESC = (
    'optional · uuid. The user this document is *about*, who may then read it. This is what files '
    'a 1099 into a broker\'s folder. Naming anyone but yourself needs MANAGE_USERS (SUPER_ADMIN, '
    'ADMIN), or any broker could drop a document into any other broker\'s folder (403).'
)

LABEL_DESC = 'optional · max 200 chars. A human name shown instead of the filename — "2025 Form 1099".'


def formdata(*, description: str, src: pathlib.Path, visibility=None, owner=None, label=None):
    """The multipart body Postman sends, with every field described."""
    form = [{
        'key': 'file',
        'type': 'file',
        # Forward slashes whatever machine runs the builder: a Windows run
        # otherwise writes a backslash path Newman cannot open on macOS/Linux.
        'src': (pathlib.PurePosixPath('postman/fixtures') / src.name).as_posix(),
        'description': description,
    }]
    if visibility is not None:
        form.append({'key': 'visibility', 'value': visibility, 'type': 'text',
                     'description': VISIBILITY_DESC})
    if owner is not None:
        form.append({'key': 'ownerUserId', 'value': owner, 'type': 'text',
                     'description': OWNER_DESC})
    if label is not None:
        form.append({'key': 'label', 'value': label, 'type': 'text',
                     'description': LABEL_DESC})
    return form


def fetch_bytes(session: Session, path: str) -> tuple[int, int]:
    """
    GET a stored file and return (status, byte count).

    `Session.request` parses JSON; a file's body is the file, so it is read
    raw here rather than teaching the shared session about binary bodies.
    """
    req = urllib.request.Request(BASE + path, method='GET')
    try:
        with session.opener.open(req) as response:
            return response.status, len(response.read())
    except urllib.error.HTTPError as error:
        return error.code, 0


HOW_IT_WORKS = """One upload surface for the whole product.

A screen posts a file here, gets back a **URL**, and stores that URL on whatever record it is editing — `photoUrl` on an aircraft, an attachment on a referral, a document in the vault, an avatar. Nothing in this folder knows or cares what a file is *for*; that is the business of the record holding the URL.

**Why it works this way.** The upload does not need to know what the file will be attached to, so a photograph can be chosen on a *create* form — before the record it belongs to exists.

**Two routes, because there are two kinds of file.** `image` and `document` describe what a file *is*. A *purpose* — "tax form", "id proof", "brochure" — is not a kind, and making it one would put every new upload button behind a migration.

| Route | Accepts | Limit | Stored under |
|---|---|---|---|
| `POST /uploads/image` | `%s` — nothing else | 15 MB | `images/<sha256>.<ext>` |
| `POST /uploads/document` | **any file**. `%s` keep their own type; anything else is stored as `application/octet-stream` | 25 MB | `documents/<sha256>.<ext>`, no extension for an unrecognised file |

**The content type is read from the bytes, never from the upload header or the filename.** A multipart part's `Content-Type` is chosen by whoever sent it, so believing it would let them decide what a browser is later handed — `text/html` served from this API's own origin, with the session cookie attached. Images stay strict because they are served `inline`; SVG is never an image, because it executes script. A document the server cannot recognise (a zip, a legacy `.xls`, a scan) is accepted but always served as an **attachment** with `nosniff`, so it is saved to disk and never rendered here.

**Who may open a file — two columns on the row:**

| `visibility` | Who may read it |
|---|---|
| `PUBLIC` | anyone signed in (the photo library, brochures) |
| `PRIVATE` (default) | the uploader · the person named in `ownerUserId` · **SUPER_ADMIN and ADMIN, always** |

Everyone else gets a **404, not a 403** — on fetch, describe and remove alike — because a 403 would confirm the file exists. The administrator rule is the stored role, not a per-person permission. A **REFERRAL_AGENT** is a partner: their uploads are always PRIVATE with no owner (a PUBLIC or filed upload is a 403), and their list holds only their own uploads.

**A folder is a query, not a directory.** A broker's folder is `GET /uploads?ownerUserId=<id>`; the photo library is `?kind=IMAGE&visibility=PUBLIC`. Storage itself is flat and content-addressed — on local disk and on Cloudflare R2 alike — so identical bytes are stored once.

**Re-uploading a file returns the one already on file.** Deduplication is by SHA-256 of the bytes, scoped to the uploader, the owner and the visibility: the same file sent twice answers `deduplicated: true` with the original `id`, and writes nothing.

**Removal archives the record and leaves the bytes alone.** Nothing in this system is permanently deleted, and the object may be shared with another user's row — erasing it would break a record the request never looked at.""" % (IMAGE_TYPES, DOCUMENT_TYPES)


def build(owner: Session, mark: Session, barry: Session, agent: Session, mark_id: str):
    probes: list[tuple[Session, str]] = []

    photo_status, photo = owner.upload('/uploads/image', PHOTO_SRC,
                                       {'visibility': 'PUBLIC', 'label': 'Global 7500 cabin'})
    assert photo_status == 201, (photo_status, photo)
    photo_id = photo['data']['id']
    probes.append((owner, photo_id))

    # The same bytes again, under another name — the deduplication example.
    dup_status, dup = owner.upload('/uploads/image', PHOTO_SRC,
                                   {'visibility': 'PUBLIC', 'label': 'Global 7500 cabin'},
                                   filename='same-photo-renamed.png')
    assert dup_status == 201 and dup['data']['deduplicated'] is True, dup

    # Mark's tax form: the client's own example, and the case where getting
    # the access rule wrong matters.
    doc_status, doc = owner.upload('/uploads/document', DOCUMENT_SRC,
                                   {'ownerUserId': mark_id, 'label': '2025 Form 1099'})
    assert doc_status == 201 and doc['data']['visibility'] == 'PRIVATE', (doc_status, doc)
    doc_id = doc['data']['id']
    probes.append((owner, doc_id))

    # Any file is a document; one the sniffer cannot place is stored opaque.
    zip_status, zipped = owner.upload('/uploads/document', ARCHIVE_SRC,
                                      {'label': 'Fuel receipts, October'})
    assert zip_status == 201 and zipped['data']['contentType'] == 'application/octet-stream', zipped
    probes.append((owner, zipped['data']['id']))

    # A name with accents, as every browser sends it (UTF-8). Kept intact
    # since 7 Oct 2026; it used to be stored as "CotizaciÃ³n".
    named_status, named = owner.upload('/uploads/document', DOCUMENT_SRC,
                                       {'label': 'Signed quote'}, filename='Cotización – Müller.pdf')
    assert named_status == 201 and named['data']['filename'] == 'Cotización – Müller.pdf', named
    probes.append((owner, named['data']['id']))

    # The agent's own attachment, so their list has something in it.
    agent_status, agent_file = agent.upload('/uploads/document', DOCUMENT_SRC,
                                            {'label': 'Client itinerary notes'})
    assert agent_status == 201 and agent_file['data']['visibility'] == 'PRIVATE', agent_file
    probes.append((agent, agent_file['data']['id']))

    listing = owner.request('GET', '/uploads?page=1&limit=10')
    folder = owner.request('GET', f'/uploads?ownerUserId={mark_id}&kind=DOCUMENT&page=1&limit=10')
    library = owner.request('GET', '/uploads?kind=IMAGE&visibility=PUBLIC&page=1&limit=10')
    others_folder = barry.request('GET', f'/uploads?ownerUserId={mark_id}')
    agent_list = agent.request('GET', '/uploads?page=1&limit=10')
    assert all(row['id'] != doc_id for row in agent_list[1]['data']), 'agent list leaked a private file'

    svg = owner.upload('/uploads/image', SVG_SRC)
    pdf_to_image = owner.upload('/uploads/image', DOCUMENT_SRC)
    renamed = owner.upload('/uploads/image', DOCUMENT_SRC, filename='cabin.png', declared='image/png')
    no_file = owner.request('POST', '/uploads/image')
    filed_by_broker = barry.upload('/uploads/document', DOCUMENT_SRC, {'ownerUserId': mark_id})
    agent_public = agent.upload('/uploads/document', DOCUMENT_SRC, {'visibility': 'PUBLIC'})

    fetch_status, fetch_size = fetch_bytes(owner, f'/uploads/{photo_id}')
    assert fetch_status == 200, fetch_status
    barry_fetch = barry.request('GET', f'/uploads/{doc_id}/meta')
    missing = owner.request('GET', f'/uploads/{MISSING}')
    bad_uuid = owner.request('GET', '/uploads/not-a-uuid')

    meta = owner.request('GET', f'/uploads/{doc_id}/meta')
    marks_meta = mark.request('GET', f'/uploads/{doc_id}/meta')
    barry_meta = barry.request('GET', f'/uploads/{doc_id}/meta')

    barry_remove = barry.request('DELETE', f'/uploads/{doc_id}')
    removed = owner.request('DELETE', f'/uploads/{doc_id}')
    gone = owner.request('GET', f'/uploads/{doc_id}/meta')
    gone_fetch_status, _ = fetch_bytes(owner, f'/uploads/{doc_id}')
    gone_fetch = owner.request('GET', f'/uploads/{MISSING}') if gone_fetch_status != 404 else None
    restored = owner.request('POST', f'/uploads/{doc_id}/restore')
    already_live = owner.request('POST', f'/uploads/{doc_id}/restore')
    assert gone_fetch is None, 'an archived file still served'

    requests = [
        {
            'name': '01 · List files',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('paginated like every other list', () =>",
                "  pm.expect(pm.response.json().meta).to.have.property('totalPages'));",
            ])],
            'request': {
                'method': 'GET',
                'header': [],
                'url': {
                    'raw': '{{baseUrl}}/uploads?page=1&limit=10',
                    'host': ['{{baseUrl}}'],
                    'path': ['uploads'],
                    'query': [
                        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
                        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
                        {'key': 'search', 'value': None, 'disabled': True,
                         'description': 'optional · matches filename and label.'},
                        {'key': 'ownerUserId', 'value': None, 'disabled': True,
                         'description': 'optional · uuid. Opens one person\'s folder. Anyone but yourself '
                                        'needs MANAGE_USERS (SUPER_ADMIN, ADMIN) — 403 otherwise.'},
                        {'key': 'kind', 'value': None, 'disabled': True,
                         'description': 'optional · IMAGE | DOCUMENT (case-sensitive).'},
                        {'key': 'visibility', 'value': None, 'disabled': True,
                         'description': 'optional · PUBLIC | PRIVATE (case-sensitive). Only narrows: the '
                                        'caller\'s own read rule still applies. kind=IMAGE&visibility=PUBLIC '
                                        'is the photo library.'},
                        {'key': 'archived', 'value': None, 'disabled': True,
                         'description': 'optional · true | false. Default false. true returns only removed files.'},
                        {'key': 'sortBy', 'value': None, 'disabled': True,
                         'description': 'optional · createdAt | updatedAt | filename | label | size. Default createdAt.'},
                        {'key': 'sortOrder', 'value': None, 'disabled': True,
                         'description': 'optional · asc | desc. Default desc — newest first.'},
                    ],
                },
                'description': (
                    'A page of files the caller may see.\n\n'
                    '**`ownerUserId` is what makes this a folder.** The client asked for "a folder for each '
                    'broker that I can attach tax forms to"; that folder is every live upload filed about '
                    'them. A query, not a second table or a storage directory.\n\n'
                    'Scoped on the way out, by exactly the rule a fetch uses: public files, the caller\'s '
                    'own uploads, and anything filed about them. SUPER_ADMIN and ADMIN see everything. A '
                    'REFERRAL_AGENT sees only their own uploads — they may open a public file by its '
                    'address, but not browse the desk\'s.'
                ),
            },
            'response': [
                example('Success (200 · everything this caller may see)', 'GET',
                        '/uploads?page=1&limit=10', *listing),
                example('Success (200 · one broker\'s document folder)', 'GET',
                        f'/uploads?ownerUserId={mark_id}&kind=DOCUMENT&page=1&limit=10', *folder),
                example('Success (200 · the photo library: PUBLIC images)', 'GET',
                        '/uploads?kind=IMAGE&visibility=PUBLIC&page=1&limit=10', *library),
                example('Success (200 · a referral agent sees only their own uploads)', 'GET',
                        '/uploads?page=1&limit=10', *agent_list),
                example('Error (403 · a broker opening another user\'s folder)', 'GET',
                        f'/uploads?ownerUserId={mark_id}', *others_folder),
            ],
        },
        {
            'name': '02 · Upload an image',
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
                'url': {'raw': '{{baseUrl}}/uploads/image', 'host': ['{{baseUrl}}'], 'path': ['uploads', 'image']},
                'body': {'mode': 'formdata', 'formdata': formdata(
                    description=f'Required · the bytes. Accepted: {IMAGE_TYPES}. Maximum 15 MB. SVG is '
                                'refused — it executes script. The type is read from the bytes, so the '
                                'filename and the part\'s Content-Type are ignored.',
                    src=PHOTO_SRC, visibility='PUBLIC', label='Global 7500 cabin')},
                'description': (
                    'Stores the file under `images/` and returns the URL to save on whatever record is '
                    'being edited.\n\n'
                    'The response `url` is **relative** (`/api/uploads/<id>`) on purpose: an absolute URL '
                    'captured at upload time embeds whatever host was running then, so a domain change or '
                    'a move to a CDN would strand every file already uploaded.\n\n'
                    '`deduplicated: true` means these exact bytes were already on file for this user and '
                    'the existing record was returned — no second copy was written, and `createdAt` may be '
                    'older than this request.'
                ),
            },
            'response': [
                example('Success (201 · stored)', 'POST', '/uploads/image', 201, photo,
                        form=formdata(description='The image.', src=PHOTO_SRC,
                                      visibility='PUBLIC', label='Global 7500 cabin')),
                example('Success (201 · already uploaded, existing record returned)',
                        'POST', '/uploads/image', 201, dup,
                        form=formdata(description='The same bytes, under a different filename.',
                                      src=PHOTO_SRC, visibility='PUBLIC', label='Global 7500 cabin')),
                example('Error (415 · SVG refused)', 'POST', '/uploads/image', *svg,
                        form=formdata(description='An SVG — a document that executes script.', src=SVG_SRC)),
                example('Error (415 · a PDF is not an image)', 'POST', '/uploads/image', *pdf_to_image,
                        form=formdata(description='A PDF posted to the image route.', src=DOCUMENT_SRC)),
                example('Error (415 · a PDF renamed cabin.png and declared image/png)', 'POST',
                        '/uploads/image', *renamed,
                        form=formdata(description='The PDF again, sent as cabin.png with Content-Type '
                                                  'image/png. The bytes decide.', src=DOCUMENT_SRC)),
                example('Error (400 · no file part)', 'POST', '/uploads/image', *no_file),
            ],
        },
        {
            'name': '03 · File a document in a broker\'s folder',
            'event': [script('prerequest', [
                '// A broker to file the document about, fetched here rather than',
                '// trusting {{userId}}, which `04 · Users` sets. Without this the',
                '// folder passed inside a full run and answered 400 run on its own.',
                "const base = pm.collectionVariables.get('baseUrl');",
                "pm.sendRequest({ url: base + '/users?limit=1&role=BROKER&status=ACTIVE', method: 'GET' }, function (err, res) {",
                '    if (!err && res.code === 200 && res.json().data.length) {',
                "        pm.collectionVariables.set('userId', res.json().data[0].id);",
                '    }',
                '});',
            ]), script('test', [
                "const body = pm.response.json();",
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.test('kind is DOCUMENT', () => pm.expect(body.data.kind).to.eql('DOCUMENT'));",
                "pm.test('stored as a PDF', () =>",
                "  pm.expect(body.data.contentType).to.eql('application/pdf'));",
                "// The default that matters. A tax form uploaded without a",
                "// thought must not be readable by every signed-in user.",
                "pm.test('private by default', () =>",
                "  pm.expect(body.data.visibility).to.eql('PRIVATE'));",
                "pm.test('filed into the broker\\'s folder', () =>",
                "  pm.expect(body.data.ownerUserId).to.eql(pm.collectionVariables.get('userId')));",
                "pm.collectionVariables.set('uploadDocumentId', body.data.id);",
            ])],
            'request': {
                'method': 'POST',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/document', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', 'document']},
                'body': {'mode': 'formdata', 'formdata': formdata(
                    description='Required · the bytes, any file, maximum 25 MB. '
                                f'{DOCUMENT_TYPES} keep their own type; anything else is stored as '
                                'application/octet-stream and always downloads.',
                    src=DOCUMENT_SRC, owner='{{userId}}', label='2025 Form 1099')},
                'description': (
                    'Stores the file under `documents/` and returns the URL to save on the record being '
                    'edited.\n\n'
                    '**This example is the client\'s own:** *"a broker (mark) makes a commission with us, we '
                    'need to give him a 1099 tax form. I want to be able to add that form into his own '
                    'personal folder."* Passing `ownerUserId` is what files it there.\n\n'
                    'It stays **PRIVATE** because that is the default. Mark can read it, and so can '
                    'SUPER_ADMIN and ADMIN; another broker gets a **404, not a 403** (see `04` and `05`).\n\n'
                    '**Any file is accepted** (owner\'s decision, 6 Oct 2026). One the server cannot '
                    'recognise — a zip, a legacy `.xls`, a scan — is stored as `application/octet-stream` '
                    'whatever it was named or declared, and served as an attachment with `nosniff`, so it '
                    'can never run in a tab on this API\'s origin.\n\n'
                    'The **filename** is kept as sent — accents and all — with any client-side path '
                    'and control characters removed, and shortened to 255 characters with its extension '
                    'kept. It is only a label: the storage key is the content hash.\n\n'
                    '**Refused:** filing about someone else without MANAGE_USERS, and a referral agent '
                    'publishing (PUBLIC) or filing — a partner\'s upload is a private attachment.'
                ),
            },
            'response': [
                example('Success (201 · filed in a broker\'s folder)', 'POST', '/uploads/document', 201, doc,
                        form=formdata(description='The document.', src=DOCUMENT_SRC,
                                      owner=mark_id, label='2025 Form 1099')),
                example('Success (201 · an unrecognised file is stored as application/octet-stream)',
                        'POST', '/uploads/document', zip_status, zipped,
                        form=formdata(description='A zip of receipts.', src=ARCHIVE_SRC,
                                      label='Fuel receipts, October')),
                example('Success (201 · a filename with accents is kept as sent)', 'POST',
                        '/uploads/document', named_status, named,
                        form=formdata(description='A PDF named "Cotización – Müller.pdf".',
                                      src=DOCUMENT_SRC, label='Signed quote')),
                example('Error (403 · a broker filing into another user\'s folder)', 'POST',
                        '/uploads/document', *filed_by_broker,
                        form=formdata(description='The document.', src=DOCUMENT_SRC, owner=mark_id)),
                example('Error (403 · a referral agent publishing a file)', 'POST',
                        '/uploads/document', *agent_public,
                        form=formdata(description='The document.', src=DOCUMENT_SRC, visibility='PUBLIC')),
            ],
        },
        {
            'name': '04 · Fetch a file',
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
                    'Requires a session: there is no unauthenticated path to a stored file, and the storage '
                    'bucket itself is never public. Permission is re-checked on every fetch rather than '
                    'frozen into a signature, so access that is revoked actually stops working.\n\n'
                    'A file the caller may not read answers **404**, exactly like one that does not exist '
                    '— a 403 would confirm it is there.'
                ),
            },
            'response': [
                example('Success (200 · the bytes)', 'GET', '/uploads/{{uploadImageId}}', 200,
                        {'_': f'The response body is the file itself — {fetch_size} bytes of image/png. '
                              'Postman renders binary rather than JSON here.'},
                        preview='text'),
                example('Error (404 · another broker\'s private file)', 'GET',
                        f'/uploads/{doc_id}', *barry_fetch),
                example('Error (404 · no such file)', 'GET', f'/uploads/{MISSING}', *missing),
                example('Error (400 · not a uuid)', 'GET', '/uploads/not-a-uuid', *bad_uuid),
            ],
        },
        {
            'name': '05 · Describe a file',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('says whether it has been removed', () =>",
                "  pm.expect(pm.response.json().data).to.have.property('archived'));",
            ])],
            'request': {
                'method': 'GET',
                'header': [],
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}/meta', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}', 'meta']},
                'description': (
                    'The record behind a stored URL — filename, type, size, and whether it has been '
                    'removed — without downloading the bytes.\n\n'
                    'For a screen that lists an attachment as a row rather than rendering it. Unlike the '
                    'fetch route this answers for an archived file too, so a list can show "removed" '
                    'instead of a broken link. The same read rule applies as on fetch.'
                ),
            },
            'response': [
                example('Success (200 · an administrator)', 'GET', '/uploads/{{uploadDocumentId}}/meta', *meta),
                example('Success (200 · the broker it was filed about)', 'GET',
                        '/uploads/{{uploadDocumentId}}/meta', *marks_meta),
                example('Error (404 · another broker)', 'GET', '/uploads/{{uploadDocumentId}}/meta', *barry_meta),
            ],
        },
        {
            'name': '06 · Remove a file',
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
                    'may be shared with another user who uploaded the same file.\n\n'
                    'Who may remove: the uploader and SUPER_ADMIN / ADMIN. Anyone who may not read the file '
                    'gets a 404. The file stops serving immediately: a URL stored on another record will '
                    '404, while `/meta` still describes it as archived.'
                ),
            },
            'response': [
                example('Success (200 · archived)', 'DELETE', '/uploads/{{uploadDocumentId}}', *removed),
                example('Error (404 · another broker cannot see it to remove it)', 'DELETE',
                        '/uploads/{{uploadDocumentId}}', *barry_remove),
                example('Then /meta says it was removed (200)', 'GET',
                        '/uploads/{{uploadDocumentId}}/meta', *gone),
            ],
        },
        {
            'name': '07 · Restore a removed file',
            'event': [script('test', [
                "pm.test('200, not 201 — nothing was created', () =>",
                "  pm.response.to.have.status(200));",
            ])],
            'request': {
                'method': 'POST',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}/restore', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}', 'restore']},
                'description': (
                    'Clears the deletion stamp and touches nothing else. Every URL that pointed at this '
                    'file works again, because the bytes never moved.\n\n'
                    'Answers **200**, not the 201 Nest gives every POST: a restore creates nothing.'
                ),
            },
            'response': [
                example('Success (200 · restored)', 'POST', '/uploads/{{uploadDocumentId}}/restore', *restored),
                example('Error (400 · it was never removed)', 'POST',
                        '/uploads/{{uploadDocumentId}}/restore', *already_live),
            ],
        },
        {
            'name': '08 · Teardown — archive the image',
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
                    'the same fixture, which creates a fresh row rather than reviving this one.'
                ),
            },
            'response': [],
        },
        {
            'name': '09 · Teardown — archive the document',
            'event': [script('test', [
                "pm.test('probe archived', () => pm.response.to.have.status(200));",
                "// Request 07 restored this row to demonstrate the restore, which left",
                "// it live. Closing it here is what keeps the run net-zero.",
            ])],
            'request': {
                'method': 'DELETE',
                'header': CSRF_HEADER,
                'url': {'raw': '{{baseUrl}}/uploads/{{uploadDocumentId}}', 'host': ['{{baseUrl}}'],
                        'path': ['uploads', '{{uploadDocumentId}}']},
                'description': (
                    'Archives the document again.\n\n'
                    'Requests 06 and 07 removed and restored it to demonstrate both, so it is live at this '
                    'point. Without this the collection would leave one live row behind on every run.'
                ),
            },
            'response': [],
        },
    ]

    return {'name': '11 · Uploads', 'description': HOW_IT_WORKS, 'item': requests}, probes


def main() -> None:
    for fixture in (PHOTO_SRC, DOCUMENT_SRC, SVG_SRC, ARCHIVE_SRC):
        if not fixture.exists():
            raise SystemExit(f'Missing fixture: {fixture}')

    owner = Session('admin@example.com')
    mark = Session('mark@example.com')
    barry = Session('barry@example.com')
    agent = Session('agent@example.com')

    # A real broker to file a document about — the client's example is Mark.
    _, users = owner.request('GET', '/users?search=mark@example.com&limit=1')
    mark_id = users['data'][0]['id']

    folder, probes = build(owner, mark, barry, agent, mark_id)

    collection = json.loads(COLLECTION.read_text())
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    # Escaped non-ASCII, like every other builder: writing it raw re-encodes
    # every '·' in the collection and turns one folder's rebuild into a diff
    # of the whole file.
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')

    # Archive what this build uploaded. The examples are already captured as
    # text, and the bytes stay in storage regardless.
    archived = sum(1 for session, probe in probes
                   if session.request('DELETE', f'/uploads/{probe}')[0] == 200)

    count = len(folder['item'])
    examples = sum(len(r['response']) for r in folder['item'])
    print(f'11 · Uploads — {count} requests, {examples} captured examples')
    print(f'             — {archived} of {len(probes)} probe rows archived')


if __name__ == '__main__':
    main()
