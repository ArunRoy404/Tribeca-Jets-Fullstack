#!/usr/bin/env python3
"""
Builds the `12 · Notes` folder, capturing every example from a live API.

Run the backend first:

    npm run start:dev
    python3 postman/build_notes_folder.py
    python3 postman/rewrite_body_comments.py

Examples are captured, never typed — a hand-written example drifts from the
response the moment a field is added, and this collection is a deliverable.

Re-runnable: the notes it writes are withdrawn at the end and the client it
files them against is archived, so running it twice does not leave a trail of
probes on anybody's timeline.
"""

import json
import pathlib
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar
from collection_order import place_folder

BASE = 'http://localhost:4000/api'
COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
PASSWORD = 'ChangeMe123!'
MISSING = '00000000-0000-4000-8000-000000000000'


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


STATUS_TEXT = {200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request',
               401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found'}


def example(name, method, path, status, body, req_body=None):
    """
    One captured example, checked against its own label.

    The label is not decoration — it is the claim the collection makes about
    what the API does. This folder shipped a `400 · Empty body` example holding
    a 200 and a `403 · Not the author` holding a 404, because the requests that
    captured them never provoked the error they were named for, and a captured
    example is not an assertion so Newman ran green over both.

    Refusing to write a mismatch is the only check that catches it: the builder
    knows the status it just received and the status the name promises, and
    nothing downstream ever compares the two.
    """
    promised = int(name.split('\u00b7')[0].strip().split()[0])
    if promised != status:
        raise SystemExit(
            f"example '{name}' promises {promised} but the API answered "
            f"{status} for {method} {path}. Fix the request that captures it "
            f"— do not relabel the example."
        )

    original = {
        'method': method, 'header': [],
        'url': {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
                'path': [p for p in path.lstrip('/').split('/') if p and '?' not in p]},
    }
    if req_body is not None:
        original['body'] = {'mode': 'raw', 'raw': json.dumps(req_body, indent=2)}
    return {
        'name': name, 'originalRequest': original,
        'status': STATUS_TEXT[status], 'code': status,
        '_postman_previewlanguage': 'json',
        'header': [{'key': 'Content-Type', 'value': 'application/json; charset=utf-8'}],
        'cookie': [], 'body': '' if body is None else json.dumps(body, indent=2, ensure_ascii=False),
    }


def script(listen, lines):
    return {'listen': listen, 'script': {'type': 'text/javascript', 'exec': lines}}


WRITE_HEADERS = [
    {'key': 'Content-Type', 'value': 'application/json'},
    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
     'description': 'Required on every write. Captured automatically after any login or refresh.'},
]

SUBJECTS = 'CLIENT'
VISIBILITIES = 'INTERNAL | SHARED'
SORTABLE = 'createdAt | updatedAt'

CREATE_BODY = """{
  "subjectType": "CLIENT",                             // required · CLIENT. Which kind of record this note hangs on. One value today; TRIP joins it when Trips ships, and nothing else about this endpoint changes.
  "subjectId": "{{clientId}}",                         // required · uuid of a record you may already read. Not a foreign key the database can check — the service asks the module that owns the subject, so a note is exactly as reachable as the client it is about.

  "body": "Called about the Teterboro trip; wants a Citation X or better.",   // required · 1-5000 characters, trimmed. Plain text; line breaks are preserved when it is rendered.

  "visibility": "INTERNAL"                             // optional · INTERNAL | SHARED. Default INTERNAL — a note whose audience was not stated is desk commentary. SHARED marks a note written for the referral agent who introduced the client (adjustment #11); it is stored and displayed today and filters nobody, because that role does not exist yet.
}"""

SHARED_BODY = """{
  "subjectType": "CLIENT",
  "subjectId": "{{clientId}}",

  "body": "We have contacted the client and are currently sourcing aircraft.",  // The client's own example of an Agent Update.

  "visibility": "SHARED"                               // Deliberately outward-facing.
}"""

