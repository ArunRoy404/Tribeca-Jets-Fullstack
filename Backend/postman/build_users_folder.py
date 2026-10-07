#!/usr/bin/env python3
"""
Builds `04 · Users`, capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    PORT=4100 MAIL_DRIVER=log RATE_LIMIT_MULTIPLIER=20 node dist/main.js   # a second API
    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_users_folder.py
    cd postman && python3 rewrite_body_comments.py

Run it against an API with `MAIL_DRIVER=log`: inviting sends an email, and a
capture must never mail anyone. Every address it invites is on example.com,
and the two-factor sign-in reads the code such an API returns.

Rebuilt on 7 Oct 2026 for per-user permissions: the roles live at `/roles`
(each role's defaults, optional extras and locks), an invitation and an edit
carry `permissions`, and the Users routes check the caller's own `USERS`
permission rather than the old role matrix.

Accounts are never deleted, so each run leaves its invitations behind as
INVITED rows on example.com — the same as the app does.
"""

from __future__ import annotations

import json
import pathlib
import time
import urllib.error
import urllib.request

from builder_common import (
    BASE,
    MISSING,
    PASSWORD,
    WRITE_HEADERS,
    Session,
    ensure_variables,
    example,
    script,
    status_test,
    url,
)
from collection_order import place_folder
from session_setup import with_session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
OWNER = 'admin@example.com'
ADMIN_2FA = 'security@example.com'
BROKER = 'broker@example.com'

ROLE_VALUES = 'SUPER_ADMIN | ADMIN | BROKER | ASSISTANT | REFERRAL_AGENT'
ASSIGNABLE = '"ADMIN" | "BROKER" | "ASSISTANT" | "REFERRAL_AGENT"'
STATUS_VALUES = 'ACTIVE | INVITED | SUSPENDED'
SORT_VALUES = 'createdAt | updatedAt | firstName | lastName | email | role | status | lastLoginAt'
MODULE_VALUES = (
    'DASHBOARD | TRIPS | SCHEDULE | OPERATOR_SOURCING | FLIGHT_TRACKING | ITINERARIES | EMPTY_LEGS | '
    'CLIENTS | LEADS_AGENTS | TRIP_REQUESTS | REFERRALS | QUOTES | EMAIL_TEMPLATES | OPERATORS | AIRCRAFT | '
    'AIRPORTS | DOCUMENTS | RECEIVABLES | OPERATOR_PAYMENTS | COMMISSIONS | TRANSACTIONS | REPORTS | TASKS | '
    'USERS | SETTINGS'
)
ACTION_VALUES = 'VIEW | CREATE | EDIT | ARCHIVE | ASSIGN | SEND | PAY | EXPORT | VIEW_MONEY | VIEW_SENSITIVE | MANAGE_ACCESS'


def body(data: dict) -> dict:
    return {'mode': 'raw', 'raw': json.dumps(data, indent=2), 'options': {'raw': {'language': 'json'}}}


def two_factor_session(email: str) -> Session:
    """Signs in an account with two-factor on, reading the code a log-driver API returns."""
    session = Session(None)
    status, answer = session.request('POST', '/auth/login', {'email': email, 'password': PASSWORD})
    code = (((answer or {}).get('data') or {}).get('devCode') or {}).get('code')
    if status != 200 or not code:
        raise SystemExit(f'two-factor sign-in for {email} needs an API with MAIL_DRIVER=log: {status} {answer}')
    status, answer = session.request('POST', '/auth/two-factor/verify', {'code': code})
    if status != 200:
        raise SystemExit(f'two-factor verify failed for {email}: {status} {answer}')
    return session


def without_csrf(session: Session, path: str, data: dict):
    """The same signed-in caller, sending no X-CSRF-Token header."""
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode(), method='POST')
    req.add_header('Content-Type', 'application/json')
    try:
        with session.opener.open(req) as response:
            return response.status, json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read().decode())


