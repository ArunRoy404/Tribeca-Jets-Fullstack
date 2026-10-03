#!/usr/bin/env python3
"""
Builds `28 · Documents` (Document Vault, #22), capturing every example from a
live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_documents_folder.py
    cd postman && python3 rewrite_body_comments.py

The folder files documents on a probe client of its own (on `example.com`)
and on a seeded operator, and archives every document and the probe client
at the end, in the builder and in the folder's own teardown. It signs in as
`admin@`, `assistant@` and — for the 401 — nobody.
"""

import json
import pathlib
import urllib.error
import urllib.request

from builder_common import (
    BASE, FIXTURES, MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example,
    script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
DOCUMENT = FIXTURES / 'sample-document.pdf'
CATEGORIES = ('PASSPORT | ID | CHARTER_AGREEMENT | WIRE_CONFIRMATION | INVOICE | ITINERARY | '
              'INSURANCE_CERTIFICATE | OPERATOR_CERTIFICATE | CATERING_REQUEST | OTHER')
EXPIRY = 'NONE | VALID | EXPIRING | EXPIRED'
PROBE_EMAIL = 'postman-documents-probe@example.com'

CREATE_BODY = """{
  "title": "Charter agreement — Postman",       // required · 1-200 characters
  "category": "CHARTER_AGREEMENT",              // optional · PASSPORT | ID | CHARTER_AGREEMENT | WIRE_CONFIRMATION | INVOICE | ITINERARY | INSURANCE_CERTIFICATE | OPERATOR_CERTIFICATE | CATERING_REQUEST | OTHER. Default OTHER
  "fileUrl": "{{documentFileUrl}}",             // required · "/api/uploads/<id>" from POST /uploads/document or /uploads/image — a file you may read
  "clientId": "{{documentsProbeClientId}}",     // exactly one of clientId / tripId / operatorId · the folder
  "expiresOn": "2027-03-31",                    // optional · YYYY-MM-DD, a passport's or certificate's expiry
  "notes": "Signed copy, both pages."           // optional · up to 5000 characters
}"""

UPDATE_BODY = """{
  "expiresOn": "2026-10-15",   // optional · YYYY-MM-DD, or null to clear
  "notes": null                // optional · every field optional; fileUrl replaces the file; the folder cannot change
}"""

SETUP = [
    '// A probe client on example.com and a PRIVATE upload, so the folder runs alone.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const csrf = pm.collectionVariables.get('csrfToken');",
    "pm.sendRequest({ url: base + '/clients', method: 'POST',",
    "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },",
    "    body: { mode: 'raw', raw: JSON.stringify({ firstName: 'Postman', lastName: 'Documents Probe',",
    f"        email: '{PROBE_EMAIL}' }}) }} }}, function (err, res) {{",
    "    if (!err && res.code === 201) { pm.collectionVariables.set('documentsProbeClientId', res.json().data.id); }",
    '});',
]

SAVE_DOCUMENT = script('test', [
    "pm.test('201 Created', () => pm.response.to.have.status(201));",
    "pm.collectionVariables.set('newDocumentId', pm.response.json().data.id);",
])

SAVE_UPLOAD = script('test', [
    "pm.test('201 Created', () => pm.response.to.have.status(201));",
    "pm.collectionVariables.set('documentFileUrl', pm.response.json().data.url);",
])

TEARDOWN = [
    '// Archive the document and the probe client this folder wrote. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const csrf = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/documents/' + pm.collectionVariables.get('newDocumentId'),",
    "    method: 'DELETE', header: csrf }, function () {});",
    "pm.sendRequest({ url: base + '/clients/' + pm.collectionVariables.get('documentsProbeClientId'),",
    "    method: 'DELETE', header: csrf }, function () {});",
]


def raw_file(session: Session, path: str):
    """A streamed file: the status and headers, never the bytes as JSON."""
    req = urllib.request.Request(BASE + path, method='GET')
    req.add_header('X-CSRF-Token', session.csrf)
    try:
        with session.opener.open(req) as response:
            response.read()
            return response.status, response.headers.get('Content-Type')
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode())


def file_example(name: str, path: str, status: int, content_type: str) -> dict:
    """A 200 whose body is a file — described, since bytes are not JSON."""
    ex = example(name, 'GET', path, status, None)
    ex['header'] = [{'key': 'Content-Type', 'value': content_type}]
    ex['_postman_previewlanguage'] = 'text'
    ex['body'] = '<the file\'s bytes>'
    return ex


