#!/usr/bin/env python3
"""
Builds `26 · Email Templates` (#21), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_email_templates_folder.py
    cd postman && python3 rewrite_body_comments.py

The folder writes a template of its own and a probe client of its own, whose
address is on `example.com` — a domain reserved so that nothing sent to it is
ever delivered. It never emails a seeded client: with SMTP configured, a
Newman run would otherwise put a test email in a real inbox. Both rows are
archived at the end, in the builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example, script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
CATEGORIES = 'QUOTE_FOLLOW_UP | TRIP_CONFIRMATION | CLIENT_UPDATE | EMPTY_LEG | PAYMENT | TRAVEL_AGENT | GENERAL'
STATUSES = 'SENT | LOGGED | FAILED'
PROBE_EMAIL = 'postman-email-probe@example.com'

CREATE_BODY = """{
  "name": "Postman — Check-in",                                   // required · 1-160 characters
  "category": "CLIENT_UPDATE",                                    // optional · QUOTE_FOLLOW_UP | TRIP_CONFIRMATION | CLIENT_UPDATE | EMPTY_LEG | PAYMENT | TRAVEL_AGENT | GENERAL. Default GENERAL
  "subject": "Checking in, {client_first_name}",                  // required · 1-300 characters · merge fields from GET /email-templates/fields
  "body": "Dear {client_first_name},\\n\\nFlying {route}?\\n\\n{broker_name}",   // required · 1-20000 characters
  "active": true                                                  // optional · offered when composing. Default true
}"""

UPDATE_BODY = """{
  "body": "Dear {client_first_name},\\n\\nJust checking in.\\n\\n{broker_name}"   // optional · every field optional; a merge field not in the catalogue is refused
}"""

PREVIEW_BODY = """{
  "templateId": "{{newEmailTemplateId}}",   // optional · uuid of an active template; absent starts from a blank email
  "clientId": "{{emailProbeClientId}}",     // one of clientId / operatorId · the recipient
  "operatorId": null,
  "tripId": null,                           // optional · a trip of this recipient's
  "quoteId": null,                          // optional · a quote of this client's
  "invoiceId": null                         // optional · an invoice of this client's
}"""

SEND_BODY = """{
  "templateId": "{{newEmailTemplateId}}",                         // optional · recorded as the template it came from
  "clientId": "{{emailProbeClientId}}",                           // one of clientId / operatorId · the recipient
  "subject": "Checking in, {client_first_name}",                  // required · merge fields still in it are filled on the way out
  "body": "Dear {client_first_name},\\n\\nJust checking in.\\n\\n{broker_name}"   // required · a field that cannot be filled is a 400 naming it
}"""

SETUP = [
    '// A probe client on example.com — reserved, never delivered — so a run never emails a real client.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/clients', method: 'POST',",
    "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
    "    body: { mode: 'raw', raw: JSON.stringify({ firstName: 'Postman', lastName: 'Email Probe',",
    f"        email: '{PROBE_EMAIL}' }}) }} }}, function (err, res) {{",
    "    if (!err && res.code === 201) { pm.collectionVariables.set('emailProbeClientId', res.json().data.id); }",
    '});',
]

SAVE_TEMPLATE = script('test', [
    "pm.test('201 Created', () => pm.response.to.have.status(201));",
    "pm.collectionVariables.set('newEmailTemplateId', pm.response.json().data.id);",
])

SAVE_EMAIL = script('test', [
    "pm.test('201 Created', () => pm.response.to.have.status(201));",
    "pm.collectionVariables.set('newEmailId', pm.response.json().data.id);",
])

TEARDOWN = [
    '// Archive the template and the probe client this folder wrote. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const csrf = { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/email-templates/' + pm.collectionVariables.get('newEmailTemplateId'),",
    "    method: 'DELETE', header: csrf }, function () {});",
    "pm.sendRequest({ url: base + '/clients/' + pm.collectionVariables.get('emailProbeClientId'),",
    "    method: 'DELETE', header: csrf }, function () {});",
]


def build(owner: Session, broker: Session, agent: Session, anonymous: Session):
    cap = {}
    template = {
        'name': 'Postman — Check-in', 'category': 'CLIENT_UPDATE',
        'subject': 'Checking in, {client_first_name}',
        'body': 'Dear {client_first_name},\n\nFlying {route}?\n\n{broker_name}', 'active': True,
    }
    update = {'body': 'Dear {client_first_name},\n\nJust checking in.\n\n{broker_name}'}
    bad_field = {'name': 'Probe', 'subject': 'Hi {client_nme}', 'body': 'Hello'}

    template_id = client_id = None
    try:
        status, body = owner.request('POST', '/clients', {
            'firstName': 'Postman', 'lastName': 'Email Probe', 'email': PROBE_EMAIL,
        })
        assert status == 201, f'probe client: {status} {body}'
        client_id = body['data']['id']

        cap['fields'] = owner.request('GET', '/email-templates/fields')
        cap['fields_403'] = agent.request('GET', '/email-templates/fields')

        cap['create'] = owner.request('POST', '/email-templates', template)
        template_id = cap['create'][1]['data']['id']
        cap['create_400'] = owner.request('POST', '/email-templates', {'name': '', 'subject': 'x', 'body': 'x'})
        cap['create_400_field'] = owner.request('POST', '/email-templates', bad_field)
        cap['create_401'] = anonymous.request('POST', '/email-templates', template)
        cap['create_403'] = broker.request('POST', '/email-templates', template)

        cap['list'] = owner.request('GET', '/email-templates?search=Postman')
        cap['list_broker'] = broker.request('GET', '/email-templates?search=Postman&active=true')
        cap['list_400'] = owner.request('GET', '/email-templates?category=NEWSLETTER')
        cap['stats'] = owner.request('GET', '/email-templates/stats')

        cap['one'] = owner.request('GET', f'/email-templates/{template_id}')
        cap['one_404'] = owner.request('GET', f'/email-templates/{MISSING}')

        cap['update'] = owner.request('PATCH', f'/email-templates/{template_id}', update)
        cap['update_400'] = owner.request('PATCH', f'/email-templates/{template_id}', {'body': 'Hi {agent_name}'})

        preview = {'templateId': template_id, 'clientId': client_id}
        cap['preview'] = owner.request('POST', '/emails/preview', preview)
        both = {'clientId': client_id, 'operatorId': MISSING}
        cap['preview_400'] = owner.request('POST', '/emails/preview', both)
        cap['preview_400_client'] = owner.request('POST', '/emails/preview', {'clientId': MISSING})
        cap['preview_403'] = agent.request('POST', '/emails/preview', preview)

        send = {'templateId': template_id, 'clientId': client_id, 'subject': template['subject'], 'body': update['body']}
        missing = {'clientId': client_id, 'subject': 'Your trip', 'body': 'Flying {route} on {departure_date}.'}
        cap['send_400'] = owner.request('POST', '/emails', missing)
        cap['send'] = owner.request('POST', '/emails', send)
        email_id = cap['send'][1]['data']['id']
        cap['send_401'] = anonymous.request('POST', '/emails', send)

        cap['sent'] = owner.request('GET', f'/emails?clientId={client_id}')
        cap['sent_400'] = owner.request('GET', '/emails?status=DELIVERED')
        cap['sent_one'] = owner.request('GET', f'/emails/{email_id}')
        cap['sent_404'] = owner.request('GET', f'/emails/{MISSING}')

        cap['archive'] = owner.request('DELETE', f'/email-templates/{template_id}')
        cap['archive_404'] = owner.request('DELETE', f'/email-templates/{template_id}')
        cap['archive_403'] = broker.request('DELETE', f'/email-templates/{template_id}')
        cap['restore'] = owner.request('POST', f'/email-templates/{template_id}/restore')
        cap['bulk_delete'] = owner.request('POST', '/email-templates/bulk-delete', {'ids': [template_id, MISSING]})
        cap['bulk_restore'] = owner.request('POST', '/email-templates/bulk-restore', {'ids': [template_id]})
        cap['bulk_400'] = owner.request('POST', '/email-templates/bulk-delete', {'ids': []})
    finally:
        if template_id:
            owner.request('DELETE', f'/email-templates/{template_id}')
        if client_id:
            owner.request('DELETE', f'/clients/{client_id}')

    path = f'/email-templates/{template_id}'
    items = [
        {
            'name': '01 · Merge fields',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/email-templates/fields'),
                'description': (
                    'The one catalogue of `{fields}` a template may use — the editor, the save check and the send '
                    'all read it. `source` says which record fills each: client, operator, trip, quote, invoice or '
                    'sender.'),
            },
            'response': [
                example('200 · The catalogue', 'GET', '/email-templates/fields', *cap['fields']),
                example('403 · A referral agent has no templates', 'GET', '/email-templates/fields', *cap['fields_403']),
            ],
        },
        {
            'name': '02 · Add a template',
            'event': [script('prerequest', SETUP), SAVE_TEMPLATE],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/email-templates'),
                'description': (
                    'MANAGE_EMAIL_TEMPLATES at ALL — administrators and senior brokers. A merge field not in the '
                    'catalogue is refused, named. Its pre-request creates the probe client the send below uses.'),
            },
            'response': [
                example('201 · Added', 'POST', '/email-templates', *cap['create'], req_body=template),
                example('400 · No name', 'POST', '/email-templates', *cap['create_400'],
                        req_body={'name': '', 'subject': 'x', 'body': 'x'}),
                example('400 · Unknown merge field', 'POST', '/email-templates', *cap['create_400_field'], req_body=bad_field),
                example('401 · Not signed in', 'POST', '/email-templates', *cap['create_401'], req_body=template),
                example('403 · A broker uses templates but does not edit them', 'POST', '/email-templates',
                        *cap['create_403'], req_body=template),
            ],
        },
        {
            'name': '03 · List templates',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/email-templates', [
                    {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
                    {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
                    {'key': 'search', 'value': 'Postman', 'description': 'optional · the name, subject or body.'},
                    {'key': 'category', 'value': None, 'disabled': True, 'description': f'optional · {CATEGORIES}.'},
                    {'key': 'active', 'value': None, 'disabled': True,
                     'description': 'optional · true (offered when composing) | false (switched off).'},
                    {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false.'},
                    {'key': 'sortBy', 'value': None, 'disabled': True,
                     'description': 'optional · createdAt | updatedAt | name | category. Default createdAt.'},
                    {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
                ]),
                'description': 'Every staff role reads the library (MANAGE_EMAIL_TEMPLATES at READ is enough). Newest first.',
            },
            'response': [
                example('200 · Listed', 'GET', '/email-templates?search=Postman', *cap['list']),
                example('200 · Active ones, as a broker', 'GET', '/email-templates?search=Postman&active=true',
                        *cap['list_broker']),
                example('400 · Unknown category', 'GET', '/email-templates?category=NEWSLETTER', *cap['list_400']),
            ],
        },
        {
            'name': '04 · The tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/email-templates/stats', [
                    {'key': 'on', 'value': None, 'disabled': True,
                     'description': 'optional · YYYY-MM-DD, a day in the month "sent this month" counts. Default today in UTC.'},
                ]),
                'description': (
                    'Live templates, active ones, the categories the library actually uses, and the emails a mail '
                    'server accepted this month among those you may see — LOGGED and FAILED are not counted.'),
            },
            'response': [example('200 · Counted', 'GET', '/email-templates/stats', *cap['stats'])],
        },
        {
            'name': '05 · One template',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/email-templates/{{newEmailTemplateId}}'),
                'description': 'Archived templates load too.',
            },
            'response': [
                example('200 · Found', 'GET', path, *cap['one']),
                example('404 · Not found', 'GET', f'/email-templates/{MISSING}', *cap['one_404']),
            ],
        },
        {
            'name': '06 · Edit it',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': UPDATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/email-templates/{{newEmailTemplateId}}'),
                'description': 'Only the fields sent change. Emails already sent from it are snapshots and do not change.',
            },
            'response': [
                example('200 · Edited', 'PATCH', path, *cap['update'], req_body=update),
                example('400 · Unknown merge field', 'PATCH', path, *cap['update_400'], req_body={'body': 'Hi {agent_name}'}),
            ],
        },
        {
            'name': '07 · Fill it for a client',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': PREVIEW_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/emails/preview'),
                'description': (
                    'SEND_EMAILS. Sends nothing, writes nothing. Returns the address on file (null when none), the '
                    'text with every field that could be filled, and `missing` — here `{route}`, because no trip or '
                    'quote was named. Each record is read through its own module, in your scope.'),
            },
            'response': [
                example('200 · Filled, one field missing', 'POST', '/emails/preview', *cap['preview'],
                        req_body={'templateId': template_id, 'clientId': client_id}),
                example('400 · Two recipients', 'POST', '/emails/preview', *cap['preview_400'],
                        req_body={'clientId': client_id, 'operatorId': MISSING}),
                example('400 · That client does not exist', 'POST', '/emails/preview', *cap['preview_400_client'],
                        req_body={'clientId': MISSING}),
                example('403 · A referral agent cannot email', 'POST', '/emails/preview', *cap['preview_403'],
                        req_body={'templateId': template_id, 'clientId': client_id}),
            ],
        },
        {
            'name': '08 · Send it',
            'event': [SAVE_EMAIL],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': SEND_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/emails'),
                'description': (
                    'From the desk\'s mail server, your address as Reply-To. Recorded with `status` SENT, LOGGED (no '
                    'mail server configured — delivered to nobody) or FAILED (a 502). Appears on the client\'s '
                    'timeline. The probe client is on example.com, which never delivers.'),
            },
            'response': [
                example('201 · Sent (LOGGED without a mail server)', 'POST', '/emails', *cap['send'],
                        req_body={'templateId': template_id, 'clientId': client_id,
                                  'subject': template['subject'], 'body': update['body']}),
                example('400 · A merge field is not on file', 'POST', '/emails', *cap['send_400'], req_body=missing),
                example('401 · Not signed in', 'POST', '/emails', *cap['send_401'], req_body={'clientId': client_id}),
            ],
        },
        {
            'name': '09 · The sent log',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/emails', [
                    {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
                    {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
                    {'key': 'clientId', 'value': '{{emailProbeClientId}}', 'description': 'optional · uuid.'},
                    {'key': 'search', 'value': None, 'disabled': True, 'description': 'optional · the subject or the recipient.'},
                    {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES}.'},
                    {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
                    {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
                    {'key': 'templateId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
                    {'key': 'sortBy', 'value': None, 'disabled': True, 'description': 'optional · createdAt. Default createdAt.'},
                    {'key': 'sortOrder', 'value': None, 'disabled': True, 'description': 'optional · asc | desc. Default desc.'},
                ]),
                'description': 'Newest first. A broker or assistant sees the emails they sent, or about a client or trip they may see.',
            },
            'response': [
                example('200 · Listed', 'GET', f'/emails?clientId={client_id}', *cap['sent']),
                example('400 · Unknown status', 'GET', '/emails?status=DELIVERED', *cap['sent_400']),
            ],
        },
        {
            'name': '10 · One sent email',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/emails/{{newEmailId}}'),
                'description': 'Exactly as it went out, merge fields filled — a snapshot, never re-rendered.',
            },
            'response': [
                example('200 · Found', 'GET', f'/emails/{email_id}', *cap['sent_one']),
                example('404 · Not found', 'GET', f'/emails/{MISSING}', *cap['sent_404']),
            ],
        },
        {
            'name': '11 · Archive the template',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS[1:], 'url': url('/email-templates/{{newEmailTemplateId}}'),
                'description': 'Nothing is deleted, and the emails sent from it keep their record.',
            },
            'response': [
                example('204 · Archived', 'DELETE', path, *cap['archive']),
                example('403 · A broker does not edit the library', 'DELETE', path, *cap['archive_403']),
                example('404 · Already archived', 'DELETE', path, *cap['archive_404']),
            ],
        },
        {
            'name': '12 · Restore it',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS[1:], 'url': url('/email-templates/{{newEmailTemplateId}}/restore'),
                'description': 'Clears the archive stamp and nothing else.',
            },
            'response': [example('200 · Restored', 'POST', f'{path}/restore', *cap['restore'])],
        },
        {
            'name': '13 · Archive several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newEmailTemplateId}}"]   // required · 1-100 uuids\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/email-templates/bulk-delete'),
                'description': 'Partial success is success: ids that match nothing come back in `skipped`.',
            },
            'response': [
                example('200 · One archived, one skipped', 'POST', '/email-templates/bulk-delete', *cap['bulk_delete'],
                        req_body={'ids': [template_id, MISSING]}),
                example('400 · No ids', 'POST', '/email-templates/bulk-delete', *cap['bulk_400'], req_body={'ids': []}),
            ],
        },
        {
            'name': '14 · Restore several',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{\n  "ids": ["{{newEmailTemplateId}}"]   // required · 1-100 uuids\n}',
                         'options': {'raw': {'language': 'json'}}},
                'url': url('/email-templates/bulk-restore'),
                'description': 'The same ids, the same partial-success rule.',
            },
            'response': [example('200 · Restored', 'POST', '/email-templates/bulk-restore', *cap['bulk_restore'],
                                 req_body={'ids': [template_id]})],
        },
        {
            'name': '15 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe rows archived')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/email-templates', [{'key': 'limit', 'value': '1', 'description': 'optional.'}]),
                'description': 'Archives the template and the probe client this folder wrote. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '26 · Email Templates',
        'description': (
            'Email Templates (#21): the desk\'s template library with merge fields, sending an email to a client or '
            'an operator from one, and the log of what was sent. Runs alone: it writes a template and a probe client '
            'on example.com, and archives both afterwards.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    agent = Session('agent@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {'emailProbeClientId': '', 'newEmailTemplateId': '', 'newEmailId': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
