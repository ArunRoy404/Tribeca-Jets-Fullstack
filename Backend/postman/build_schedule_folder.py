#!/usr/bin/env python3
"""
Builds `23 · Schedule` (#13), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_schedule_folder.py
    cd postman && python3 rewrite_body_comments.py

The calendar is read-only, so the folder books a round trip of its own first —
out on 18 Dec 2026, back on 21 Dec — narrows every request to it by its
reference, and archives it again at the end, in the builder and in the
folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    Session, copy_folder_login, ensure_variables, example, script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
STATUSES = 'DRAFT | BOOKED | CONFIRMED | IN_FLIGHT | COMPLETED | CANCELLED'
TYPES = 'ONE_WAY | ROUND_TRIP | MULTI_LEG'
OUT_DAY, BACK_DAY = '2026-12-18', '2026-12-21'
WINDOW = ('2026-12-14', '2026-12-27')

# A round trip of the folder's own, so it runs alone and never reads the desk's.
SETUP = [
    '// Book a round trip for this folder to show on the calendar.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (e1, clients) {",
    "    pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (e2, airports) {",
    '        if (e1 || e2) { return; }',
    '        const a = airports.json().data;',
    '        const body = {',
    "            clientId: clients.json().data[0].id, type: 'ROUND_TRIP', status: 'BOOKED',",
    '            legs: [',
    f"                {{ originAirportId: a[0].id, destinationAirportId: a[1].id, departureDate: '{OUT_DAY}', departureTime: '09:30' }},",
    f"                {{ originAirportId: a[1].id, destinationAirportId: a[0].id, departureDate: '{BACK_DAY}', departureTime: '16:00' }},",
    '            ],',
    '        };',
    "        pm.sendRequest({ url: base + '/trips', method: 'POST', header: headers, body: { mode: 'raw', raw: JSON.stringify(body) } },",
    '            function (err, res) {',
    '                if (err || res.code !== 201) { return; }',
    '                const trip = res.json().data;',
    "                pm.collectionVariables.set('scheduleTripId', trip.id);",
    "                pm.collectionVariables.set('scheduleTripRef', 'TJ-' + trip.reference);",
    '            });',
    '    });',
    '});',
]

TEARDOWN = [
    '// Archive the round trip this folder booked. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/trips/' + pm.collectionVariables.get('scheduleTripId'), method: 'DELETE',",
    "    header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') } }, function () {});",
]

FILTER_QUERY = [
    {'key': 'status', 'value': None, 'disabled': True,
     'description': f'optional · {STATUSES} (case-sensitive). Absent leaves cancelled trips off; CANCELLED shows only them.'},
    {'key': 'type', 'value': None, 'disabled': True, 'description': f'optional · {TYPES}.'},
    {'key': 'assignedBrokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid. One broker\'s trips.'},
    {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
    {'key': 'aircraftId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
]


def search_param(value='{{scheduleTripRef}}'):
    return {'key': 'search', 'value': value,
            'description': 'optional · the trip reference ("TJ-1048" or "1048"), client, tail, model or operator. Here, the folder\'s own trip.'}


def build(owner: Session, broker: Session, agent: Session, anonymous: Session):
    cap = {}
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    trip = owner.request('POST', '/trips', {
        'clientId': client_id, 'type': 'ROUND_TRIP', 'status': 'BOOKED',
        'legs': [
            {'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
             'departureDate': OUT_DAY, 'departureTime': '09:30'},
            {'originAirportId': airports[1]['id'], 'destinationAirportId': airports[0]['id'],
             'departureDate': BACK_DAY, 'departureTime': '16:00'},
        ],
    })[1]['data']
    ref = f"TJ-{trip['reference']}"
    window = f'from={WINDOW[0]}&to={WINDOW[1]}'

    try:
        cap['list'] = owner.request('GET', f'/schedule?{window}&search={ref}')
        cap['list_broker'] = broker.request('GET', f'/schedule?{window}&search={ref}')
        cap['list_400_wide'] = owner.request('GET', '/schedule?from=2026-01-01&to=2026-12-31')
        cap['list_400_order'] = owner.request('GET', '/schedule?from=2026-12-27&to=2026-12-14')
        cap['list_400_param'] = owner.request('GET', f'/schedule?{window}&sortBy=createdAt')
        cap['list_401'] = anonymous.request('GET', f'/schedule?{window}')
        cap['list_403'] = agent.request('GET', f'/schedule?{window}')
        cap['stats'] = owner.request('GET', f'/schedule/stats?on={OUT_DAY}&search={ref}')
        cap['stats_400'] = owner.request('GET', '/schedule/stats?on=18-12-2026')
        cap['calendar'] = owner.request('GET', f'/schedule/calendar?year=2026&search={ref}')
        cap['calendar_400'] = owner.request('GET', '/schedule/calendar')
    finally:
        owner.request('DELETE', f"/trips/{trip['id']}")

    list_query = [
        {'key': 'from', 'value': WINDOW[0], 'description': 'required · YYYY-MM-DD, inclusive, by the leg\'s departure day.'},
        {'key': 'to', 'value': WINDOW[1], 'description': 'required · YYYY-MM-DD, inclusive. On or after `from`, at most 42 days on.'},
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '100', 'description': 'optional · integer 1-100. Default 10; the calendar asks for 100.'},
        search_param(),
        *FILTER_QUERY,
    ]

    items = [
        {
            'name': '01 · Legs in a window',
            'event': [script('prerequest', SETUP), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/schedule', list_query),
                'description': (
                    'One row per trip leg departing on a day in [from, to], in the order they fly — by day, then time, '
                    'untimed last. Every fact on a row is the trip\'s own, read on this request: nothing is stored for '
                    'the calendar. `arrivalTime` and `flightTime` come from the trip\'s itinerary and only for the '
                    'outbound leg; `trip.clientPayment` is absent for a role that may not read receivables. VIEW_TRIPS, '
                    'at the trip scope. Its pre-request books a round trip for the folder to find.'),
            },
            'response': [
                example('200 · Both legs of a round trip', 'GET', f'/schedule?{window}&search={ref}', *cap['list']),
                example('400 · A window wider than 42 days', 'GET', '/schedule?from=2026-01-01&to=2026-12-31', *cap['list_400_wide']),
                example('400 · A window that ends before it starts', 'GET', '/schedule?from=2026-12-27&to=2026-12-14',
                        *cap['list_400_order']),
                example('400 · A parameter it does not take', 'GET', f'/schedule?{window}&sortBy=createdAt', *cap['list_400_param']),
                example('401 · Not signed in', 'GET', f'/schedule?{window}', *cap['list_401']),
                example('403 · A referral agent has no calendar', 'GET', f'/schedule?{window}', *cap['list_403']),
            ],
        },
        {
            'name': '02 · As a broker',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/schedule', [
                    {'key': 'from', 'value': WINDOW[0], 'description': 'required · YYYY-MM-DD.'},
                    {'key': 'to', 'value': WINDOW[1], 'description': 'required · YYYY-MM-DD.'},
                    search_param(),
                ]),
                'description': (
                    'The trips board\'s own scope: a broker sees the legs of the trips assigned to them and of the '
                    'unassigned ones. The folder\'s trip is unassigned, so both legs show. Captured as the seeded '
                    'broker; in the collection it runs as the folder\'s own account.'),
            },
            'response': [example('200 · Scoped like the trips board (as a broker)', 'GET', f'/schedule?{window}&search={ref}',
                                 *cap['list_broker'])],
        },
        {
            'name': '03 · Tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/schedule/stats', [
                    {'key': 'on', 'value': OUT_DAY,
                     'description': 'optional · YYYY-MM-DD, the day that counts as today — the browser sends its own. Default today in UTC.'},
                    search_param(),
                    *FILTER_QUERY,
                ]),
                'description': (
                    'Legs departing today, legs in the next seven days (tomorrow onward), legs today whose trip is '
                    'completed, and trips in flight — a trip, not a leg, so a round trip in the air counts once. The '
                    'same filters as the list.'),
            },
            'response': [
                example('200 · Counted on the outbound day', 'GET', f'/schedule/stats?on={OUT_DAY}&search={ref}', *cap['stats']),
                example('400 · A day that is not YYYY-MM-DD', 'GET', '/schedule/stats?on=18-12-2026', *cap['stats_400']),
            ],
        },
        {
            'name': '04 · A year of counts',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/schedule/calendar', [
                    {'key': 'year', 'value': '2026', 'description': 'required · integer 2000-2100.'},
                    search_param(),
                    *FILTER_QUERY,
                ]),
                'description': (
                    'The year view: legs counted per month and per day that has any, under the same filters as the '
                    'list. Counts only — a day is opened with the list.'),
            },
            'response': [
                example('200 · Two legs in December', 'GET', f'/schedule/calendar?year=2026&search={ref}', *cap['calendar']),
                example('400 · No year', 'GET', '/schedule/calendar', *cap['calendar_400']),
            ],
        },
        {
            'name': '05 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe trip archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/schedule/stats'),
                'description': 'Archives the round trip this folder booked. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '23 · Schedule',
        'description': (
            'The calendar (#13): trip legs by the day they depart, the tiles above it and a year of counts. Read-only '
            'and stored nowhere — every row is a trip leg read through the trips module under the trip scope. Runs '
            'alone: it books a round trip of its own and archives it afterwards.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@example.com')
    broker = Session('broker@example.com')
    agent = Session('agent@example.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {'scheduleTripId': '', 'scheduleTripRef': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
