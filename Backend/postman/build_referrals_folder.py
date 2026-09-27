#!/usr/bin/env python3
"""
Builds `18 · Referrals` (client adjustment #11) — the referral agent's side
and the desk's, plus the portal's Resources — capturing every example from a
live API.

    npm run db:seed          # the seeded referral agent, agent@tribecajets.com
    npm run start:dev
    python3 postman/build_referrals_folder.py
    cd postman && python3 rewrite_body_comments.py

Re-runnable: every referral, the client and trip request a conversion creates,
the trip it books, the commission that raises, and the resource it publishes
are archived at the end — in the builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    FIXTURES, MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables,
    example, script, sign_in_as, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
AGENT_EMAIL = 'agent@tribecajets.com'
DOCUMENT = FIXTURES / 'sample-document.pdf'
STATUSES = 'SUBMITTED | CONTACTED | QUOTING | BOOKED | COMPLETED | LOST | CANCELLED'
CATEGORIES = 'TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER'
AS_AGENT = sign_in_as('agentEmail', 'agent')

SUBMIT_BODY = """{
  "clientFirstName": "Olivia",                         // required · max 100
  "clientLastName": "Harper",                          // required · max 100
  "clientPhone": "+1 212 555 0142",                    // phone or email required · max 40
  "clientEmail": "olivia.harper@example.com",          // phone or email required
  "originAirportId": "{{airportId}}",                  // optional · uuid, a live airport
  "destinationAirportId": "{{airportId2}}",            // optional · uuid, not the origin
  "departureDate": "2027-01-15",                       // optional · YYYY-MM-DD
  "returnDate": "2027-01-19",                          // optional · YYYY-MM-DD, not before the departure
  "departureTime": "10:30",                            // optional · "HH:MM", 24-hour
  "passengers": 4,                                     // optional · integer 1-500
  "aircraftPreference": "MIDSIZE_JET",                 // optional · TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER
  "budget": 45000,                                     // optional · number, 2 decimals max
  "notes": "Flexible by a day either way.",            // optional · max 5000
  "attachmentUrls": ["{{referralAttachmentUrl}}"]      // optional · up to 10 "/api/uploads/<id>" the submitter uploaded
}"""

UPDATE_BODY = """{
  // Desk only. Every field optional.
  "status": "QUOTING",                                 // optional · SUBMITTED | CONTACTED | QUOTING | BOOKED | COMPLETED | LOST | CANCELLED
  "assignedBrokerId": null                             // optional · uuid or null. Anyone but yourself needs ALL scope.
}"""

RESOURCE_BODY = """{
  "title": "Tribeca Jets brochure",                    // required · max 200
  "description": "Our fleet access and service, for your clients.",  // optional · max 1000
  "fileUrl": "{{resourceFileUrl}}"                     // required · a PUBLIC upload, "/api/uploads/<id>"
}"""

AIRPORTS = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (err, res) {",
    '    if (err || res.code !== 200) { return; }',
    '    const rows = res.json().data;',
    "    if (rows.length >= 2) { pm.collectionVariables.set('airportId', rows[0].id); pm.collectionVariables.set('airportId2', rows[1].id); }",
    '});',
]

# A trip on the converted client, for `12` to link.
BOOKED_TRIP = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    'pm.sendRequest({',
    "    url: base + '/trips', method: 'POST', header: headers,",
    '    body: { mode: \'raw\', raw: JSON.stringify({',
    "        clientId: pm.collectionVariables.get('referralClientId'), type: 'ONE_WAY', status: 'BOOKED',",
    "        legs: [{ originAirportId: pm.collectionVariables.get('airportId'), destinationAirportId: pm.collectionVariables.get('airportId2'), departureDate: '2027-01-15' }],",
    '        basePrice: 52000, operatorCost: 42000,',
    '    }) },',
    '}, function (err, res) {',
    "    if (!err && res.code === 201) { pm.collectionVariables.set('referralTripId', res.json().data.id); }",
    '});',
]

TEARDOWN = [
    '// Archive everything this folder created — referral, the client and trip',
    '// request its conversion made, the trip it booked, the commission that',
    '// raised, the published resource. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    'const archive = function (path) { pm.sendRequest({ url: base + path, method: \'DELETE\', header: headers }, function () {}); };',
    "const referral = pm.collectionVariables.get('newReferralId');",
    'if (referral) {',
    "    pm.sendRequest({ url: base + '/commissions?referralId=' + referral, method: 'GET' }, function (err, res) {",
    "        if (!err && res.code === 200) { res.json().data.forEach(function (c) { archive('/commissions/' + c.id); }); }",
    "        archive('/referrals/' + referral);",
    '    });',
    '}',
    "[['referralTripId', '/trips/'], ['referralTripRequestId', '/trip-requests/'], ['referralClientId', '/clients/'], ['newResourceId', '/referral-resources/']]",
    '    .forEach(function (pair) { const id = pm.collectionVariables.get(pair[0]); if (id) { archive(pair[1] + id); } });',
]


def me(session: Session) -> dict:
    data = session.request('GET', '/auth/me')[1]['data']
    return data.get('user', data)


def upload_form(visibility: str, label: str) -> list:
    return [
        {'key': 'file', 'type': 'file',
         'src': (pathlib.PurePosixPath('postman/fixtures') / DOCUMENT.name).as_posix(),
         'description': 'required · PDF, DOCX, XLSX, CSV or TXT. The type is read from the bytes.'},
        {'key': 'visibility', 'value': visibility, 'type': 'text',
         'description': 'optional · PUBLIC | PRIVATE. A referral agent\'s upload is always PRIVATE, whatever is sent.'},
        {'key': 'label', 'value': label, 'type': 'text', 'description': 'optional · max 200'},
    ]


def build(owner: Session, broker: Session, agent: Session, anonymous: Session):
    cap = {}
    referrals, commissions, trips, requests, clients, resources = [], [], [], [], [], []
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    a, b = airports[0]['id'], airports[1]['id']

    try:
        # ---- The agent's side --------------------------------------------
        cap['upload'] = agent.upload('/uploads/document', DOCUMENT, {'visibility': 'PRIVATE', 'label': 'Client itinerary notes'})
        attachment = cap['upload'][1]['data']
        payload = {
            'clientFirstName': 'Olivia', 'clientLastName': 'Harper',
            'clientPhone': '+1 212 555 0142', 'clientEmail': 'olivia.harper@example.com',
            'originAirportId': a, 'destinationAirportId': b,
            'departureDate': '2027-01-15', 'returnDate': '2027-01-19', 'departureTime': '10:30',
            'passengers': 4, 'aircraftPreference': 'MIDSIZE_JET', 'budget': 45000,
            'notes': 'Flexible by a day either way.', 'attachmentUrls': [attachment['url']],
        }
        cap['submit'] = agent.request('POST', '/referrals', payload)
        referral = cap['submit'][1]['data']
        referrals.append(referral['id'])
        no_contact = {'clientFirstName': 'Olivia', 'clientLastName': 'Harper'}
        cap['submit_400'] = agent.request('POST', '/referrals', no_contact)

        cap['agent_list'] = agent.request('GET', '/referrals?page=1&limit=10')
        cap['agent_stats'] = agent.request('GET', '/referrals/stats')
        cap['agent_detail'] = agent.request('GET', f"/referrals/{referral['id']}")

        # ---- The desk's side ---------------------------------------------
        cap['list'] = owner.request('GET', '/referrals?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/referrals?sortBy=budget')
        cap['list_401'] = anonymous.request('GET', '/referrals')
        cap['stats'] = owner.request('GET', '/referrals/stats')
        cap['detail'] = owner.request('GET', f"/referrals/{referral['id']}")
        cap['detail_404'] = owner.request('GET', f'/referrals/{MISSING}')
        cap['attachment_404'] = owner.request('GET', f"/referrals/{referral['id']}/attachments/{MISSING}")

        cap['convert_403'] = agent.request('POST', f"/referrals/{referral['id']}/convert", {})
        cap['convert'] = owner.request('POST', f"/referrals/{referral['id']}/convert", {})
        converted = cap['convert'][1]['data']
        clients.append(converted['clientId'])
        requests.append(converted['tripRequestId'])
        cap['convert_409'] = owner.request('POST', f"/referrals/{referral['id']}/convert", {})

        update = {'status': 'QUOTING'}
        cap['update'] = owner.request('PATCH', f"/referrals/{referral['id']}", update)
        cap['update_400'] = owner.request('PATCH', f"/referrals/{referral['id']}", {})
        cap['update_403'] = agent.request('PATCH', f"/referrals/{referral['id']}", update)

        trip = owner.request('POST', '/trips', {
            'clientId': converted['clientId'], 'type': 'ONE_WAY', 'status': 'BOOKED',
            'legs': [{'originAirportId': a, 'destinationAirportId': b, 'departureDate': '2027-01-15'}],
            'basePrice': 52000, 'operatorCost': 42000,
        })[1]['data']
        trips.append(trip['id'])
        cap['link'] = owner.request('PATCH', f"/referrals/{referral['id']}", {'tripId': trip['id']})
        raised = owner.request('GET', f"/commissions?referralId={referral['id']}")[1]['data']
        commissions.extend(row['id'] for row in raised)

        # A second referral, never converted, which cannot take a trip yet.
        fresh = agent.request('POST', '/referrals', {**no_contact, 'clientPhone': '+1 305 555 0199'})[1]['data']
        referrals.append(fresh['id'])
        cap['link_400'] = owner.request('PATCH', f"/referrals/{fresh['id']}", {'tripId': trip['id']})

        cap['remove_403'] = broker.request('DELETE', f"/referrals/{fresh['id']}")
        cap['remove'] = owner.request('DELETE', f"/referrals/{fresh['id']}")
        cap['restore'] = owner.request('POST', f"/referrals/{fresh['id']}/restore")
        cap['restore_404'] = owner.request('POST', f"/referrals/{fresh['id']}/restore")
        cap['bulk'] = owner.request('POST', '/referrals/bulk-delete', {'ids': [fresh['id'], MISSING]})
        cap['bulk_400'] = owner.request('POST', '/referrals/bulk-delete', {'ids': []})
        cap['bulk_restore'] = owner.request('POST', '/referrals/bulk-restore', {'ids': [fresh['id']]})

        # ---- Resources ---------------------------------------------------
        cap['resource_upload'] = owner.upload('/uploads/document', DOCUMENT, {'visibility': 'PUBLIC', 'label': 'Tribeca Jets brochure'})
        file_url = cap['resource_upload'][1]['data']['url']
        resource_payload = {'title': 'Tribeca Jets brochure',
                            'description': 'Our fleet access and service, for your clients.', 'fileUrl': file_url}
        cap['resource_create'] = owner.request('POST', '/referral-resources', resource_payload)
        resource = cap['resource_create'][1]['data']
        resources.append(resource['id'])
        cap['resource_400'] = owner.request('POST', '/referral-resources', {**resource_payload, 'fileUrl': attachment['url']})
        cap['resource_403'] = broker.request('POST', '/referral-resources', resource_payload)
        cap['resource_list'] = agent.request('GET', '/referral-resources?page=1&limit=10')
        cap['resource_update'] = owner.request('PATCH', f"/referral-resources/{resource['id']}", {'description': None})
        cap['resource_update_400'] = owner.request('PATCH', f"/referral-resources/{resource['id']}", {})
        cap['resource_remove'] = owner.request('DELETE', f"/referral-resources/{resource['id']}")
        cap['resource_restore'] = owner.request('POST', f"/referral-resources/{resource['id']}/restore")
    finally:
        for row_id in commissions:
            owner.request('DELETE', f'/commissions/{row_id}')
        for row_id in referrals:
            owner.request('DELETE', f'/referrals/{row_id}')
        for row_id in trips:
            owner.request('DELETE', f'/trips/{row_id}')
        for row_id in requests:
            owner.request('DELETE', f'/trip-requests/{row_id}')
        for row_id in clients:
            owner.request('DELETE', f'/clients/{row_id}')
        for row_id in resources:
            owner.request('DELETE', f'/referral-resources/{row_id}')

    rid = referral['id']
    fid = fresh['id']
    res_id = resource['id']
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · reference ("RF-1001" or "1001"), the client\'s name, email or phone.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES} (case-sensitive).'},
        {'key': 'agentId', 'value': None, 'disabled': True, 'description': 'optional · uuid. The desk\'s filter; ignored for a referral agent, who only ever sees their own.'},
        {'key': 'assignedBrokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid. Desk only.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false. Ignored for a referral agent.'},
        {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | reference | departureDate | status. Default createdAt.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
    ]

    def body(raw):
        return {'mode': 'raw', 'raw': raw, 'options': {'raw': {'language': 'json'}}}

    items = [
        {
            'name': '01 · Upload an attachment (as the agent)',
            'event': [
                script('prerequest', AS_AGENT),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('referralAttachmentUrl', pm.response.json().data.url);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': [WRITE_HEADERS[1]],
                'body': {'mode': 'formdata', 'formdata': upload_form('PRIVATE', 'Client itinerary notes')},
                'url': url('/uploads/document'),
                'description': (
                    'The Submit Referral form uploads before it submits, as every form here does. A referral '
                    'agent\'s upload is forced PRIVATE with no owner: only they and an administrator can open it '
                    'directly, and the desk opens it through the referral (`09`).'),
            },
            'response': [example('201 · Uploaded, private to the agent', 'POST', '/uploads/document', *cap['upload'])],
        },
        {
            'name': '02 · Submit a referral (as the agent)',
            'event': [
                script('prerequest', AS_AGENT + AIRPORTS),
                script('test', [
                    "pm.test('201 Created', () => pm.response.to.have.status(201));",
                    "pm.collectionVariables.set('newReferralId', pm.response.json().data.id);",
                ]),
            ],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'body': body(SUBMIT_BODY),
                'url': url('/referrals'),
                'description': (
                    'The portal\'s Submit Referral (#11), field for field. The referral source is the signed-in '
                    'agent — recorded, never typed. Desk staff logging one an agent phoned in send `agentId`. '
                    f'Aircraft preference: {CATEGORIES}.'),
            },
            'response': [
                example('201 · Submitted', 'POST', '/referrals', *cap['submit'], req_body=payload),
                example('400 · No way to reach the client', 'POST', '/referrals', *cap['submit_400'], req_body=no_contact),
            ],
        },
        {
            'name': '03 · My referrals (as the agent)',
            'event': [script('prerequest', AS_AGENT), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals', list_query[:4]),
                'description': (
                    'Only what this agent submitted, projected down to what they sent, its status and the trip '
                    'it booked — no broker, no CRM client, no archive trail.'),
            },
            'response': [example('200 · The agent\'s own', 'GET', '/referrals?page=1&limit=10', *cap['agent_list'])],
        },
        {
            'name': '04 · Dashboard tiles (as the agent)',
            'event': [script('prerequest', AS_AGENT), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals/stats'),
                'description': 'Submitted, active, booked (booked + completed), completed, lost — over the agent\'s own referrals.',
            },
            'response': [example('200 · The agent\'s counts', 'GET', '/referrals/stats', *cap['agent_stats'])],
        },
        {
            'name': '05 · One referral (as the agent)',
            'event': [script('prerequest', AS_AGENT), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals/{{newReferralId}}'),
                'description': (
                    'The agent\'s view. Their Agent Updates are the SHARED notes on it: '
                    '`GET /notes?subjectType=REFERRAL&subjectId=…` returns only those to an agent (see `12 · Notes`).'),
            },
            'response': [example('200 · The agent\'s view', 'GET', f'/referrals/{rid}', *cap['agent_detail'])],
        },
        {
            'name': '06 · List referrals (desk)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals', list_query),
                'description': (
                    'ALL for administrators and senior brokers; a broker sees the referrals assigned to them and '
                    'the unassigned ones, so a fresh referral never sits where nobody looks.'),
            },
            'response': [
                example('200 · A page of referrals', 'GET', '/referrals?page=1&limit=10', *cap['list']),
                example('400 · Unsortable column', 'GET', '/referrals?sortBy=budget', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/referrals', *cap['list_401']),
            ],
        },
        {
            'name': '07 · Board tiles (desk)',
            'event': [status_test(200, '200 OK')],
            'request': {'method': 'GET', 'header': [], 'url': url('/referrals/stats'),
                        'description': 'The same counts over the desk\'s scope.'},
            'response': [example('200 · Tiles', 'GET', '/referrals/stats', *cap['stats'])],
        },
        {
            'name': '08 · Get one referral (desk)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals/{{newReferralId}}'),
                'description': 'The full record: agent, broker, the client and trip request it became, the trip it booked. Archived referrals load too.',
            },
            'response': [
                example('200 · The referral', 'GET', f'/referrals/{rid}', *cap['detail']),
                example('404 · Not found or not yours', 'GET', f'/referrals/{MISSING}', *cap['detail_404']),
            ],
        },
        {
            'name': '09 · Open an attachment (desk)',
            'event': [
                script('prerequest', [
                    "const attachment = pm.collectionVariables.get('referralAttachmentUrl') || '';",
                    "pm.variables.set('referralAttachmentId', attachment.split('/').pop());",
                ]),
                status_test(200, '200 OK — the file itself'),
            ],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals/{{newReferralId}}/attachments/{{referralAttachmentId}}'),
                'description': (
                    'Streams the agent\'s private file to the desk **through the referral**: the referral is '
                    'resolved in the caller\'s scope first and the file must be one of its attachments '
                    '(`UploadsService.openVouched`). A success is the file\'s bytes, not JSON, so no success '
                    'example is stored; the test asserts the 200.'),
            },
            'response': [
                example('404 · Not one of its attachments', 'GET', f'/referrals/{rid}/attachments/{MISSING}', *cap['attachment_404']),
            ],
        },
        {
            'name': '10 · Convert into a client and trip request',
            'event': [script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                'const data = pm.response.json().data;',
                "pm.collectionVariables.set('referralClientId', data.clientId);",
                "pm.collectionVariables.set('referralTripRequestId', data.tripRequestId);",
            ])],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': body('{\n  "clientId": null  // optional · uuid. Link an existing client instead of creating one.\n}'),
                'url': url('/referrals/{{newReferralId}}/convert'),
                'description': (
                    'Creates the client (lead source REFERRAL) — or links an existing one — and an open trip '
                    'request carrying what the agent sent, through their own modules. The referral moves to '
                    'CONTACTED. Once only: a second conversion is a 409. The agent cannot convert (403).'),
            },
            'response': [
                example('200 · Converted', 'POST', f'/referrals/{rid}/convert', *cap['convert'], req_body={}),
                example('409 · Already converted', 'POST', f'/referrals/{rid}/convert', *cap['convert_409'], req_body={}),
                example('403 · The agent cannot work a referral', 'POST', f'/referrals/{rid}/convert', *cap['convert_403'], req_body={}),
            ],
        },
        {
            'name': '11 · Work a referral',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS, 'body': body(UPDATE_BODY),
                'url': url('/referrals/{{newReferralId}}'),
                'description': 'Status and broker. A broker may take an unassigned referral; assigning anyone else needs ALL scope.',
            },
            'response': [
                example('200 · Quoting', 'PATCH', f'/referrals/{rid}', *cap['update'], req_body=update),
                example('400 · Empty body', 'PATCH', f'/referrals/{rid}', *cap['update_400'], req_body={}),
                example('403 · The agent cannot update', 'PATCH', f'/referrals/{rid}', *cap['update_403'], req_body=update),
            ],
        },
        {
            'name': '12 · Link the trip it booked',
            'event': [script('prerequest', AIRPORTS + BOOKED_TRIP), status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': body('{\n  "tripId": "{{referralTripId}}"  // uuid · one of the converted client\'s live trips. null unlinks.\n}'),
                'url': url('/referrals/{{newReferralId}}'),
                'description': (
                    'Moves the referral to BOOKED and raises the agent\'s commission from their standard terms '
                    '(skipped for CUSTOM terms, and never twice). The trip must belong to the client the referral '
                    'became — so a referral must be converted first. The pre-request script books the trip.'),
            },
            'response': [
                example('200 · Booked, commission raised', 'PATCH', f'/referrals/{rid}', *cap['link'], req_body={'tripId': trip['id']}),
                example('400 · Not converted yet', 'PATCH', f'/referrals/{fid}', *cap['link_400'], req_body={'tripId': trip['id']}),
            ],
        },
        {
            'name': '13 · Archive a referral',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/referrals/{{newReferralId}}'),
                'description': 'Administrators and senior brokers only; a broker marks it Lost or Cancelled instead. Nothing is deleted.',
            },
            'response': [
                example('204 · Archived', 'DELETE', f'/referrals/{fid}', *cap['remove']),
                example('403 · A broker cannot archive', 'DELETE', f'/referrals/{fid}', *cap['remove_403']),
            ],
        },
        {
            'name': '14 · Restore a referral',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/referrals/{{newReferralId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. 200, not 201.',
            },
            'response': [
                example('200 · Restored', 'POST', f'/referrals/{fid}/restore', *cap['restore']),
                example('404 · Not archived', 'POST', f'/referrals/{fid}/restore', *cap['restore_404']),
            ],
        },
        {
            'name': '15 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': body('{\n  "ids": ["{{newReferralId}}"]  // required · 1-100 uuids. Unknown ids come back in skipped.\n}'),
                'url': url('/referrals/bulk-delete'),
                'description': 'Partial success is success.',
            },
            'response': [
                example('200 · Archived', 'POST', '/referrals/bulk-delete', *cap['bulk'], req_body={'ids': [fid, MISSING]}),
                example('400 · Nothing selected', 'POST', '/referrals/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '16 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': body('{\n  "ids": ["{{newReferralId}}"]\n}'),
                'url': url('/referrals/bulk-restore'),
                'description': 'The Archived tab\'s bulk action.',
            },
            'response': [example('200 · Restored', 'POST', '/referrals/bulk-restore', *cap['bulk_restore'], req_body={'ids': [fid]})],
        },
        {
            'name': '17 · Upload a resource file (public)',
            'event': [script('test', [
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.collectionVariables.set('resourceFileUrl', pm.response.json().data.url);",
            ])],
            'request': {
                'method': 'POST', 'header': [WRITE_HEADERS[1]],
                'body': {'mode': 'formdata', 'formdata': upload_form('PUBLIC', 'Tribeca Jets brochure')},
                'url': url('/uploads/document'),
                'description': 'A portal resource must be PUBLIC so every referral agent can open it.',
            },
            'response': [example('201 · Uploaded, public', 'POST', '/uploads/document', *cap['resource_upload'])],
        },
        {
            'name': '18 · Publish a resource',
            'event': [script('test', [
                "pm.test('201 Created', () => pm.response.to.have.status(201));",
                "pm.collectionVariables.set('newResourceId', pm.response.json().data.id);",
            ])],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'body': body(RESOURCE_BODY),
                'url': url('/referral-resources'),
                'description': 'The portal\'s Resources (#11): brochure, category guide, programme terms. Curated by administrators and senior brokers.',
            },
            'response': [
                example('201 · Published', 'POST', '/referral-resources', *cap['resource_create'], req_body=resource_payload),
                example('400 · The file is not public', 'POST', '/referral-resources', *cap['resource_400']),
                example('403 · A broker cannot curate', 'POST', '/referral-resources', *cap['resource_403']),
            ],
        },
        {
            'name': '19 · Resources (as the agent)',
            'event': [script('prerequest', AS_AGENT), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/referral-resources', list_query[:2] + [
                    {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt | updatedAt | title. Default createdAt.'},
                    {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Desk only; an agent sees live resources.'},
                ]),
                'description': 'What the portal lists. Opening one is `GET /uploads/:id` on its `fileUrl`.',
            },
            'response': [example('200 · Published resources', 'GET', '/referral-resources?page=1&limit=10', *cap['resource_list'])],
        },
        {
            'name': '20 · Edit a resource',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': body('{\n  "description": null  // optional · title, description (null clears) or fileUrl\n}'),
                'url': url('/referral-resources/{{newResourceId}}'),
                'description': 'Every field optional.',
            },
            'response': [
                example('200 · Edited', 'PATCH', f'/referral-resources/{res_id}', *cap['resource_update'], req_body={'description': None}),
                example('400 · Empty body', 'PATCH', f'/referral-resources/{res_id}', *cap['resource_update_400'], req_body={}),
            ],
        },
        {
            'name': '21 · Take a resource off the portal',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS, 'url': url('/referral-resources/{{newResourceId}}'),
                'description': 'Archives it; the file stays where it is.',
            },
            'response': [example('204 · Archived', 'DELETE', f'/referral-resources/{res_id}', *cap['resource_remove'])],
        },
        {
            'name': '22 · Put a resource back',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/referral-resources/{{newResourceId}}/restore'),
                'description': '200, not 201.',
            },
            'response': [example('200 · Restored', 'POST', f'/referral-resources/{res_id}/restore', *cap['resource_restore'])],
        },
        {
            'name': '23 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/referrals/stats'),
                'description': 'Archives everything this folder created. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '18 · Referrals',
        'description': (
            'Client adjustment #11 — the referral partner portal and the desk\'s side of it. A referral agent '
            'submits and reads their own referrals; the desk converts, works and books them; linking the booked '
            'trip raises the agent\'s commission.\n\nRequests marked "(as the agent)" sign in as the seeded '
            '`agent@tribecajets.com` for that request; the next request signs the owner back in. Runs alone and '
            'archives everything it created.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    agent = Session(AGENT_EMAIL)
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {
        'agentEmail': AGENT_EMAIL, 'newReferralId': '', 'referralAttachmentUrl': '', 'referralClientId': '',
        'referralTripRequestId': '', 'referralTripId': '', 'resourceFileUrl': '', 'newResourceId': '',
        'airportId2': '',
    })

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