def build(owner: Session, assistant: Session, anonymous: Session):
    cap = {}
    client_id = document_id = passport_id = operator_doc_id = None
    try:
        status, body = owner.request('POST', '/clients', {
            'firstName': 'Postman', 'lastName': 'Documents Probe', 'email': PROBE_EMAIL,
        })
        assert status == 201, f'probe client: {status} {body}'
        client_id = body['data']['id']
        status, body = owner.request('GET', '/operators?search=NetJets&limit=1')
        assert status == 200 and body['data'], f'seeded operator: {status} {body}'
        operator_id = body['data'][0]['id']

        cap['upload'] = owner.upload('/uploads/document', DOCUMENT, {'visibility': 'PRIVATE'})
        file_url = cap['upload'][1]['data']['url']

        create = {
            'title': 'Charter agreement — Postman', 'category': 'CHARTER_AGREEMENT', 'fileUrl': file_url,
            'clientId': client_id, 'expiresOn': '2027-03-31', 'notes': 'Signed copy, both pages.',
        }
        cap['create'] = owner.request('POST', '/documents', create)
        document_id = cap['create'][1]['data']['id']
        passport = {'title': 'Passport — Postman', 'category': 'PASSPORT', 'fileUrl': file_url, 'clientId': client_id,
                    'expiresOn': '2026-11-30'}
        cap['create_passport'] = owner.request('POST', '/documents', passport)
        passport_id = cap['create_passport'][1]['data']['id']
        certificate = {'title': 'Insurance certificate — Postman', 'category': 'INSURANCE_CERTIFICATE',
                       'fileUrl': file_url, 'operatorId': operator_id, 'expiresOn': '2027-01-31'}
        cap['create_operator'] = owner.request('POST', '/documents', certificate)
        operator_doc_id = cap['create_operator'][1]['data']['id']

        two_owners = {**create, 'operatorId': operator_id}
        cap['create_400_owners'] = owner.request('POST', '/documents', two_owners)
        bad_file = {**create, 'fileUrl': f'/api/uploads/{MISSING}'}
        cap['create_400_file'] = owner.request('POST', '/documents', bad_file)
        cap['create_401'] = anonymous.request('POST', '/documents', create)
        cap['create_403'] = assistant.request('POST', '/documents', create)

        cap['list'] = owner.request('GET', f'/documents?clientId={client_id}')
        cap['list_assistant'] = assistant.request('GET', f'/documents?clientId={client_id}')
        cap['list_expiring'] = owner.request('GET', '/documents?expiry=EXPIRING&on=2026-09-29&sortBy=expiresOn&sortOrder=asc')
        cap['list_400'] = owner.request('GET', '/documents?expiry=SOON')

        cap['stats'] = owner.request('GET', '/documents/stats?on=2026-09-29')
        cap['stats_400'] = owner.request('GET', '/documents/stats?search=passport')

        cap['one'] = owner.request('GET', f'/documents/{document_id}')
        cap['one_404_sensitive'] = assistant.request('GET', f'/documents/{passport_id}')
        cap['one_404'] = owner.request('GET', f'/documents/{MISSING}')

        cap['file'] = raw_file(owner, f'/documents/{document_id}/file')
        cap['file_404'] = raw_file(assistant, f'/documents/{passport_id}/file')

        update = {'expiresOn': '2026-10-15', 'notes': None}
        cap['update'] = owner.request('PATCH', f'/documents/{document_id}', update)
        cap['update_400'] = owner.request('PATCH', f'/documents/{document_id}', {'title': ''})

        cap['archive'] = owner.request('DELETE', f'/documents/{document_id}')
        cap['archive_404'] = owner.request('DELETE', f'/documents/{document_id}')
        cap['restore'] = owner.request('POST', f'/documents/{document_id}/restore')
        cap['bulk_delete'] = owner.request('POST', '/documents/bulk-delete', {'ids': [document_id, MISSING]})
        cap['bulk_restore'] = owner.request('POST', '/documents/bulk-restore', {'ids': [document_id]})
        cap['bulk_400'] = owner.request('POST', '/documents/bulk-delete', {'ids': []})
    finally:
        for doc in (document_id, passport_id, operator_doc_id):
            if doc:
                owner.request('DELETE', f'/documents/{doc}')
        if client_id:
            owner.request('DELETE', f'/clients/{client_id}')

    path = f'/documents/{document_id}'
    assert cap['file'][0] == 200, f"file: {cap['file']}"
    items = [
        {
            'name': '01 · Upload the file',
            'event': [script('prerequest', SETUP), SAVE_UPLOAD],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS[1:],
                'body': {'mode': 'formdata', 'formdata': [
                    {'key': 'file', 'type': 'file',
                     'src': (pathlib.PurePosixPath('postman/fixtures') / DOCUMENT.name).as_posix(),
                     'description': 'required · PDF, image, Word, Excel or text; the type is read from the bytes.'},
                    {'key': 'visibility', 'value': 'PRIVATE', 'type': 'text',
                     'description': 'optional · PUBLIC | PRIVATE. Default PRIVATE — right for a vault document, which opens through the document.'},
                ]},
                'url': url('/uploads/document'),
                'description': (
                    'The vault files an upload, like every form here: upload first, then send its URL. Its '
                    'pre-request creates the probe client the documents below are filed on.'),
            },
            'response': [example('201 · Uploaded', 'POST', '/uploads/document', *cap['upload'])],
        },
        {
            'name': '02 · File a document',
            'event': [SAVE_DOCUMENT],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/documents'),
                'description': (
                    'Exactly one of `clientId`, `tripId` or `operatorId` is the folder, which must be one you may '
                    'see and not archived. The file must be one you may read. PASSPORT and ID need '
                    'VIEW_SENSITIVE_DOCUMENTS. Filing lands on the folder owner\'s timeline.'),
            },
            'response': [
                example('201 · Filed in the client folder', 'POST', '/documents', *cap['create'], req_body=create),
                example('201 · A passport, restricted', 'POST', '/documents', *cap['create_passport'], req_body=passport),
                example("201 · An operator's certificate", 'POST', '/documents', *cap['create_operator'],
                        req_body=certificate),
                example('400 · Two folders at once', 'POST', '/documents', *cap['create_400_owners'], req_body=two_owners),
                example('400 · No such file', 'POST', '/documents', *cap['create_400_file'], req_body=bad_file),
                example('401 · Not signed in', 'POST', '/documents', *cap['create_401'], req_body=create),
                example('403 · An assistant reads the vault but does not file', 'POST', '/documents',
                        *cap['create_403'], req_body=create),
            ],
        },
        {
            'name': '03 · List documents',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/documents', [
                    {'key': 'clientId', 'value': '{{documentsProbeClientId}}', 'description': 'optional · uuid · one client folder. Also tripId, operatorId.'},
                    {'key': 'owner', 'value': 'CLIENT', 'disabled': True, 'description': 'optional · CLIENT | TRIP | OPERATOR · one kind of folder.'},
                    {'key': 'category', 'value': 'PASSPORT', 'disabled': True, 'description': f'optional · {CATEGORIES}.'},
                    {'key': 'expiry', 'value': 'EXPIRING', 'disabled': True, 'description': f'optional · {EXPIRY}. EXPIRING is within 90 days of `on`.'},
                    {'key': 'on', 'value': '2026-09-29', 'disabled': True, 'description': "optional · YYYY-MM-DD, the desk's today. Default today in UTC."},
                    {'key': 'search', 'value': 'agreement', 'disabled': True, 'description': "optional · 1-200 characters · title, notes, file name, the owner, a trip's TJ-number."},
                    {'key': 'archived', 'value': 'true', 'disabled': True, 'description': 'optional · true lists the archived half. Default false.'},
                    {'key': 'sortBy', 'value': 'expiresOn', 'disabled': True, 'description': 'optional · createdAt | updatedAt | title | category | expiresOn. Default createdAt.'},
                    {'key': 'sortOrder', 'value': 'asc', 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'page', 'value': '1', 'disabled': True, 'description': 'optional · integer ≥ 1. Default 1.'},
                    {'key': 'limit', 'value': '10', 'disabled': True, 'description': 'optional · integer 1-100. Default 10.'},
                ]),
                'description': (
                    "Each row carries its `owner`, the file's own `file` facts, `expiry` (worked out now) and "
                    '`sensitive`. A role without VIEW_SENSITIVE_DOCUMENTS never sees a PASSPORT or ID row.'),
            },
            'response': [
                example('200 · A client folder', 'GET', f'/documents?clientId={client_id}', *cap['list']),
                example('200 · The same folder to an assistant — no passport', 'GET', f'/documents?clientId={client_id}',
                        *cap['list_assistant']),
                example('200 · Expiring within 90 days', 'GET',
                        '/documents?expiry=EXPIRING&on=2026-09-29&sortBy=expiresOn&sortOrder=asc', *cap['list_expiring']),
                example('400 · Unknown expiry state', 'GET', '/documents?expiry=SOON', *cap['list_400']),
            ],
        },
        {
            'name': '04 · Vault tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/documents/stats', [
                    {'key': 'on', 'value': '2026-09-29', 'description': "optional · YYYY-MM-DD, the desk's today. Default today in UTC."},
                    {'key': 'clientId', 'value': '', 'disabled': True, 'description': 'optional · uuid · one folder. Also tripId, operatorId.'},
                ]),
                'description': 'Live documents in your scope: total, by kind of folder, expired, and expiring within 90 days. Any other parameter is a 400.',
            },
            'response': [
                example('200 · The tiles', 'GET', '/documents/stats?on=2026-09-29', *cap['stats']),
                example('400 · Search is not offered here', 'GET', '/documents/stats?search=passport', *cap['stats_400']),
            ],
        },
        {
            'name': '05 · One document',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/documents/{{newDocumentId}}'),
                'description': 'Archived documents load too. A passport or ID is a 404 to a role that may not read one — not a 403, which would confirm it exists.',
            },
            'response': [
                example('200 · Found', 'GET', path, *cap['one']),
                example('404 · A passport, to an assistant', 'GET', f'/documents/{passport_id}', *cap['one_404_sensitive']),
                example('404 · Not found', 'GET', f'/documents/{MISSING}', *cap['one_404']),
            ],
        },
        {
            'name': "06 · Open the document's file",
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/documents/{{newDocumentId}}/file'),
                'description': (
                    "The bytes, for whoever may read the document. The file is usually someone else's PRIVATE "
                    'upload, so it opens through the document rather than /uploads/:id. Images open inline; '
                    'everything else downloads.'),
            },
            'response': [
                file_example('200 · The file', f'{path}/file', *cap['file']),
                example('404 · A passport, to an assistant', 'GET', f'/documents/{passport_id}/file', *cap['file_404']),
            ],
        },
        {
            'name': '07 · Edit a document',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/documents/{{newDocumentId}}'),
                'description': 'Title, category, expiry, notes, or a new `fileUrl`. The folder cannot change — archive and file again.',
            },
            'response': [
                example('200 · Expiry moved, notes cleared', 'PATCH', path, *cap['update'], req_body=update),
                example('400 · Empty title', 'PATCH', path, *cap['update_400'], req_body={'title': ''}),
            ],
        },
        {
            'name': '08 · Archive a document',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS[1:], 'url': url('/documents/{{newDocumentId}}'),
                'description': 'Nothing is deleted and the file stays in storage. Whoever filed it, or an administrator.',
            },
            'response': [
                example('204 · Archived', 'DELETE', path, *cap['archive']),
                example('404 · Already archived', 'DELETE', path, *cap['archive_404']),
            ],
        },
        {
            'name': '09 · Restore it',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS[1:], 'url': url('/documents/{{newDocumentId}}/restore'),
                'description': 'Clears the archive stamp and nothing else.',
            },
            'response': [example('200 · Restored', 'POST', f'{path}/restore', *cap['restore'])],
        },
        {
            'name': '10 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newDocumentId}}"]   // required · 1-100 uuids\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/documents/bulk-delete'),
                'description': 'Partial success is success: ids out of scope, already archived, or filed by someone else (for a broker) come back in `skipped`.',
            },
            'response': [
                example('200 · One archived, one skipped', 'POST', '/documents/bulk-delete', *cap['bulk_delete'],
                        req_body={'ids': [document_id, MISSING]}),
                example('400 · No ids', 'POST', '/documents/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '11 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newDocumentId}}"]   // required · 1-100 uuids\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/documents/bulk-restore'),
                'description': 'The same ids, the same partial-success rule.',
            },
            'response': [example('200 · Restored', 'POST', '/documents/bulk-restore', *cap['bulk_restore'],
                                 req_body={'ids': [document_id]})],
        },
        {
            'name': '12 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/documents', [{'key': 'limit', 'value': '1', 'description': 'optional.'}]),
                'description': 'Archives the document and the probe client this folder wrote. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '28 · Documents',
        'description': (
            'Document Vault (#22): client, trip and operator folders of documents, each an upload by reference, '
            'with expiry dates and restricted passports and IDs. Runs alone: it writes a probe client on '
            'example.com and archives everything it filed.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {'documentsProbeClientId': '', 'documentFileUrl': '', 'newDocumentId': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