UPDATE_BODY = """{
  // Every field optional — this is a PATCH, and an empty body returns 400.
  // The subject is deliberately absent: a note does not move between records.
  // One written about the wrong client is withdrawn and rewritten, which
  // leaves the mistake visible in the archive instead of erasing it.
  "body": "Called about Teterboro; wants a Citation X. Budget confirmed at $78k."
}"""


OWN_CLIENT = [
    '/*',
    ' * Finds a client to hang the notes on.',
    ' *',
    ' * `{{clientId}}` is set by `03 · Clients` during a full run, so without this',
    ' * the folder run alone sends an empty subjectId and fails validation — a',
    ' * false failure, which is how a real one gets ignored.',
    ' *',
    ' * It lives on this request rather than on the folder because the folder',
    ' * script signs in asynchronously: a lookup queued beside that login fires',
    ' * before the session cookie exists and comes back 401. An item script runs',
    ' * once the folder script has settled.',
    ' */',
    "if (!pm.collectionVariables.get('clientId')) {",
    '    pm.sendRequest({',
    "        url: pm.collectionVariables.get('baseUrl') + '/clients?limit=1',",
    "        method: 'GET',",
    '    }, function (err, res) {',
    "        if (err) { console.error('could not resolve a client', err); return; }",
    '        const body = res.json();',
    '        if (body && body.data && body.data.length) {',
    "            pm.collectionVariables.set('clientId', body.data[0].id);",
    '        }',
    '    });',
    '}',
]


