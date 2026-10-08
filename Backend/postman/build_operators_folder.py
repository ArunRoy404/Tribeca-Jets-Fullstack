#!/usr/bin/env python3
"""
Builds `06 · Operators`, capturing every example from a live API.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_operators_folder.py
    cd postman && python3 rewrite_body_comments.py

Replaces `build_reference_folders.py`, whose examples were read from a capture
directory on another machine (deleted with Operators' review, 8 Oct 2026).

Reads need only a staff session; writes need the caller's own Operators
permission. The seeded assistant holds Operators · View only and the seeded
broker View, Add and Edit — so they supply the 403s; the referral agent
supplies the staff-only refusal.

The folder creates its own operator and archives it in its last request — a
request of its own, not a script that fires as the run ends, which a folder
run alone could cut off and leave the probe live.
"""

from __future__ import annotations

import json
import pathlib

from builder_common import MISSING, WRITE_HEADERS, Session, ensure_variables, example, script, status_test, url
from collection_order import place_folder
from session_setup import with_session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
OWNER = 'admin@example.com'
BROKER = 'broker@example.com'
ASSISTANT = 'assistant@example.com'
AGENT = 'agent@example.com'

FOLDER_DOC = """Charter operators — the companies that fly the aircraft. Shared desk data: the same rows for every staff member.

### Who may do what (since 8 Oct 2026)

| | Needs |
|---|---|
| List, stats, one operator | **A staff session only** — aircraft, sourcing, quotes, trips, empty legs and payments all pick an operator |
| Add | `Operators · Create` in the caller's own permissions |
| Edit | `Operators · Edit` |
| Remove, restore, bulk | `Operators · Archive` |

**A referral agent is refused every route** (403): an operator's contacts and terms are desk data.

### Fixed choices (case-sensitive)

| Field | Values |
|---|---|
| `status` | ACTIVE · PREFERRED · INACTIVE · SUSPENDED (do not book until further notice) |
| `safetyRating` | a number 0–5, optional — the desk's own rating, like `reliabilityRating`; blank is not rated |
| `responseSpeed` | FAST · AVERAGE · SLOW |
| `paymentTerms` | PREPAID · DUE_ON_RECEIPT · NET_7 · NET_15 · NET_30 |

`totalPaid` is null unless the caller sees every operator bill. Documents are filed through `Document Vault` with `operatorId`.

This folder runs as the seeded owner; refusals were captured as the assistant, the broker and the referral agent."""