def capture() -> dict:
    owner = Session(OWNER)
    broker = Session(BROKER)
    admin = two_factor_session(ADMIN_2FA)
    anon = Session(None)
    cap: dict[str, list] = {k: [] for k in ('list', 'stats', 'roles', 'defaults', 'detail', 'invite', 'update', 'withdraw')}

    def add(key, name, method, path, result, req_body=None):
        cap[key].append(example(name, method, path, result[0], result[1], req_body))

    # --- list -------------------------------------------------------------
    for name, path, who in (
        ('200 · Page of team members', '/users?page=1&limit=5&sortBy=createdAt&sortOrder=desc', owner),
        ('200 · Filtered by role and status', '/users?role=BROKER&status=ACTIVE&limit=20', owner),
        ('200 · Search by name or email', '/users?search=walsh', owner),
        ('200 · Reduced projection (caller without Users & Roles)', '/users?limit=3', broker),
        ('400 · sortBy not in the allowed list', '/users?sortBy=passwordHash', owner),
        ('400 · page/limit out of bounds', '/users?page=0&limit=500', owner),
        ('401 · Not signed in', '/users', anon),
    ):
        add('list', name, 'GET', path, who.request('GET', path))

    # --- stats ------------------------------------------------------------
    add('stats', '200 · Headcount tiles', 'GET', '/users/stats', owner.request('GET', '/users/stats'))
    add('stats', '403 · No Users & Roles permission', 'GET', '/users/stats', broker.request('GET', '/users/stats'))
    add('stats', '401 · Not signed in', 'GET', '/users/stats', anon.request('GET', '/users/stats'))

    # --- roles ------------------------------------------------------------
    add('roles', '200 · Every role and its default permissions', 'GET', '/roles', owner.request('GET', '/roles'))
    add('roles', '403 · No Users & Roles permission', 'GET', '/roles', broker.request('GET', '/roles'))
    add('roles', '401 · Not signed in', 'GET', '/roles', anon.request('GET', '/roles'))

    add('defaults', "200 · A broker's defaults", 'GET', '/roles/BROKER/defaults',
        owner.request('GET', '/roles/BROKER/defaults'))
    add('defaults', '400 · Not a role (SENIOR_BROKER was withdrawn)', 'GET', '/roles/SENIOR_BROKER/defaults',
        owner.request('GET', '/roles/SENIOR_BROKER/defaults'))
    add('defaults', '403 · No Users & Roles permission', 'GET', '/roles/BROKER/defaults',
        broker.request('GET', '/roles/BROKER/defaults'))

    # --- detail -----------------------------------------------------------
    _, listing = owner.request('GET', '/users?search=barry&limit=1')
    barry = listing['data'][0]['id']
    add('detail', '200 · One team member, with their own permissions', 'GET', '/users/:id',
        owner.request('GET', f'/users/{barry}'))
    add('detail', '403 · No Users & Roles permission', 'GET', '/users/:id', broker.request('GET', f'/users/{barry}'))
    add('detail', '404 · No such user', 'GET', '/users/:id', owner.request('GET', f'/users/{MISSING}'))
    add('detail', '400 · Malformed id', 'GET', '/users/:id', owner.request('GET', '/users/not-a-uuid'))

    # --- invite -----------------------------------------------------------
    stamp = int(time.time())
    plain = {'email': f'avery.new+{stamp}@example.com', 'password': 'Welcome-Aboard-26', 'firstName': 'Avery',
             'lastName': 'Newman', 'phone': '+1 555 0163', 'role': 'BROKER'}
    result = owner.request('POST', '/users/invite', plain)
    add('invite', "201 · Invited with the role's defaults", 'POST', '/users/invite', result, plain)
    invited = result[1]['data']['user']['id']

    adjusted = {**plain, 'email': f'avery.custom+{stamp}@example.com',
                'permissions': {'QUOTES': ['VIEW', 'CREATE', 'SEND'], 'REPORTS': ['VIEW', 'EXPORT']}}
    add('invite', '201 · Invited with adjusted permissions (Clients and Trip Requests added for Quotes)',
        'POST', '/users/invite', owner.request('POST', '/users/invite', adjusted), adjusted)

    add('invite', '409 · Email already in use', 'POST', '/users/invite', owner.request('POST', '/users/invite', plain), plain)
    bad = {'email': 'not-an-email', 'firstName': '', 'lastName': 'X', 'role': 'BROKER'}
    add('invite', '400 · Validation failed', 'POST', '/users/invite', owner.request('POST', '/users/invite', bad), bad)
    owner_try = {**plain, 'email': f'x+{stamp}@example.com', 'role': 'SUPER_ADMIN'}
    add('invite', '400 · SUPER_ADMIN is not assignable', 'POST', '/users/invite',
        owner.request('POST', '/users/invite', owner_try), owner_try)
    locked = {**plain, 'email': f'locked+{stamp}@example.com',
              'permissions': {'SETTINGS': ['VIEW'], 'CLIENTS': ['VIEW', 'ASSIGN']}}
    add('invite', '400 · Something the role can never have', 'POST', '/users/invite',
        owner.request('POST', '/users/invite', locked), locked)
    add('invite', '403 · No Users & Roles · Invite users', 'POST', '/users/invite',
        broker.request('POST', '/users/invite', plain), plain)
    add('invite', '403 · Missing X-CSRF-Token', 'POST', '/users/invite', without_csrf(owner, '/users/invite', plain), plain)

    # --- update -----------------------------------------------------------
    phone = {'phone': '+1 555 0199'}
    add('update', '200 · Profile updated', 'PATCH', '/users/:id', owner.request('PATCH', f'/users/{invited}', phone), phone)
    grants = {'permissions': {'TRIPS': ['VIEW', 'EDIT'], 'SCHEDULE': ['VIEW'], 'TASKS': ['VIEW', 'CREATE', 'EDIT']}}
    add('update', '200 · Permissions adjusted for this one person', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{invited}', grants), grants)
    role = {'role': 'ASSISTANT'}
    add('update', "200 · Role changed — permissions reset to the new role's defaults", 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{invited}', role), role)
    never = {'permissions': {'RECEIVABLES': ['VIEW']}}
    add('update', '400 · Something the role can never have', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{invited}', never), never)
    add('update', '400 · Empty patch', 'PATCH', '/users/:id', owner.request('PATCH', f'/users/{invited}', {}), {})
    lower = {'role': 'broker'}
    add('update', '400 · Enum is case-sensitive', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{invited}', lower), lower)
    suspend = {'status': 'SUSPENDED'}
    add('update', '400 · Invitation is still pending', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{invited}', suspend), suspend)

    _, me = owner.request('GET', '/auth/me')
    owner_id = me['data']['id']
    to_broker = {'role': 'BROKER'}
    add('update', '400 · Cannot change your own role', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{owner_id}', to_broker), to_broker)
    mine = {'permissions': {'TRIPS': ['VIEW']}}
    add('update', '400 · The owner always has every permission', 'PATCH', '/users/:id',
        owner.request('PATCH', f'/users/{owner_id}', mine), mine)
    _, admin_me = admin.request('GET', '/auth/me')
    add('update', '400 · Cannot change your own permissions', 'PATCH', '/users/:id',
        admin.request('PATCH', f"/users/{admin_me['data']['id']}", mine), mine)
    add('update', '403 · The owner account is immutable', 'PATCH', '/users/:id',
        admin.request('PATCH', f'/users/{owner_id}', suspend), suspend)
    add('update', '403 · No Users & Roles · Edit', 'PATCH', '/users/:id',
        broker.request('PATCH', f'/users/{invited}', phone), phone)

    # --- withdraw ---------------------------------------------------------
    # A fresh invitee with a task on them: refused while it is attached, then
    # withdrawn once the task is unassigned and archived. Nothing is left behind.
    probe = {**plain, 'email': f'avery.withdraw+{stamp}@example.com'}
    _, made = owner.request('POST', '/users/invite', probe)
    probe_id = made['data']['user']['id']
    _, task = owner.request('POST', '/tasks', {'title': 'Postman probe — withdraw invitation', 'assigneeId': probe_id})
    task_id = task['data']['id']
    path = '/users/:id/invitation'
    add('withdraw', '409 · Records attached (a task here)', 'DELETE', path,
        owner.request('DELETE', f'/users/{probe_id}/invitation'))
    owner.request('PATCH', f'/tasks/{task_id}', {'assigneeId': None})
    owner.request('DELETE', f'/tasks/{task_id}')
    add('withdraw', '403 · No Users & Roles · Invite users', 'DELETE', path,
        broker.request('DELETE', f'/users/{probe_id}/invitation'))
    add('withdraw', '200 · Withdrawn — deleted permanently, address free again', 'DELETE', path,
        owner.request('DELETE', f'/users/{probe_id}/invitation'))
    add('withdraw', '404 · Already withdrawn, or no such user', 'DELETE', path,
        owner.request('DELETE', f'/users/{probe_id}/invitation'))
    add('withdraw', '400 · Has signed in — suspend instead', 'DELETE', path,
        owner.request('DELETE', f'/users/{barry}/invitation'))
    return cap


PERMISSIONS_DOC = (
    "**Permissions are per person** (7 Oct 2026). A permission is a **module** — one per sidebar "
    "screen — and an **action** in it, sent as `{ \"QUOTES\": [\"VIEW\", \"SEND\"] }`.\n\n"
    f"- Modules (case-sensitive): {MODULE_VALUES}\n"
    f"- Actions (case-sensitive): {ACTION_VALUES} — each module has its own subset; `GET /roles` lists them.\n\n"
    "A module left out has no access. VIEW is added to any ticked module, and VIEW on the modules a "
    "ticked one needs (Quotes needs Clients and Trip Requests). Refused with **400**, every reason "
    "named: anything the role can never hold, and anything the caller does not hold themselves (the "
    "owner excepted). How far each action reaches — own, assigned or all records — is the role's, "
    "never sent here."
)


def build(cap: dict) -> dict:
    return {
        'name': '04 · Users',
        'description': (
            "Team directory, invitations, status, roles and each person's own permissions.\n\n"
            "**Authorization is per person.** Each route checks the caller's own `USERS` permission — "
            "View (stats, detail, roles), Invite users, Edit / suspend users, and Change roles & "
            "permissions for any change to a role or a permission set. Without it: **403**.\n\n"
            "`GET /users` is the exception: every module's broker picker reads it, so any staff member "
            "may list colleagues. Without Users & Roles · View the rows are reduced to names and roles, "
            "active accounts only.\n\n"
            "The folder signs in as the seeded owner. Invitations go to example.com, which never delivers."
        ),
        'item': [
            {
                'name': '01 · List team members',
                'event': [script('test', [
                    "// Feeds the detail request: a broker, never the signed-in owner.",
                    "const rows = pm.response.json().data || [];",
                    "const target = rows.find(u => u.role === 'BROKER') || rows[0];",
                    "if (target) pm.collectionVariables.set('userId', target.id);",
                    "pm.test('a page with meta', () => {",
                    "    pm.response.to.have.status(200);",
                    "    pm.expect(pm.response.json()).to.have.property('meta');",
                    "});",
                ])],
                'request': {
                    'method': 'GET', 'header': [],
                    'url': url('/users', [
                        {'key': 'page', 'value': '1', 'description': 'Page number. Integer, min 1. Default 1.'},
                        {'key': 'limit', 'value': '20', 'description': 'Rows per page. Integer 1-100. Default 10; above 100 → 400.'},
                        {'key': 'sortBy', 'value': 'createdAt', 'description': f'Allowed (case-sensitive): {SORT_VALUES}. Default createdAt; anything else → 400.'},
                        {'key': 'sortOrder', 'value': 'desc', 'description': 'Allowed (case-sensitive): asc | desc. Default desc.'},
                        {'key': 'search', 'value': 'walsh', 'disabled': True, 'description': 'Case-insensitive match on first name, last name or email.'},
                        {'key': 'role', 'value': 'BROKER', 'disabled': True, 'description': f'Allowed (case-sensitive): {ROLE_VALUES}. Omit for all roles.'},
                        {'key': 'status', 'value': 'ACTIVE', 'disabled': True, 'description': f'Allowed (case-sensitive): {STATUS_VALUES}. Without Users & Roles · View, ACTIVE only whatever is sent.'},
                    ]),
                    'description': (
                        "Paginated staff directory, `{ success, data, meta }`.\n\n"
                        "With Users & Roles · View each row is complete — status, last sign-in, and "
                        "`permissions`, the person's own set as `{ MODULE: { reach, actions } }`. Without it "
                        "(any other staff member, for the broker pickers) the row is `id`, `email`, names, "
                        "`role` and `avatarKey`, and only active accounts are listed."
                    ),
                },
                'response': cap['list'],
            },
            {
                'name': '02 · Team stats',
                'event': [status_test(200, 'headcount tiles')],
                'request': {
                    'method': 'GET', 'header': [], 'url': url('/users/stats'),
                    'description': "Totals for the tiles above the table: `total`, `active`, `invited`, `suspended`, "
                                   "`admins` (owner and admins together), `brokers`, `assistants`. Needs Users & Roles · "
                                   "View.\n\nNo parameters.",
                },
                'response': cap['stats'],
            },
            {
                'name': '03 · Roles and their default permissions',
                'event': [status_test(200, 'every role')],
                'request': {
                    'method': 'GET', 'header': [], 'url': url('/roles'),
                    'description': (
                        "Everything the Roles & Permissions tab renders, generated from the server's rules.\n\n"
                        f"`roles[]` — one per role ({ROLE_VALUES}) with `description`, `permissionLevel`, "
                        "live `userCount`, `assignable` (false for the owner), `editable`, and `modules[]`: "
                        "per module its `reach` (OWN | ASSIGNED | ALL, or null), `available`, `requires`, and "
                        "each action as `default` (a new account starts with it) or `locked` (the role can "
                        "never have it). Neither means it can be added for one person.\n\n"
                        "Needs Users & Roles · View. No parameters."
                    ),
                },
                'response': cap['roles'],
            },
            {
                'name': "04 · One role's default permissions",
                'event': [status_test(200, 'the role defaults')],
                'request': {
                    'method': 'GET', 'header': [],
                    'url': {**url('/roles/:role/defaults'), 'variable': [{
                        'key': 'role', 'value': 'BROKER',
                        'description': f'Allowed (case-sensitive): {ROLE_VALUES}. Anything else → 400.',
                    }]},
                    'description': "What the invite and edit forms load when a role is picked — the same `modules[]` "
                                   "as one entry of `GET /roles`. Needs Users & Roles · View.",
                },
                'response': cap['defaults'],
            },
            {
                'name': '05 · Get team member',
                'event': [status_test(200, 'one team member')],
                'request': {
                    'method': 'GET', 'header': [],
                    'url': {**url('/users/:id'), 'variable': [{
                        'key': 'id', 'value': '{{userId}}',
                        'description': 'UUID of the team member. Set by `01 · List team members`. Not a UUID → 400.',
                    }]},
                    'description': "One team member with `createdBy`, `updatedBy`, client counts, active trips and "
                                   "their own `permissions`. Needs Users & Roles · View.",
                },
                'response': cap['detail'],
            },
            {
                'name': '06 · Invite team member',
                'event': [
                    script('prerequest', [
                        "// A fresh address per run: a fixed one would 409 on every run after the first.",
                        "// example.com never delivers, so the invitation reaches nobody.",
                        "pm.collectionVariables.set('inviteEmail', `avery.new+${Date.now()}@example.com`);",
                    ]),
                    script('test', [
                        "// The update request below works on this throwaway account,",
                        "// never on a seeded one.",
                        "if (pm.response.code === 201) {",
                        "    pm.collectionVariables.set('invitedUserId', pm.response.json().data.user.id);",
                        "}",
                        "pm.test('invitation created', () => pm.response.to.have.status(201));",
                    ]),
                ],
                'request': {
                    'method': 'POST', 'header': WRITE_HEADERS, 'url': url('/users/invite'),
                    'description': (
                        "Creates the account as `INVITED` with the first password, emailed with the invitation; "
                        "the first sign-in activates it. `invitation.emailSent` is false when no mail server is "
                        "configured, and `invitation.notice` says what to tell the invitee instead.\n\n"
                        + PERMISSIONS_DOC + "\n\n"
                        "Omit `permissions` for the role's defaults. Sending it needs Users & Roles · Change roles "
                        "& permissions; inviting at all needs Users & Roles · Invite users. An address already in "
                        "use is a 409."
                    ),
                    'body': body({
                        'email': '{{inviteEmail}}',
                        'password': 'Welcome-Aboard-26',
                        'firstName': 'Avery',
                        'lastName': 'Newman',
                        'phone': '+1 555 0163',
                        'role': 'BROKER',
                        'permissions': {'QUOTES': ['VIEW', 'CREATE', 'SEND'], 'REPORTS': ['VIEW', 'EXPORT']},
                    }),
                },
                'response': cap['invite'],
            },
            {
                'name': '07 · Update team member',
                'event': [status_test(200, 'updated')],
                'request': {
                    'method': 'PATCH', 'header': WRITE_HEADERS,
                    'url': {**url('/users/:id'), 'variable': [{
                        'key': 'id', 'value': '{{invitedUserId}}',
                        'description': 'UUID of the team member. Set by `06 · Invite team member`, so a run never '
                                       'edits a seeded account.',
                    }]},
                    'description': (
                        "Partial update; at least one field. `email` and `password` are never accepted here.\n\n"
                        + PERMISSIONS_DOC + "\n\n"
                        "`permissions` replaces the whole set. Changing `role` without it resets the person to the "
                        f"new role's defaults. `role` allows (case-sensitive) {ASSIGNABLE}. `status` allows "
                        "ACTIVE | SUSPENDED, never on an invitation still pending.\n\n"
                        "| Refused | Status |\n|---|---|\n"
                        "| Changing your own role or permissions | 400 |\n"
                        "| Changing the owner's permissions | 400 |\n"
                        "| Modifying the owner, unless you are the owner | 403 |\n"
                        "| Leaving no active administrator | 400 |\n"
                        "| Role or permissions without Change roles & permissions | 403 |\n\n"
                        "Role, status and permission changes are audited as `user.access_changed`, with what was "
                        "granted and removed."
                    ),
                    'body': body({
                        'phone': '+1 555 0199',
                        'permissions': {'TRIPS': ['VIEW', 'EDIT'], 'SCHEDULE': ['VIEW'], 'TASKS': ['VIEW', 'CREATE', 'EDIT']},
                    }),
                },
                'response': cap['update'],
            },
            {
                'name': '08 · Withdraw invitation',
                'event': [
                    script('prerequest', [
                        "// Invites a fresh example.com address to withdraw, so a run never",
                        "// deletes anyone it did not create.",
                        "pm.sendRequest({",
                        "    url: pm.collectionVariables.get('baseUrl') + '/users/invite', method: 'POST',",
                        "    header: { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
                        "    body: { mode: 'raw', raw: JSON.stringify({",
                        "        email: `avery.withdraw+${Date.now()}@example.com`, password: 'Welcome-Aboard-26',",
                        "        firstName: 'Avery', lastName: 'Withdrawn', role: 'BROKER',",
                        "    }) },",
                        "}, function (err, res) {",
                        "    if (!err && res.code === 201) pm.collectionVariables.set('withdrawUserId', res.json().data.user.id);",
                        "});",
                    ]),
                    status_test(200, 'invitation withdrawn'),
                ],
                'request': {
                    'method': 'DELETE', 'header': WRITE_HEADERS[1:],
                    'url': {**url('/users/:id/invitation'), 'variable': [{
                        'key': 'id', 'value': '{{withdrawUserId}}',
                        'description': 'UUID of a team member still INVITED. Set by this request\'s pre-request script, which invites a throwaway address.',
                    }]},
                    'description': (
                        "Withdraws an invitation nobody accepted — **the one permanent delete in the system** "
                        "(7 Oct 2026). The invitee never signed in, so there is no history to lose; the row is "
                        "deleted and the email address is free to invite again. The audit log keeps "
                        "`user.invitation_withdrawn`.\n\n"
                        "| Refused | Status |\n|---|---|\n"
                        "| The account has signed in — suspend it instead | 400 |\n"
                        "| Clients, trips, quotes, tasks, referrals, commissions, documents or sent emails are "
                        "attached — the message names them | 409 |\n"
                        "| No Users & Roles · Invite users | 403 |\n\n"
                        "No body."
                    ),
                },
                'response': cap['withdraw'],
            },
        ],
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {'userId': '', 'invitedUserId': '', 'inviteEmail': '', 'withdrawUserId': ''})
    folder = with_session(build(capture()), 'owner')
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
