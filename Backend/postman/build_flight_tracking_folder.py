#!/usr/bin/env python3
"""
Builds `24 · Flight Tracking` (#14), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_flight_tracking_folder.py
    cd postman && python3 rewrite_body_comments.py

Flight tracking is **manual** — no flight-data provider — so the folder books
a one-way trip of its own, reports on its flight (delayed, then in the air),
reads the flight's timeline, and archives the trip at the end, in the builder
and in the folder's own teardown.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, ensure_variables, example, script, status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
FLIGHT_STATUSES = 'NOT_DEPARTED | DELAYED | IN_FLIGHT | LANDED | DIVERTED'
DAY = '2026-12-18'

# A one-way trip of the folder's own, so it runs alone and never reports on the desk's flights.
SETUP = [
    '// Book a one-way trip whose flight this folder reports on.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "const headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') };",
    "pm.sendRequest({ url: base + '/clients?limit=1', method: 'GET' }, function (e1, clients) {",
    "    pm.sendRequest({ url: base + '/airports?limit=2', method: 'GET' }, function (e2, airports) {",
    '        if (e1 || e2) { return; }',
    '        const a = airports.json().data;',
    '        const body = {',
    "            clientId: clients.json().data[0].id, type: 'ONE_WAY', status: 'BOOKED',",
    f"            legs: [{{ originAirportId: a[0].id, destinationAirportId: a[1].id, departureDate: '{DAY}', departureTime: '22:00' }}],",
    '        };',
    "        pm.sendRequest({ url: base + '/trips', method: 'POST', header: headers, body: { mode: 'raw', raw: JSON.stringify(body) } },",
    '            function (err, res) {',
    '                if (err || res.code !== 201) { return; }',
    '                const trip = res.json().data;',
    "                pm.collectionVariables.set('flightTripId', trip.id);",
    "                pm.collectionVariables.set('flightTripRef', 'TJ-' + trip.reference);",
    "                pm.collectionVariables.set('flightLegId', trip.legs[0].id);",
    '            });',
    '    });',
    '});',
]

TEARDOWN = [
    '// Archive the trip this folder booked. Nothing is deleted.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/trips/' + pm.collectionVariables.get('flightTripId'), method: 'DELETE',",
    "    header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') } }, function () {});",
]

DELAYED_BODY = """{
  "flightStatus": "DELAYED",                            // optional · NOT_DEPARTED | DELAYED | IN_FLIGHT | LANDED | DIVERTED (case-sensitive)
  "estimatedArrival": "01:40",                          // optional · "HH:MM", 24-hour, local at the destination. null clears it
  "trackingUrl": "https://flightaware.com/live/flight/N780EX",  // optional · a full http(s) link, max 500. null clears it
  "note": "30-minute ground hold at the origin, weather" // optional · 1-1000 characters, recorded on the flight's timeline
}"""

IN_FLIGHT_BODY = """{
  "flightStatus": "IN_FLIGHT",                          // optional · the new reported state
  "note": "Wheels up 22:34 per the operator"            // optional · recorded on the flight's timeline
}"""

TRIP_FILTERS = [
    {'key': 'status', 'value': None, 'disabled': True,
     'description': 'optional · the trip\'s status, DRAFT | BOOKED | CONFIRMED | IN_FLIGHT | COMPLETED | CANCELLED. Absent leaves cancelled trips off.'},
    {'key': 'type', 'value': None, 'disabled': True, 'description': 'optional · ONE_WAY | ROUND_TRIP | MULTI_LEG.'},
    {'key': 'assignedBrokerId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
    {'key': 'operatorId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
    {'key': 'aircraftId', 'value': None, 'disabled': True, 'description': 'optional · uuid.'},
]


def search_param():
    return {'key': 'search', 'value': '{{flightTripRef}}',
            'description': 'optional · the trip reference ("TJ-1048" or "1048"), client, tail, model or operator. Here, the folder\'s own trip.'}


def on_param():
    return {'key': 'on', 'value': DAY,
            'description': 'optional · YYYY-MM-DD, the day that counts as today — the browser sends its own. Default today in UTC.'}


def build(owner: Session, broker: Session, assistant: Session, agent: Session, anonymous: Session):
    cap = {}
    client_id = owner.request('GET', '/clients?limit=1')[1]['data'][0]['id']
    airports = owner.request('GET', '/airports?limit=2')[1]['data']
    trip = owner.request('POST', '/trips', {
        'clientId': client_id, 'type': 'ONE_WAY', 'status': 'BOOKED',
        'legs': [{'originAirportId': airports[0]['id'], 'destinationAirportId': airports[1]['id'],
                  'departureDate': DAY, 'departureTime': '22:00'}],
    })[1]['data']
    ref = f"TJ-{trip['reference']}"
    leg = trip['legs'][0]['id']
    delayed = json.loads('{"flightStatus": "DELAYED", "estimatedArrival": "01:40", '
                         '"trackingUrl": "https://flightaware.com/live/flight/N780EX", '
                         '"note": "30-minute ground hold at the origin, weather"}')
    in_flight = {'flightStatus': 'IN_FLIGHT', 'note': 'Wheels up 22:34 per the operator'}

    try:
        cap['list'] = owner.request('GET', f'/flight-tracking?search={ref}')
        cap['list_broker'] = broker.request('GET', f'/flight-tracking?search={ref}')
        cap['list_400'] = owner.request('GET', '/flight-tracking?window=LIVE')
        cap['list_400_param'] = owner.request('GET', '/flight-tracking?sortBy=createdAt')
        cap['list_401'] = anonymous.request('GET', '/flight-tracking')
        cap['list_403'] = agent.request('GET', '/flight-tracking')
        cap['one_404'] = owner.request('GET', f'/flight-tracking/{MISSING}')

        cap['delay'] = owner.request('PATCH', f'/flight-tracking/{leg}', delayed)
        cap['delay_400_same'] = owner.request('PATCH', f'/flight-tracking/{leg}', {'flightStatus': 'DELAYED'})
        cap['delay_400_time'] = owner.request('PATCH', f'/flight-tracking/{leg}', {'estimatedArrival': '1:40 AM'})
        cap['delay_403'] = assistant.request('PATCH', f'/flight-tracking/{leg}', in_flight)
        cap['delay_404'] = owner.request('PATCH', f'/flight-tracking/{MISSING}', in_flight)
        cap['depart'] = owner.request('PATCH', f'/flight-tracking/{leg}', in_flight)

        cap['one'] = owner.request('GET', f'/flight-tracking/{leg}')
        cap['stats'] = owner.request('GET', f'/flight-tracking/stats?on={DAY}&search={ref}')
        cap['stats_400'] = owner.request('GET', '/flight-tracking/stats?on=18-12-2026')
        cap['timeline'] = owner.request('GET', f'/notes/timeline?subjectType=FLIGHT&subjectId={leg}')

        owner.request('POST', f"/trips/{trip['id']}/status", {'status': 'CANCELLED', 'note': 'Postman probe'})
        cap['cancelled_400'] = owner.request('PATCH', f'/flight-tracking/{leg}', {'flightStatus': 'LANDED'})
    finally:
        owner.request('DELETE', f"/trips/{trip['id']}")

    path = f'/flight-tracking/{leg}'
    items = [
        {
            'name': '01 · Flights',
            'event': [script('prerequest', SETUP), status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/flight-tracking', [
                    {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
                    {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
                    {'key': 'window', 'value': None, 'disabled': True,
                     'description': 'optional · ACTIVE (departing today onward, plus anything reported in the air or delayed) | TODAY | PAST (most recent first). Absent: every flight.'},
                    {'key': 'flightStatus', 'value': None, 'disabled': True,
                     'description': f'optional · {FLIGHT_STATUSES} | NONE (nobody has reported yet).'},
                    search_param(), on_param(), *TRIP_FILTERS,
                ]),
                'description': (
                    'One row per trip leg, nearest first. **Manual**: `flightStatus`, `estimatedArrival` and '
                    '`trackingUrl` are what the desk last reported — nothing comes from a flight-data feed, and '
                    '`flightStatus` is null until someone reports, never assumed "not departed". The trip\'s facts '
                    'ride along, read on this request. VIEW_TRIPS, at the trip scope. Its pre-request books a '
                    'one-way trip for the folder to report on.'),
            },
            'response': [
                example('200 · A flight nobody has reported on', 'GET', f'/flight-tracking?search={ref}', *cap['list']),
                example('400 · Unknown window', 'GET', '/flight-tracking?window=LIVE', *cap['list_400']),
                example('400 · A parameter it does not take', 'GET', '/flight-tracking?sortBy=createdAt', *cap['list_400_param']),
                example('401 · Not signed in', 'GET', '/flight-tracking', *cap['list_401']),
                example('403 · A referral agent has no flight board', 'GET', '/flight-tracking', *cap['list_403']),
            ],
        },
        {
            'name': '02 · As a broker',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/flight-tracking', [search_param()]),
                'description': (
                    'The trips board\'s scope: a broker sees the flights of their own trips and the unassigned ones. '
                    'The folder\'s trip is unassigned. Captured as the seeded broker; in the collection it runs as the '
                    'folder\'s own account.'),
            },
            'response': [example('200 · Scoped like the trips board (as a broker)', 'GET', f'/flight-tracking?search={ref}',
                                 *cap['list_broker'])],
        },
        {
            'name': '03 · Report a delay',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': DELAYED_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/flight-tracking/{{flightLegId}}'),
                'description': (
                    'Only what is sent changes. A status change is stamped (`flightStatusAt`) and written to the audit '
                    'log with its note — that entry is what the flight\'s timeline replays. Refused with 400 when '
                    'nothing would change, and on a cancelled or archived trip. MANAGE_TRIPS.'),
            },
            'response': [
                example('200 · Reported delayed, with an estimate and a link', 'PATCH', path, *cap['delay'], req_body=delayed),
                example('400 · Nothing would change', 'PATCH', path, *cap['delay_400_same'], req_body={'flightStatus': 'DELAYED'}),
                example('400 · A 12-hour time', 'PATCH', path, *cap['delay_400_time'], req_body={'estimatedArrival': '1:40 AM'}),
                example('403 · An assistant cannot report', 'PATCH', path, *cap['delay_403'], req_body=in_flight),
                example('404 · No such flight', 'PATCH', f'/flight-tracking/{MISSING}', *cap['delay_404'], req_body=in_flight),
                example('400 · The trip is cancelled', 'PATCH', path, *cap['cancelled_400'], req_body={'flightStatus': 'LANDED'}),
            ],
        },
        {
            'name': '04 · Report it in the air',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'PATCH', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': IN_FLIGHT_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/flight-tracking/{{flightLegId}}'),
                'description': 'The estimate and the link from the last report stay as they were — only the status moves.',
            },
            'response': [example('200 · In flight', 'PATCH', path, *cap['depart'], req_body=in_flight)],
        },
        {
            'name': '05 · One flight',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/flight-tracking/{{flightLegId}}'),
                'description': 'Archived legs and trips load too — a timeline links here.',
            },
            'response': [
                example('200 · As last reported', 'GET', path, *cap['one']),
                example('404 · No such flight', 'GET', f'/flight-tracking/{MISSING}', *cap['one_404']),
            ],
        },
        {
            'name': '06 · Tiles',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/flight-tracking/stats', [on_param(), search_param(), *TRIP_FILTERS]),
                'description': (
                    'Reported in the air, reported delayed, departing today, reported landed today, and due out by '
                    'today with no report at all — under the list\'s trip filters. "Landed today" counts from when '
                    'the landing was reported; nothing else records an arrival day.'),
            },
            'response': [
                example('200 · One flight in the air', 'GET', f'/flight-tracking/stats?on={DAY}&search={ref}', *cap['stats']),
                example('400 · A day that is not YYYY-MM-DD', 'GET', '/flight-tracking/stats?on=18-12-2026', *cap['stats_400']),
            ],
        },
        {
            'name': '07 · The flight\'s updates',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/notes/timeline', [
                    {'key': 'subjectType', 'value': 'FLIGHT', 'description': 'required · FLIGHT — a trip leg.'},
                    {'key': 'subjectId', 'value': '{{flightLegId}}', 'description': 'required · the leg\'s uuid.'},
                ]),
                'description': (
                    'A flight\'s feed is the shared notes timeline on subject FLIGHT: every status report above, from '
                    'the audit log, merged with any note written about the flight (`POST /notes` with '
                    '`subjectType: FLIGHT`). No second note system.'),
            },
            'response': [example('200 · Two reports, newest first', 'GET', f'/notes/timeline?subjectType=FLIGHT&subjectId={leg}',
                                 *cap['timeline'])],
        },
        {
            'name': '08 · Teardown',
            'event': [script('prerequest', TEARDOWN), status_test(200, 'probe trip archived')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/flight-tracking/stats'),
                'description': 'Archives the trip this folder booked. A GET so the request itself changes nothing.',
            },
            'response': [],
        },
    ]

    return {
        'name': '24 · Flight Tracking',
        'description': (
            'Flights (#14) — every trip leg and what the desk has reported about it. **Manual by decision**: no '
            'flight-data provider, so status, arrival estimate and tracking link are entered by hand, and a flight\'s '
            'updates are its notes timeline. Runs alone: it books a trip, reports on it, and archives it afterwards.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@tribecajets.com')
    broker = Session('broker@tribecajets.com')
    assistant = Session('assistant@tribecajets.com')
    agent = Session('agent@tribecajets.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, broker, assistant, agent, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    ensure_variables(collection, {'flightTripId': '', 'flightTripRef': '', 'flightLegId': ''})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
