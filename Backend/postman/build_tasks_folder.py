#!/usr/bin/env python3
"""
Builds `25 · Tasks` (#20), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_tasks_folder.py
    cd postman && python3 rewrite_body_comments.py

The folder writes a task of its own — assigned to the seeded broker, about a
client — moves it across the board, and archives it at the end, in the
builder and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example, script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATUSES = 'TODO | IN_PROGRESS | WAITING_ON_CLIENT | WAITING_ON_OPERATOR | COMPLETED'
PRIORITIES = 'LOW | MEDIUM | HIGH | URGENT'
VIEWS = 'MINE | DUE_TODAY | OVERDUE | HIGH_PRIORITY | ATTENTION'
DUE = '2026-12-15'

CREATE_BODY = """{
  "title": "Confirm catering with the client",   // required · 1-200 characters
  "description": "Vegetarian options for four",   // optional · max 5000
  "status": "TODO",                                // optional · TODO | IN_PROGRESS | WAITING_ON_CLIENT | WAITING_ON_OPERATOR | COMPLETED. Default TODO
  "priority": "HIGH",                              // optional · LOW | MEDIUM | HIGH | URGENT. Default MEDIUM
  "dueDate": "2026-12-15",                         // optional · YYYY-MM-DD
  "assigneeId": "{{taskAssigneeId}}",              // optional · uuid of a staff member who is not suspended
  "clientId": "{{taskClientId}}",                  // optional · uuid of a client you may see
  "tripId": null,                                  // optional · uuid of a trip you may see
  "checklist": [                                   // optional · up to 50 items, in order
    { "id": "c1", "text": "Ask about allergies", "done": false }
  ],
  "notes": null                                    // optional · max 5000
}"""

MOVE_BODY = """{
  "status": "COMPLETED"   // optional · any column; moving into COMPLETED stamps completedAt, moving out clears it
}"""

CHECKLIST_BODY = """{
  "status": "IN_PROGRESS",                                        // optional · reopening clears completedAt
  "checklist": [                                                  // optional · the full list — an item left out is removed
    { "id": "c1", "text": "Ask about allergies", "done": true },
    { "id": "c2", "text": "Send the menu to the operator", "done": false }
  ]
}"""

SETUP = [
    '// Find the seeded broker and a client, for the task this folder writes.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/users?limit=100', method: 'GET' }, function (e1, users) {",
    "    pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (e2, clients) {",
    '        if (e1 || e2) { return; }',
    "        const broker = users.json().data.find(function (u) { return u.email === 'broker@tribecajets.com'; });",
    "        if (broker) { pm.collectionVariables.set('taskAssigneeId', broker.id); }",
    "        pm.collectionVariables.set('taskClientId', clients.json().data[0].id);",
    '    });',
    '});',
]

SAVE_TASK = script('test', [
    "pm.test('201 Created', () => pm.response.to.have.status(201));",
    "pm.collectionVariables.set('newTaskId', pm.response.json().data.id);",
])

TEARDOWN = [
    '// Archive the task this folder wrote. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/tasks/' + pm.collectionVariables.get('newTaskId'), method: 'DELETE',",
    "    header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') } }, function () {});",
]


def build(owner: Session, broker: Session, agent: Session, anonymous: Session):
    cap = {}
    broker_id = broker.request('GET', '/auth/me')[1]['data']['id']
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    payload = json.loads(json.dumps({
        'title': 'Confirm catering with the client', 'description': 'Vegetarian options for four',
        'status': 'TODO', 'priority': 'HIGH', 'dueDate': DUE, 'assigneeId': broker_id, 'clientId': client_id,
        'tripId': None, 'checklist': [{'id': 'c1', 'text': 'Ask about allergies', 'done': False}], 'notes': None,
    }))
    checklist = {'status': 'IN_PROGRESS', 'checklist': [
        {'id': 'c1', 'text': 'Ask about allergies', 'done': True},
        {'id': 'c2', 'text': 'Send the menu to the operator', 'done': False},
    ]}

    task_id = None
    try:
        cap['create'] = owner.request('POST', '/tasks', payload)
        task_id = cap['create'][1]['data']['id']
        cap['create_400'] = owner.request('POST', '/tasks', {'title': ''})
        cap['create_400_client'] = owner.request('POST', '/tasks', {'title': 'Probe', 'clientId': MISSING})
        cap['create_401'] = anonymous.request('POST', '/tasks', {'title': 'Probe'})
        cap['create_403'] = agent.request('POST', '/tasks', {'title': 'Probe'})

        cap['list'] = owner.request('GET', '/tasks?search=Confirm%20catering')
        cap['list_mine'] = broker.request('GET', '/tasks?view=MINE&search=Confirm%20catering')
        cap['list_400'] = owner.request('GET', '/tasks?view=LATE')

        cap['one'] = owner.request('GET', f'/tasks/{task_id}')
        cap['one_404'] = owner.request('GET', f'/tasks/{MISSING}')

        cap['move'] = owner.request('PATCH', f'/tasks/{task_id}', {'status': 'COMPLETED'})
        cap['move_400'] = owner.request('PATCH', f'/tasks/{task_id}', {'status': 'DONE'})
        cap['checklist'] = broker.request('PATCH', f'/tasks/{task_id}', checklist)

        cap['archive_403'] = broker.request('DELETE', f'/tasks/{task_id}')
        cap['archive'] = owner.request('DELETE', f'/tasks/{task_id}')
        cap['archive_404'] = owner.request('DELETE', f'/tasks/{task_id}')
        cap['archived_list'] = owner.request('GET', '/tasks?archived=true&search=Confirm%20catering')
        cap['restore'] = owner.request('POST', f'/tasks/{task_id}/restore')
    finally:
        if task_id:
            owner.request('DELETE', f'/tasks/{task_id}')

    path = f'/tasks/{task_id}'
    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
        {'key': 'search', 'value': 'Confirm catering',
         'description': 'optional · title or description, the task number ("TSK-12" or "12"), the trip ("TJ-1048"), or the client.'},
        {'key': 'view', 'value': None, 'disabled': True, 'description': f'optional · {VIEWS}.'},
        {'key': 'status', 'value': None, 'disabled': True, 'description': f'optional · {STATUSES} — one column.'},
        {'key': 'priority', 'value': None, 'disabled': True, 'description': f'optional · {PRIORITIES}.'},
        {'key': 'assigneeId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'clientId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'tripId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
        {'key': 'on', 'value': None, 'disabled': True,
         'description': 'optional · YYYY-MM-DD, the day the views count as today. Default today in UTC.'},
        {'key': 'archived', 'value': None, 'disabled': True, 'description': 'optional · true | false. Default false.'},
        {'key': 'sortBy', 'value': None, 'disabled': True,
         'description': 'optional · dueDate | createdAt | updatedAt | priority | reference. Default dueDate.'},
        {'key': 'sortOrder', 'value': None, 'disabled': True,
         'description': 'optional · asc | desc. Default asc — soonest due first, undated last.'},
    ]

    items = [
        {
            'name': '01 · Add a task',
            'event': [script('prerequest', SETUP), SAVE_TASK],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CREATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/tasks'),
                'description': (
                    'MANAGE_TASKS. The assignee must be a staff member who is not suspended; a client and a trip must '
                    'be ones you may see, checked by the module that owns them. Its pre-request finds the seeded '
                    'broker and a client.'),
            },
            'response': [
                example('201 · Added', 'POST', '/tasks', *cap['create'], req_body=payload),
                example('400 · No title', 'POST', '/tasks', *cap['create_400'], req_body={'title': ''}),
                example('400 · That client does not exist', 'POST', '/tasks', *cap['create_400_client'],
                        req_body={'title': 'Probe', 'clientId': MISSING}),
                example('401 · Not signed in', 'POST', '/tasks', *cap['create_401'], req_body={'title': 'Probe'}),
                example('403 · A referral agent has no task board', 'POST', '/tasks', *cap['create_403'],
                        req_body={'title': 'Probe'}),
            ],
        },
        {
            'name': '02 · List tasks',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/tasks', list_query),
                'description': (
                    'Soonest due first, undated last. `attention` (OVERDUE / DUE_TODAY) is worked out on this read '
                    'from the due date and status, never stored. A broker or assistant sees the tasks assigned to '
                    'them and the ones they wrote.'),
            },
            'response': [
                example('200 · Listed', 'GET', '/tasks?search=Confirm%20catering', *cap['list']),
                example('200 · My tasks (as the assigned broker)', 'GET', '/tasks?view=MINE&search=Confirm%20catering',
                        *cap['list_mine']),
                example('200 · The archived half', 'GET', '/tasks?archived=true&search=Confirm%20catering',
                        *cap['archived_list']),
                example('400 · Unknown view', 'GET', '/tasks?view=LATE', *cap['list_400']),
            ],
        },
        {
            'name': '03 · One task',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/tasks/{{newTaskId}}'),
                'description': 'With its description, notes and checklist. Archived tasks load too.',
            },
            'response': [
                example('200 · Found', 'GET', path, *cap['one']),
                example('404 · Not found', 'GET', f'/tasks/{MISSING}', *cap['one_404']),
            ],
        },
        {
            'name': '04 · Move it to Completed',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': MOVE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/tasks/{{newTaskId}}'),
                'description': 'Any column to any column. Moving into COMPLETED stamps `completedAt`.',
            },
            'response': [
                example('200 · Completed', 'PATCH', path, *cap['move'], req_body={'status': 'COMPLETED'}),
                example('400 · Unknown status', 'PATCH', path, *cap['move_400'], req_body={'status': 'DONE'}),
            ],
        },
        {
            'name': '05 · Reopen it and tick the checklist',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': CHECKLIST_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/tasks/{{newTaskId}}'),
                'description': (
                    'Reopening clears `completedAt`; the checklist is the full list. Captured as the assigned broker '
                    '— an assignee works the task — and run in the collection as the folder\'s own account.'),
            },
            'response': [example('200 · Reopened, one item done (as the assignee)', 'PATCH', path, *cap['checklist'],
                                 req_body=checklist)],
        },
        {
            'name': '06 · Archive it',
            'event': [status_test(204, '204 No Content')],
            'request': {
                'method': 'DELETE', 'header': WRITE_HEADERS[1:], 'url': url('/tasks/{{newTaskId}}'),
                'description': (
                    'Its author or an administrator: an assignee completes a task rather than taking it off the '
                    'board. Nothing is deleted.'),
            },
            'response': [
                example('204 · Archived', 'DELETE', path, *cap['archive']),
                example('403 · The assignee did not write it', 'DELETE', path, *cap['archive_403']),
                example('404 · Already archived', 'DELETE', path, *cap['archive_404']),
            ],
        },
        {
            'name': '07 · Restore it',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS[1:], 'url': url('/tasks/{{newTaskId}}/restore'),
                'description': 'Clears the archive stamp and nothing else. Its author or an administrator.',
            },
            'response': [example('200 · Restored', 'POST', f'{path}/restore', *cap['restore'])],
        },
        {
            'name': '08 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe task archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/tasks', [{'key': 'limit', 'value': '1', 'description': 'optional.'}]),
                'description': 'Archives the task this folder wrote. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '25 · Tasks',
        'description': (
            'The Tasks Board (#20): desk work written by a person, in five columns, with a checklist and links to a '
            'client and a trip. Overdue and due-today are worked out on every read. Runs alone: it writes a task, '
            'moves it, and archives it afterwards.'),
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
    ensure_variables(collection, {'taskAssigneeId': '', 'taskClientId': '', 'newTaskId': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