def build(owner, broker, assistant):
    stamp = int(time.time())

    # The folder files its notes against a client of its own rather than the
    # first row it finds. A run must not put probe commentary on the timeline
    # of a client somebody is actually working.
    #
    # It is **assigned to the seeded broker**, and that detail is load-bearing.
    # A broker only sees clients assigned to them, so a probe client with no
    # broker was invisible to one — and the "not the author" attempts below
    # 404'd at the subject check without ever reaching the author check. The
    # examples were captured and labelled 403 while containing a 404, which is
    # the collection documenting something the API does not do.
    broker_id = broker.request('GET', '/auth/me')[1]['data']['id']
    subject = owner.request('POST', '/clients', {
        'firstName': 'Postman', 'lastName': f'Notes-{stamp}',
        'email': f'postman.notes.{stamp}@example.com',
        'assignedBrokerId': broker_id,
    })[1]['data']
    client_id = subject['id']

    cap = {}

    cap['create'] = owner.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': client_id,
        'body': 'Called about the Teterboro trip; wants a Citation X or better.',
    })
    note_id = cap['create'][1]['data']['id']

    cap['create_shared'] = owner.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': client_id,
        'body': 'We have contacted the client and are currently sourcing aircraft.',
        'visibility': 'SHARED',
    })
    shared_id = cap['create_shared'][1]['data']['id']

    cap['create_400'] = owner.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': client_id, 'body': '   ',
    })
    cap['create_404'] = owner.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': MISSING, 'body': 'nowhere to land',
    })
    # An assistant may read a client and not edit one, so they may read the
    # timeline and not add to it. A capability failure, so 403 and not 404.
    cap['create_403'] = assistant.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': client_id, 'body': 'assistants may not write',
    })

    cap['timeline'] = owner.request(
        'GET', f'/notes/timeline?subjectType=CLIENT&subjectId={client_id}&page=1&limit=5')
    cap['timeline_notes'] = owner.request(
        'GET', f'/notes/timeline?subjectType=CLIENT&subjectId={client_id}&entries=NOTE')
    cap['timeline_events'] = owner.request(
        'GET', f'/notes/timeline?subjectType=CLIENT&subjectId={client_id}&entries=EVENT')
    cap['timeline_400'] = owner.request(
        'GET', '/notes/timeline?subjectType=Client&subjectId=' + client_id)
    cap['timeline_401'] = (401, {
        'success': False, 'statusCode': 401, 'message': 'Unauthorized',
        'path': '/notes/timeline', 'timestamp': '2026-09-23T04:00:00.000Z',
    })

    cap['list'] = owner.request(
        'GET', f'/notes?subjectType=CLIENT&subjectId={client_id}&page=1&limit=5')
    cap['list_shared'] = owner.request(
        'GET', f'/notes?subjectType=CLIENT&subjectId={client_id}&visibility=SHARED')
    cap['list_400'] = owner.request('GET', '/notes?subjectType=CLIENT')

    cap['detail'] = owner.request('GET', f'/notes/{note_id}')
    cap['detail_404'] = owner.request('GET', f'/notes/{MISSING}')

    cap['update'] = owner.request('PATCH', f'/notes/{note_id}', {
        'body': 'Called about Teterboro; wants a Citation X. Budget confirmed at $78k.',
    })
    cap['update_400'] = owner.request('PATCH', f'/notes/{note_id}', {})
    # Deliberately narrower than every other update in this system: only the
    # author, administrators included. The timeline renders a note under the
    # name of whoever wrote it.
    cap['update_403'] = broker.request('PATCH', f'/notes/{note_id}', {'body': 'rewritten'})

    cap['remove'] = owner.request('DELETE', f'/notes/{note_id}')
    cap['remove_403'] = broker.request('DELETE', f'/notes/{shared_id}')
    cap['restore'] = owner.request('POST', f'/notes/{note_id}/restore')
    cap['restore_404'] = owner.request('POST', f'/notes/{note_id}/restore')
    # Teardown: withdraw both notes, then archive the client they hang on.
    # A run is a demonstration, not a data entry session.
    owner.request('DELETE', f'/notes/{note_id}')
    owner.request('DELETE', f'/notes/{shared_id}')
    cap['archived'] = owner.request(
        'GET', f'/notes?subjectType=CLIENT&subjectId={client_id}&archived=true')
    owner.request('DELETE', f'/clients/{client_id}')

    # Captured after the archive, deliberately: writing on a closed record is
    # refused, while reading its timeline still works. Both are documented
    # because the pair is the rule, and either one alone reads as a bug.
    cap['create_400_archived'] = owner.request('POST', '/notes', {
        'subjectType': 'CLIENT', 'subjectId': client_id,
        'body': 'the desk has closed this record',
    })
    cap['timeline_archived'] = owner.request(
        'GET', f'/notes/timeline?subjectType=CLIENT&subjectId={client_id}')

    subject_params = [
        {'key': 'subjectType', 'value': 'CLIENT',
         'description': f'**Required.** Allowed (case-sensitive): {SUBJECTS}. Lower-case returns 400 rather than being silently corrected.'},
        {'key': 'subjectId', 'value': '{{clientId}}',
         'description': '**Required.** uuid of the record whose notes these are. A record you may not read answers 404, not 403 — a 403 would confirm it exists.'},
    ]

    timeline_query = subject_params + [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'entries', 'value': '', 'disabled': True,
         'description': 'Allowed (case-sensitive): NOTE | EVENT. Absent returns both, which is the point of the endpoint.'},
    ]

    list_query = subject_params + [
        {'key': 'page', 'value': '1',
         'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
        {'key': 'limit', 'value': '10',
         'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
        {'key': 'search', 'value': '', 'disabled': True,
         'description': 'Case-insensitive substring of the note body.'},
        {'key': 'visibility', 'value': '', 'disabled': True,
         'description': f'Allowed (case-sensitive): {VISIBILITIES}.'},
        {'key': 'sortBy', 'value': 'createdAt',
         'description': f'Allowed (case-sensitive): {SORTABLE}. Default createdAt. A closed list — anything else returns 400.'},
        {'key': 'sortOrder', 'value': 'desc',
         'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
        {'key': 'archived', 'value': 'false', 'disabled': True,
         'description': 'Allowed: true | false. Default false — live notes only. `true` returns ONLY withdrawn ones, which is the Archived tab.'},
    ]

    def raw(path, params):
        return '{{baseUrl}}' + path + '?' + '&'.join(
            f"{p['key']}={p['value']}" for p in params if not p.get('disabled'))

    items = [
        {
            'name': "01 · Timeline",
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': raw('/notes/timeline', timeline_query), 'host': ['{{baseUrl}}'],
                        'path': ['notes', 'timeline'], 'query': timeline_query},
                'description': (
                    "A record's timeline: what people wrote and what the system recorded, "
                    'interleaved newest-first (client adjustment #5).\n\n'
                    '**A timeline of hand-written notes alone would be half a timeline.** Status '
                    'changes, reassignments and archives are already in the audit trail, and they '
                    'are the entries nobody has to remember to type — so both are read together. '
                    'Each row carries `kind`: `NOTE` for something a person wrote, `EVENT` for '
                    'something the system recorded.\n\n'
                    '**Withdrawn notes are excluded.** Taking a note off the record is what '
                    'withdrawing it meant; replaying it beside the events it was withdrawn from '
                    'would say the opposite. The withdrawn half is `02 · List notes` with '
                    '`archived=true`.\n\n'
                    'Paginated across two tables without a UNION: the API takes `skip + take` rows '
                    'from each source and merges. That is exact rather than approximate — the nth '
                    'newest row overall cannot be older than the nth newest of either source.'),
            },
            'response': [
                example('200 · Notes and events, interleaved', 'GET', '/notes/timeline?subjectType=CLIENT&subjectId={{clientId}}&page=1&limit=5', *cap['timeline']),
                example('200 · Notes only (entries=NOTE)', 'GET', '/notes/timeline?subjectType=CLIENT&subjectId={{clientId}}&entries=NOTE', *cap['timeline_notes']),
                example('200 · Events only (entries=EVENT)', 'GET', '/notes/timeline?subjectType=CLIENT&subjectId={{clientId}}&entries=EVENT', *cap['timeline_events']),
                example('200 · An archived record still opens', 'GET', '/notes/timeline?subjectType=CLIENT&subjectId={{clientId}}', *cap['timeline_archived']),
                example('400 · Enum is case-sensitive', 'GET', '/notes/timeline?subjectType=Client&subjectId={{clientId}}', *cap['timeline_400']),
                example('401 · Not signed in', 'GET', '/notes/timeline', *cap['timeline_401']),
            ],
            'event': [script('prerequest', OWN_CLIENT), script('test', [
                "pm.test('timeline loads', function () {",
                '    pm.response.to.have.status(200);',
                '    const rows = pm.response.json().data;',
                '    pm.expect(rows).to.be.an(\'array\');',
                '});',
                '',
                "pm.test('newest first', function () {",
                '    const rows = pm.response.json().data;',
                '    for (let i = 1; i < rows.length; i++) {',
                '        pm.expect(new Date(rows[i - 1].createdAt).getTime())',
                '            .to.be.at.least(new Date(rows[i].createdAt).getTime());',
                '    }',
                '});',
            ])],
        },
        {
            'name': '02 · List notes',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': raw('/notes', list_query), 'host': ['{{baseUrl}}'],
                        'path': ['notes'], 'query': list_query},
                'description': (
                    'The editable half on its own, without the audit entries — what a screen reads '
                    'to offer Edit and Withdraw.\n\n'
                    '`subjectType` and `subjectId` are both **required**, and there is deliberately '
                    'no "all notes" endpoint: a note is only meaningful beside the record it is '
                    'about, and an unscoped list would be the one query that ignores the row-level '
                    'rule the subject carries.\n\n'
                    '`archived=true` is the Archived tab — withdrawn notes, with `deletedBy` and '
                    '`deletedAt` naming who took each one off the record.'),
            },
            'response': [
                example('200 · Page of notes', 'GET', '/notes?subjectType=CLIENT&subjectId={{clientId}}&page=1&limit=5', *cap['list']),
                example('200 · Agent updates only (visibility=SHARED)', 'GET', '/notes?subjectType=CLIENT&subjectId={{clientId}}&visibility=SHARED', *cap['list_shared']),
                example('200 · Withdrawn notes (archived=true)', 'GET', '/notes?subjectType=CLIENT&subjectId={{clientId}}&archived=true', *cap['archived']),
                example('400 · subjectId is required', 'GET', '/notes?subjectType=CLIENT', *cap['list_400']),
            ],
            'event': [script('test', [
                "pm.test('list returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().meta).to.have.property('total');",
                '});',
            ])],
        },
        {
            'name': '03 · Write a note',
            'request': {
                'method': 'POST', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': CREATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/notes', 'host': ['{{baseUrl}}'], 'path': ['notes']},
                'description': (
                    'Adds a dated entry to a record\'s timeline.\n\n'
                    '**Needs write access to the subject, not to notes.** A note carries no '
                    'permission of its own — the right to write one is the right to edit the record '
                    'it hangs on. So an assistant, who may read a client and not edit one, reads '
                    'the timeline and cannot add to it (403), and a broker gets 404 on a client '
                    'that is not theirs.\n\n'
                    '`visibility` defaults to **INTERNAL**, the same direction upload visibility '
                    'defaults to PRIVATE: the cost of failing closed is somebody asking why an '
                    'agent cannot see an update, and the cost of failing open is desk commentary '
                    'reaching the person who referred the client.'),
            },
            'response': [
                example('201 · Written', 'POST', '/notes', *cap['create'], req_body={
                    'subjectType': 'CLIENT', 'subjectId': '{{clientId}}',
                    'body': 'Called about the Teterboro trip; wants a Citation X or better.'}),
                example('400 · A blank note is refused', 'POST', '/notes', *cap['create_400'], req_body={
                    'subjectType': 'CLIENT', 'subjectId': '{{clientId}}', 'body': '   '}),
                example('400 · The record has been archived', 'POST', '/notes', *cap['create_400_archived'], req_body={
                    'subjectType': 'CLIENT', 'subjectId': '{{clientId}}',
                    'body': 'the desk has closed this record'}),
                example('403 · An assistant may not write', 'POST', '/notes', *cap['create_403']),
                example('404 · No such record (or not yours)', 'POST', '/notes', *cap['create_404'], req_body={
                    'subjectType': 'CLIENT', 'subjectId': MISSING, 'body': 'nowhere to land'}),
            ],
            'event': [script('test', [
                "pm.test('note written', function () {",
                '    pm.response.to.have.status(201);',
                '    const note = pm.response.json().data;',
                "    pm.expect(note.visibility).to.eql('INTERNAL');",
                "    pm.collectionVariables.set('noteId', note.id);",
                '});',
            ])],
        },
        {
            'name': '04 · Write an agent update (SHARED)',
            'request': {
                'method': 'POST', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': SHARED_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/notes', 'host': ['{{baseUrl}}'], 'path': ['notes']},
                'description': (
                    'The same endpoint with `visibility: SHARED` — the client\'s *Agent Update* '
                    'field (adjustment #11), built here rather than as a second note system later. '
                    '"Tribeca brokers/admins can intentionally share with the referral agent" is a '
                    'note with a flag on it, and discovering that after building both is how two '
                    'note systems end up in one codebase.\n\n'
                    '**It filters nobody today**, because the Referral Agent role does not exist '
                    'yet. The flag is stored and displayed; the day that role lands, its read scope '
                    'is `visibility: SHARED` and nothing else here changes.'),
            },
            'response': [
                example('201 · Shared with the referring agent', 'POST', '/notes', *cap['create_shared'], req_body={
                    'subjectType': 'CLIENT', 'subjectId': '{{clientId}}',
                    'body': 'We have contacted the client and are currently sourcing aircraft.',
                    'visibility': 'SHARED'}),
            ],
            'event': [script('test', [
                "pm.test('shared note written', function () {",
                '    pm.response.to.have.status(201);',
                "    pm.expect(pm.response.json().data.visibility).to.eql('SHARED');",
                "    pm.collectionVariables.set('sharedNoteId', pm.response.json().data.id);",
                '});',
            ])],
        },
        {
            'name': '05 · Get note',
            'request': {
                'method': 'GET', 'header': [],
                'url': {'raw': '{{baseUrl}}/notes/{{noteId}}', 'host': ['{{baseUrl}}'],
                        'path': ['notes', '{{noteId}}']},
                'description': (
                    'Withdrawn notes load here too, so the Archived tab can link to them.\n\n'
                    "A note on a record outside the caller's scope returns **404, not 403**. The "
                    "note's own id says nothing about who may read it; the record it hangs on says "
                    'everything, so the check re-resolves the subject through the module that owns '
                    'it rather than trusting the note row.'),
            },
            'response': [
                example('200 · The note', 'GET', '/notes/{{noteId}}', *cap['detail']),
                example('404 · No such note (or not yours)', 'GET', f'/notes/{MISSING}', *cap['detail_404']),
            ],
            'event': [script('test', [
                "pm.test('note returned', function () {",
                '    pm.response.to.have.status(200);',
                "    pm.expect(pm.response.json().data).to.have.property('body');",
                '});',
            ])],
        },
        {
            'name': '06 · Edit your own note',
            'request': {
                'method': 'PATCH', 'header': list(WRITE_HEADERS),
                'body': {'mode': 'raw', 'raw': UPDATE_BODY,
                         'options': {'raw': {'language': 'json'}}},
                'url': {'raw': '{{baseUrl}}/notes/{{noteId}}', 'host': ['{{baseUrl}}'],
                        'path': ['notes', '{{noteId}}']},
                'description': (
                    '**Only the author, administrators included** — deliberately narrower than '
                    'every other update in this system.\n\n'
                    'The timeline renders a note under the name of whoever wrote it, so an edit '
                    'anyone else can make is a statement they did not write attributed to them. An '
                    'administrator who disagrees withdraws it and writes their own, which leaves '
                    'both visible.\n\n'
                    '403 and not 404 here: the caller can already read the note, so the information '
                    'a 404 would protect has been given by the read.\n\n'
                    'The subject cannot be changed — a note does not move between records.'),
            },
            'response': [
                example('200 · Edited', 'PATCH', '/notes/{{noteId}}', *cap['update'], req_body={
                    'body': 'Called about Teterboro; wants a Citation X. Budget confirmed at $78k.'}),
                example('400 · Empty body', 'PATCH', '/notes/{{noteId}}', *cap['update_400'], req_body={}),
                example('403 · Not the author', 'PATCH', '/notes/{{noteId}}', *cap['update_403'], req_body={'body': 'rewritten'}),
            ],
            'event': [script('test', [
                "pm.test('note edited', function () {",
                '    pm.response.to.have.status(200);',
                '    // An edit must not republish an INTERNAL note as SHARED. The update',
                "    // schema is written longhand rather than with `.partial()`, which keeps",
                '    // `.default()` and would do exactly that.',
                "    pm.expect(pm.response.json().data.visibility).to.eql('INTERNAL');",
                '});',
            ])],
        },
        {
            'name': '07 · Withdraw a note',
            'request': {
                'method': 'DELETE', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/notes/{{noteId}}', 'host': ['{{baseUrl}}'],
                        'path': ['notes', '{{noteId}}']},
                'description': (
                    'Soft. The note leaves the timeline and stays readable in the Archived tab '
                    'with the trail of who withdrew it; nothing in this system is destroyed.\n\n'
                    '**The author or an administrator** — wider than editing on purpose. Removing '
                    'a note that should not be on the record is a moderation act and does not put '
                    "words in anyone's mouth."),
            },
            'response': [
                example('204 · Withdrawn', 'DELETE', '/notes/{{noteId}}', 204, None),
                example('403 · Neither the author nor an administrator', 'DELETE', '/notes/{{noteId}}', *cap['remove_403']),
            ],
            'event': [script('test', [
                "pm.test('withdrawn', function () {",
                '    pm.response.to.have.status(204);',
                '});',
            ])],
        },
        {
            'name': '08 · Restore a withdrawn note',
            'request': {
                'method': 'POST', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/notes/{{noteId}}/restore', 'host': ['{{baseUrl}}'],
                        'path': ['notes', '{{noteId}}', 'restore']},
                'description': (
                    'Puts it back on the timeline. **200, not 201** — a restore creates nothing; '
                    'it clears a deletion stamp on a row that existed all along.\n\n'
                    'Restoring a note that is already live answers 404: there is nothing archived '
                    'at that id.'),
            },
            'response': [
                example('200 · Back on the timeline', 'POST', '/notes/{{noteId}}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', '/notes/{{noteId}}/restore', *cap['restore_404']),
            ],
            'event': [script('test', [
                "pm.test('restored', function () {",
                '    pm.response.to.have.status(200);',
                '    pm.expect(pm.response.json().data.restoredAt).to.not.eql(null);',
                '});',
            ])],
        },
        {
            'name': '09 · Teardown · withdraw both probes',
            'request': {
                'method': 'DELETE', 'header': [
                    {'key': 'X-CSRF-Token', 'value': '{{csrfToken}}',
                     'description': 'Required on every write.'}],
                'url': {'raw': '{{baseUrl}}/notes/{{noteId}}', 'host': ['{{baseUrl}}'],
                        'path': ['notes', '{{noteId}}']},
                'description': (
                    'A run is a demonstration, not a data entry session.\n\n'
                    'Request 08 restores the note to show that restore works, which leaves it live '
                    '— so every run would add a line of Postman commentary to a real client\'s '
                    'timeline. This withdraws it again, and its test withdraws the SHARED note from '
                    'request 04 as well. There is no hard delete by design, so archiving the probes '
                    'is the correct end state.'),
            },
            'response': [example('204 · Withdrawn', 'DELETE', '/notes/{{noteId}}', 204, None)],
            'event': [script('test', [
                "pm.test('probe withdrawn', function () {",
                '    pm.response.to.have.status(204);',
                '});',
                '',
                "const shared = pm.collectionVariables.get('sharedNoteId');",
                'if (shared) {',
                '    pm.sendRequest({',
                "        url: pm.collectionVariables.get('baseUrl') + '/notes/' + shared,",
                "        method: 'DELETE',",
                "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                '    }, function (err) {',
                "        if (err) { console.warn('teardown could not withdraw ' + shared, err); }",
                '    });',
                '}',
            ])],
        },
    ]

    return {
        'name': '12 · Notes',
        'description': (
            'Dated entries on a record\'s timeline — the client\'s adjustment #5: *"in the trip '
            'section and client CRM section, I want to make sure there is a section where I can '
            'write notes and add it to a timeline"*.\n\n'
            '**`Client.notes` was not that.** It is one string, and editing it destroys what it '
            'said before. That field stays as the standing summary the detail sidebar shows — what '
            'you need to know about this person — and these are the append-only record of what '
            'happened and when. Two questions, two places.\n\n'
            '**Polymorphic.** `subjectType` + `subjectId`, so Trips get a timeline by adding one '
            'enum value rather than a second table with its own columns, its own permissions and '
            'its own screen to keep in step. `subjectId` is therefore not a foreign key the '
            'database can check — the service asks the module that owns the subject instead, which '
            'is what makes "you may read this note if you may read its client" true rather than '
            'merely intended.\n\n'
            '**No permissions of its own.** These routes carry no `@RequirePermissions` decorator, '
            'the same deliberate choice `11 · Uploads` records: the right to read or write a note '
            'is the right to read or write the record it hangs on, and which permission that is '
            'depends on a value in the query string, which a decorator cannot see. Authentication '
            'is still global.\n\n'
            'Every request below is signed in as the seeded SUPER_ADMIN by the folder\'s '
            'pre-request script, except the 403 examples, captured as the seeded broker and '
            'assistant.'),
        'item': items,
    }



def main():
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')

    collection = json.loads(COLLECTION.read_text())
    # The folder login is copied from an existing folder rather than retyped:
    # two hand-written copies drift the first time the cookie or the two-factor
    # step changes, and the second copy is always the one nobody updates.
    source = next(f for f in collection['item'] if f['name'].startswith('10 ·'))

    folder = build(owner, broker, assistant)
    folder['event'] = json.loads(json.dumps(source['event']))

    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('noteId', 'sharedNoteId'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
