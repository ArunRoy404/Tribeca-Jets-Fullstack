#!/usr/bin/env python3
"""
Builds `27 · Dashboard` (#24), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_dashboard_folder.py
    cd postman && python3 rewrite_body_comments.py

Every request is a read, so the folder writes nothing and needs no teardown.
Requests 04-07 are the owning modules' own list endpoints with the filter the
overview adds to each — documented here, where the screen that uses them is.
"""

import json
import pathlib

from builder_common import Session, copy_folder_login, example, status_test, url
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
PERIODS = 'TODAY | WEEK | MONTH | QUARTER | YEAR'


def page_params(extra=None):
    return [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '6', 'description': 'optional · integer 1-100. Default 10.'},
        *(extra or []),
    ]


def build(owner: Session, broker: Session, assistant: Session, agent: Session, anonymous: Session):
    cap = {}
    on = '2026-09-28'
    summary = f'/dashboard/summary?period=WEEK&on={on}'
    priorities = f'/dashboard/priorities?limit=6&on={on}'
    activity = '/dashboard/activity?limit=6'
    trips = '/trips?departure=ONWARD&activeOnly=true&sortBy=departureDate&sortOrder=asc&limit=5'
    follow_ups = '/clients?followUp=SCHEDULED&sortBy=nextFollowUpAt&sortOrder=asc&limit=5'
    invoices = '/receivables?open=true&sortBy=dueDate&sortOrder=asc&limit=4'
    bills = '/operator-payments?open=true&sortBy=dueDate&sortOrder=asc&limit=4'

    cap['summary'] = owner.request('GET', summary)
    cap['summary_broker'] = broker.request('GET', summary)
    cap['summary_assistant'] = assistant.request('GET', summary)
    cap['summary_400'] = owner.request('GET', '/dashboard/summary?period=FORTNIGHT')
    cap['summary_400_param'] = owner.request('GET', '/dashboard/summary?search=TJ')
    cap['summary_401'] = anonymous.request('GET', summary)
    cap['summary_403'] = agent.request('GET', summary)

    cap['priorities'] = owner.request('GET', priorities)
    cap['priorities_broker'] = broker.request('GET', priorities)
    cap['priorities_400'] = owner.request('GET', '/dashboard/priorities?limit=0')
    cap['priorities_403'] = agent.request('GET', priorities)

    cap['activity'] = owner.request('GET', activity)
    cap['activity_broker'] = broker.request('GET', activity)
    cap['activity_400'] = owner.request('GET', '/dashboard/activity?search=Citation')
    cap['activity_403'] = agent.request('GET', activity)

    cap['trips'] = owner.request('GET', trips)
    cap['trips_400'] = owner.request('GET', '/trips?departure=SOON')
    cap['follow_ups'] = owner.request('GET', follow_ups)
    cap['invoices'] = owner.request('GET', invoices)
    cap['invoices_403'] = agent.request('GET', invoices)
    cap['bills'] = owner.request('GET', bills)
    cap['bills_403'] = assistant.request('GET', bills)

    items = [
        {
            'name': '01 · Summary tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/dashboard/summary', [
                    {'key': 'period', 'value': 'WEEK', 'description': f'optional · {PERIODS}. Default WEEK. '
                     'The calendar day, week (Monday first), month or quarter containing `on`, or YEAR to date.'},
                    {'key': 'on', 'value': on, 'description': 'optional · YYYY-MM-DD, the desk\'s today. Default today in UTC.'},
                ]),
                'description': (
                    'Upcoming trips and active requests as they stand now; revenue, FET and gross profit for trips '
                    'departing in the window against the window before it (`change` is a whole percent, null with '
                    'nothing to compare); receivables, operator payments and empty legs as they stand. A section '
                    'the caller may not read is absent — `money` for a role without VIEW_FINANCIALS. Any other '
                    'query parameter is a 400.'),
            },
            'response': [
                example('200 · An administrator\'s week', 'GET', summary, *cap['summary']),
                example('200 · A broker\'s — their own trips only', 'GET', summary, *cap['summary_broker']),
                example('200 · An assistant\'s — no money section', 'GET', summary, *cap['summary_assistant']),
                example('400 · Unknown period', 'GET', '/dashboard/summary?period=FORTNIGHT', *cap['summary_400']),
                example('400 · A parameter the endpoint does not take', 'GET', '/dashboard/summary?search=TJ',
                        *cap['summary_400_param']),
                example('401 · Not signed in', 'GET', summary, *cap['summary_401']),
                example('403 · A referral agent has no dashboard here', 'GET', summary, *cap['summary_403']),
            ],
        },
        {
            'name': "02 · Today's priorities",
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/dashboard/priorities', page_params([
                    {'key': 'on', 'value': on, 'description': 'optional · YYYY-MM-DD, the desk\'s today. Default today in UTC.'},
                ])),
                'description': (
                    'Client follow-ups due by today, your own tasks due by today, and client invoices and operator '
                    'bills still owed that are overdue or due within three days — most overdue first. `kind` is '
                    'FOLLOW_UP | TASK | CLIENT_PAYMENT | OPERATOR_PAYMENT; `state` is OVERDUE | DUE_TODAY | DUE_SOON. '
                    'A source the caller may not read is left out. Page and limit only.'),
            },
            'response': [
                example('200 · An administrator\'s', 'GET', priorities, *cap['priorities']),
                example('200 · A broker\'s — their own clients and trips', 'GET', priorities, *cap['priorities_broker']),
                example('400 · Limit below 1', 'GET', '/dashboard/priorities?limit=0', *cap['priorities_400']),
                example('403 · A referral agent', 'GET', priorities, *cap['priorities_403']),
            ],
        },
        {
            'name': '03 · Recent activity',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/dashboard/activity', page_params()),
                'description': (
                    "The audit trail, newest first: everybody's activity on the kinds of record you can see all "
                    'of, and your own on the rest. `subject` names the record — `type` is where it opens, '
                    '`label` how it reads ("TJ-1048", a client\'s name) — or is null for a kind with no label. '
                    'Sign-ins are never listed, and no raw metadata is returned. Page and limit only.'),
            },
            'response': [
                example('200 · An administrator\'s — the whole desk', 'GET', activity, *cap['activity']),
                example('200 · A broker\'s — their own actions on scoped records', 'GET', activity,
                        *cap['activity_broker']),
                example('400 · Search is not offered here', 'GET', '/dashboard/activity?search=Citation',
                        *cap['activity_400']),
                example('403 · A referral agent', 'GET', activity, *cap['activity_403']),
            ],
        },
        {
            'name': '04 · Upcoming trips (the trips list)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/trips', [
                    {'key': 'departure', 'value': 'ONWARD', 'description':
                     'optional · PAST | TODAY | UPCOMING | ONWARD. ONWARD is today and later — the dashboard\'s.'},
                    {'key': 'activeOnly', 'value': 'true', 'description': 'optional · true | false. Default false.'},
                    {'key': 'sortBy', 'value': 'departureDate', 'description': 'optional · see 15 · Trips. Default createdAt.'},
                    {'key': 'sortOrder', 'value': 'asc', 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'limit', 'value': '5', 'description': 'optional · integer 1-100. Default 10.'},
                ]),
                'description': 'The trips board\'s own list, soonest departure first. Every other filter is in 15 · Trips.',
            },
            'response': [
                example('200 · Departing today or later', 'GET', trips, *cap['trips']),
                example('400 · Unknown window', 'GET', '/trips?departure=SOON', *cap['trips_400']),
            ],
        },
        {
            'name': '05 · Upcoming follow-ups (the clients list)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/clients', [
                    {'key': 'followUp', 'value': 'SCHEDULED', 'description':
                     'optional · OVERDUE | TODAY | UPCOMING | SCHEDULED. SCHEDULED is any follow-up set.'},
                    {'key': 'sortBy', 'value': 'nextFollowUpAt', 'description': 'optional · see 03 · Clients. Default createdAt.'},
                    {'key': 'sortOrder', 'value': 'asc', 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'limit', 'value': '5', 'description': 'optional · integer 1-100. Default 10.'},
                ]),
                'description': 'The client directory\'s own list, soonest follow-up first, in the caller\'s scope.',
            },
            'response': [example('200 · Soonest first', 'GET', follow_ups, *cap['follow_ups'])],
        },
        {
            'name': '06 · Open invoices (the receivables list)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/receivables', [
                    {'key': 'open', 'value': 'true', 'description':
                     'optional · true | false. true keeps DUE, PARTIALLY_PAID and OVERDUE; with `state`, both must hold.'},
                    {'key': 'sortBy', 'value': 'dueDate', 'description': 'optional · see 19 · Receivables. Default createdAt.'},
                    {'key': 'sortOrder', 'value': 'asc', 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'limit', 'value': '4', 'description': 'optional · integer 1-100. Default 10.'},
                ]),
                'description': 'What clients still owe, soonest due first. Totals come from GET /receivables/stats.',
            },
            'response': [
                example('200 · Still owed', 'GET', invoices, *cap['invoices']),
                example('403 · A referral agent', 'GET', invoices, *cap['invoices_403']),
            ],
        },
        {
            'name': '07 · Open operator bills (the operator payments list)',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/operator-payments', [
                    {'key': 'open', 'value': 'true', 'description':
                     'optional · true | false. true keeps DUE, PARTIALLY_PAID and OVERDUE; with `state`, both must hold.'},
                    {'key': 'sortBy', 'value': 'dueDate', 'description': 'optional · see 20 · Operator Payments. Default createdAt.'},
                    {'key': 'sortOrder', 'value': 'asc', 'description': 'optional · asc | desc. Default desc.'},
                    {'key': 'limit', 'value': '4', 'description': 'optional · integer 1-100. Default 10.'},
                ]),
                'description': 'What is still owed to operators, soonest due first. Totals come from GET /operator-payments/stats.',
            },
            'response': [
                example('200 · Still owed', 'GET', bills, *cap['bills']),
                example('403 · An assistant does not read operator payments', 'GET', bills, *cap['bills_403']),
            ],
        },
    ]

    return {
        'name': '27 · Dashboard',
        'description': (
            'Dashboard (#24): the overview\'s tiles, priorities and activity feed, and the four owning-module '
            'lists it reads beside them. Everything is a read, scoped per caller; nothing is written.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@example.com')
    broker = Session('broker@example.com')
    assistant = Session('assistant@example.com')
    agent = Session('agent@example.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, assistant, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