QUERY = [
    {'key': 'page', 'value': '1', 'description': 'Page number, 1-based. Integer ≥1. Default 1.'},
    {'key': 'limit', 'value': '10', 'description': 'Rows per page. Integer 1-100. Default 10. >100 or <1 → 400.'},
    {'key': 'search', 'value': '', 'disabled': True, 'description': 'Case-insensitive substring across name, home base, contact name and both emails. Max 200 chars.'},
    {'key': 'status', 'value': '', 'disabled': True, 'description': 'Allowed (case-sensitive): ACTIVE | PREFERRED | INACTIVE | SUSPENDED. Omit for all.'},
    {'key': 'sortBy', 'value': 'createdAt', 'description': 'Allowed (case-sensitive): createdAt | updatedAt | name | status | reliabilityRating. Default createdAt (newest first). Anything else → 400.'},
    {'key': 'sortOrder', 'value': 'desc', 'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
    {'key': 'archived', 'value': 'false', 'disabled': True, 'description': 'Allowed: true | false. Default false (live rows). true returns only archived ones — the Archived tab.'},
]

CREATE = {
    'name': 'Postman Probe Aviation',
    'status': 'PREFERRED',
    'homeBase': 'Teterboro, NJ',
    'website': 'www.example.com',
    'generalEmail': 'ops@probe.example.com',
    'generalPhone': '+1 (201) 555-0100',
    'primaryContact': 'Dana Ruiz',
    'contactEmail': 'dana@probe.example.com',
    'contactPhone': '+1 (201) 555-0184',
    'aircraftTypes': ['Challenger 350', 'Global 7500'],
    'serviceRoutes': ['KTEB ↔ KOPF'],
    'reliabilityRating': 4.6,
    'safetyRating': 4.9,
    'responseSpeed': 'FAST',
    'paymentTerms': 'NET_30',
    'cancellationPolicy': '30+ days — 10%\n14-30 days — 25%\nUnder 72 hours — non-refundable',
    'sourcingNotes': 'Probe written by the Postman run; archived at the end.',
}

CREATE_RAW = """{
  "name": "Postman Probe Aviation",                     // required · 1-200 chars. Not unique.
  "status": "PREFERRED",                                // optional · ACTIVE | PREFERRED | INACTIVE | SUSPENDED. Default ACTIVE.
  "homeBase": "Teterboro, NJ",                          // required · 1-120 chars
  "website": "www.example.com",                         // optional · max 200 chars
  "generalEmail": "ops@probe.example.com",              // optional · email. The company's dispatch address.
  "generalPhone": "+1 (201) 555-0100",                  // optional · max 40 chars
  "primaryContact": "Dana Ruiz",                        // required · 1-120 chars. The named account manager.
  "contactEmail": "dana@probe.example.com",             // required · email
  "contactPhone": "+1 (201) 555-0184",                  // optional · max 40 chars
  "aircraftTypes": ["Challenger 350", "Global 7500"],   // optional · up to 40 strings of 1-80 chars
  "serviceRoutes": ["KTEB ↔ KOPF"],                     // optional · up to 40 strings of 1-80 chars
  "reliabilityRating": 4.6,                             // optional · number 0-5, the desk's own rating
  "safetyRating": 4.9,                                  // optional · number 0-5, the desk's own safety rating. Blank = not rated.
  "responseSpeed": "FAST",                              // optional · FAST | AVERAGE | SLOW
  "paymentTerms": "NET_30",                             // optional · PREPAID | DUE_ON_RECEIPT | NET_7 | NET_15 | NET_30
  "cancellationPolicy": "30+ days — 10%\\n14-30 days — 25%\\nUnder 72 hours — non-refundable", // optional · max 5000 chars, pasted verbatim
  "sourcingNotes": "Probe written by the Postman run; archived at the end." // optional · max 2000 chars. "Notes" on screen.
}"""

PATCH = {'status': 'SUSPENDED', 'paymentTerms': 'NET_15', 'safetyRating': 4.5}
PATCH_RAW = """{
  // Every field optional; send at least one. null clears an optional field
  // (paymentTerms, responseSpeed, safetyRating, website, …).
  // homeBase, primaryContact and contactEmail can be changed, never cleared.

  "status": "SUSPENDED",
  "paymentTerms": "NET_15",
  "safetyRating": 4.5
}"""


def capture() -> dict:
    owner, broker, assistant, agent, anonymous = (
        Session(OWNER), Session(BROKER), Session(ASSISTANT), Session(AGENT), Session(None))
    cap: dict = {}

    cap['create'] = owner.request('POST', '/operators', CREATE)
    probe = cap['create'][1]['data']
    try:
        cap['create_400'] = owner.request('POST', '/operators', {'name': '', 'homeBase': 'X', 'safetyRating': 9, 'paymentTerms': 'Net 30'})
        cap['create_403'] = assistant.request('POST', '/operators', CREATE)

        cap['list'] = owner.request('GET', '/operators?page=1&limit=2')
        cap['list_assistant'] = assistant.request('GET', '/operators?page=1&limit=1')
        cap['list_agent'] = agent.request('GET', '/operators')
        cap['list_sort'] = owner.request('GET', '/operators?sortBy=email')
        cap['list_401'] = anonymous.request('GET', '/operators')
        cap['stats'] = owner.request('GET', '/operators/stats')

        cap['detail'] = owner.request('GET', f"/operators/{probe['id']}")
        cap['detail_404'] = owner.request('GET', f'/operators/{MISSING}')
        cap['detail_agent'] = agent.request('GET', f"/operators/{probe['id']}")

        cap['patch'] = owner.request('PATCH', f"/operators/{probe['id']}", PATCH)
        cap['patch_clear'] = owner.request('PATCH', f"/operators/{probe['id']}", {'homeBase': None})
        cap['patch_empty'] = owner.request('PATCH', f"/operators/{probe['id']}", {})
        cap['patch_403'] = assistant.request('PATCH', f"/operators/{probe['id']}", PATCH)

        cap['remove_403'] = broker.request('DELETE', f"/operators/{probe['id']}")
        cap['remove'] = owner.request('DELETE', f"/operators/{probe['id']}")
        cap['restore_403'] = broker.request('POST', f"/operators/{probe['id']}/restore")
        cap['restore'] = owner.request('POST', f"/operators/{probe['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/operators/{probe['id']}/restore")

        ids = {'ids': [probe['id']]}
        cap['bulk_ids'] = ids
        cap['bulk_remove_403'] = broker.request('POST', '/operators/bulk-delete', ids)
        cap['bulk_remove'] = owner.request('POST', '/operators/bulk-delete', ids)
        cap['bulk_remove_partial'] = owner.request('POST', '/operators/bulk-delete', ids)
        cap['bulk_remove_400'] = owner.request('POST', '/operators/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/operators/bulk-restore', ids)
        cap['bulk_restore_partial'] = owner.request('POST', '/operators/bulk-restore', ids)
        cap['bulk_restore_403'] = broker.request('POST', '/operators/bulk-restore', ids)
    finally:
        cap['teardown'] = owner.request('DELETE', f"/operators/{probe['id']}")
    return cap


def request(name, method, path, description, responses, *, query=None, body=None, events=None):
    item = {'name': name, 'request': {
        'method': method, 'header': WRITE_HEADERS if method != 'GET' else [],
        'url': url(path, query), 'description': description,
    }, 'response': responses}
    if body is not None:
        item['request']['body'] = {'mode': 'raw', 'raw': body, 'options': {'raw': {'language': 'json'}}}
    if events:
        item['event'] = events
    return item


def build(cap: dict) -> dict:
    probe = '/operators/{{newOperatorId}}'
    bulk_raw = '{\n  "ids": ["{{newOperatorId}}"]  // required · 1-100 UUIDs. Ids that match nothing come back in `skipped`.\n}'
    return {
        'name': '06 · Operators',
        'description': FOLDER_DOC,
        'item': [
            request(
                '01 · Add operator', 'POST', '/operators',
                'Needs **Operators · Create**. Safety and reliability are 0–5 numbers; response speed and payment terms '
                'are fixed choices — a typed "Net 30" is a 400. The folder works on this probe from here on.',
                [
                    example('201 · Created', 'POST', '/operators', *cap['create'], req_body=CREATE),
                    example('400 · Validation failed', 'POST', '/operators', *cap['create_400'],
                            req_body={'name': '', 'homeBase': 'X', 'safetyRating': 9, 'paymentTerms': 'Net 30'}),
                    example('403 · An assistant (no Operators · Create)', 'POST', '/operators', *cap['create_403']),
                ],
                body=CREATE_RAW,
                events=[script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "if (pm.response.code === 201) pm.collectionVariables.set('newOperatorId', pm.response.json().data.id);",
                ])],
            ),
            request(
                '02 · List operators', 'GET', '/operators',
                'Paginated. **Any staff member** — the pickers read it; a referral agent is refused. '
                '`totalTrips` counts uncancelled trips; `totalPaid` is null unless the caller sees every operator bill.',
                [
                    example('200 · Page of operators', 'GET', '/operators?page=1&limit=2', *cap['list']),
                    example('200 · An assistant (reads need only a staff session)', 'GET', '/operators?page=1&limit=1', *cap['list_assistant']),
                    example('400 · Unsortable column', 'GET', '/operators?sortBy=email', *cap['list_sort']),
                    example('401 · Not signed in', 'GET', '/operators', *cap['list_401']),
                    example('403 · A referral agent (desk data)', 'GET', '/operators', *cap['list_agent']),
                ],
                query=QUERY, events=[status_test(200, '200 OK')],
            ),
            request(
                '03 · Operator stats', 'GET', '/operators/stats',
                'The tiles: total, then one count per status (suspended is its own, not folded into inactive), and '
                '`totalFleet` — every aircraft on file.',
                [example('200 · Stats', 'GET', '/operators/stats', *cap['stats'])],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '04 · Get operator', 'GET', probe,
                'One operator with its fleet (through Aircraft), its sourcing scorecard (through Operator Sourcing) and '
                'totals. Archived operators open too — the Archived tab links here.',
                [
                    example('200 · Operator', 'GET', '/operators/:id', *cap['detail']),
                    example('404 · Not found', 'GET', '/operators/:id', *cap['detail_404']),
                    example('403 · A referral agent', 'GET', '/operators/:id', *cap['detail_agent']),
                ],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '05 · Update operator', 'PATCH', probe,
                'Needs **Operators · Edit**. Send only what changes. Home base, contact name and contact email can be '
                'changed but never cleared — they are required on create.',
                [
                    example('200 · Suspended, new terms', 'PATCH', '/operators/:id', *cap['patch'], req_body=PATCH),
                    example('400 · A required field cleared', 'PATCH', '/operators/:id', *cap['patch_clear'], req_body={'homeBase': None}),
                    example('400 · Empty patch', 'PATCH', '/operators/:id', *cap['patch_empty'], req_body={}),
                    example('403 · An assistant (no Operators · Edit)', 'PATCH', '/operators/:id', *cap['patch_403'], req_body=PATCH),
                ],
                body=PATCH_RAW, events=[status_test(200, '200 OK')],
            ),
            request(
                '06 · Remove operator (soft)', 'DELETE', probe,
                'Needs **Operators · Archive** (administrators by default). Soft: aircraft, trips, quotes and payments '
                'that name it keep working.',
                [
                    example('204 · Removed', 'DELETE', '/operators/:id', *cap['remove']),
                    example('403 · A broker (no Operators · Archive)', 'DELETE', '/operators/:id', *cap['remove_403']),
                ],
                events=[status_test(204, '204 No Content')],
            ),
            request(
                '07 · Restore operator', 'POST', probe + '/restore',
                'Needs **Operators · Archive**. Clears the deletion stamp and nothing else. 200, not 201. Not archived → 404.',
                [
                    example('200 · Restored', 'POST', '/operators/:id/restore', *cap['restore']),
                    example('404 · Not archived', 'POST', '/operators/:id/restore', *cap['restore_404']),
                    example('403 · A broker', 'POST', '/operators/:id/restore', *cap['restore_403']),
                ],
                events=[status_test(200, '200 OK')],
            ),
            request(
                '08 · Remove several operators (soft)', 'POST', '/operators/bulk-delete',
                'Needs **Operators · Archive**. POST, not DELETE. Partial success is success: ids matching nothing come back in `skipped`.',
                [
                    example('200 · Removed', 'POST', '/operators/bulk-delete', *cap['bulk_remove'], req_body=cap['bulk_ids']),
                    example('200 · Already removed (partial)', 'POST', '/operators/bulk-delete', *cap['bulk_remove_partial'], req_body=cap['bulk_ids']),
                    example('400 · Nothing selected', 'POST', '/operators/bulk-delete', *cap['bulk_remove_400'], req_body={'ids': []}),
                    example('403 · A broker', 'POST', '/operators/bulk-delete', *cap['bulk_remove_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw, events=[status_test(200, '200 OK')],
            ),
            request(
                '09 · Restore several operators', 'POST', '/operators/bulk-restore',
                'Needs **Operators · Archive**. The Archived tab\'s bulk action; ids that are not archived come back in `skipped`.',
                [
                    example('200 · Restored', 'POST', '/operators/bulk-restore', *cap['bulk_restore'], req_body=cap['bulk_ids']),
                    example('200 · Already live (partial)', 'POST', '/operators/bulk-restore', *cap['bulk_restore_partial'], req_body=cap['bulk_ids']),
                    example('403 · A broker', 'POST', '/operators/bulk-restore', *cap['bulk_restore_403'], req_body=cap['bulk_ids']),
                ],
                body=bulk_raw.replace('match nothing', 'are not archived'), events=[status_test(200, '200 OK')],
            ),
            request(
                '10 · Teardown — archive the probe', 'DELETE', probe,
                'The run is a demonstration: the probe ends archived, in the Archived tab, never live. A request of '
                'its own so it always runs, even when this folder is run alone.',
                [example('204 · Archived', 'DELETE', '/operators/:id', *cap['teardown'])],
                events=[script('test', [
                    "pm.test('archived', () => pm.response.to.have.status(204));",
                    "pm.collectionVariables.set('newOperatorId', '');",
                ])],
            ),
        ],
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {'newOperatorId': '', 'operatorId': ''})
    folder = with_session(build(capture()), 'owner')
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
