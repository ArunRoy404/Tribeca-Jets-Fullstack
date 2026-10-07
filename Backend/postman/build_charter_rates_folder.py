#!/usr/bin/env python3
"""
Builds `14 · Charter Rates` — client adjustment #6's instant estimate —
capturing every example from a live API.

    npm run start:dev
    python3 postman/build_charter_rates_folder.py
    cd postman && python3 rewrite_body_comments.py

**It must never overwrite a real rate.** The desk's rates are business data
with no Postman-owned row to play with, so both this builder and the folder
it writes read the Midsize Jet rate first and put it back exactly at the end.
"""

import json
import pathlib

from builder_common import (
    MISSING, WRITE_HEADERS, Session, copy_folder_login, example, script,
    status_test, url,
)
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
CATEGORY = 'MIDSIZE_JET'
CATEGORIES = 'TURBOPROP | LIGHT_JET | MIDSIZE_JET | SUPER_MIDSIZE | HEAVY_JET | ULTRA_LONG_RANGE | VIP_AIRLINER'
FIGURES = ('hourlyRate', 'averageSpeedKnots', 'typicalSeats', 'minimumHours', 'notes')

SET_BODY = """{
  // Every field optional; null clears one. The first PUT for a category
  // creates its row, later ones update it. Amounts are what the desk PAYS.
  "hourlyRate": 4500,                                  // optional · number 1-100000, dollars per flight hour. null = no rate on file.
  "averageSpeedKnots": 420,                            // optional · integer 50-800. Turns distance into flight time.
  "typicalSeats": 8,                                   // optional · integer 1-100. What "fits the party" is checked against.
  "minimumHours": 1.5                                  // optional · number 0-24. Fewest hours billed per leg; null = bill as flown.
}"""

ESTIMATE_BODY = """{
  "originAirportId": "{{estimateOriginId}}",           // required · uuid. Must have coordinates on file.
  "destinationAirportId": "{{estimateDestinationId}}", // required · uuid, different from the origin
  "passengers": 6,                                     // optional · integer 1-100. Enables fitsParty.
  "roundTrip": true                                    // optional · boolean, default false. Doubles the legs.
}"""

# Resolves two airports that have coordinates, rather than trusting ids an
# earlier folder happened to set — so the folder passes run on its own.
AIRPORTS_SCRIPT = [
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/airports?limit=100', method: 'GET' }, function (err, res) {",
    '    if (err || res.code !== 200) { return; }',
    '    const located = res.json().data.filter(function (a) { return a.latitude !== null && a.longitude !== null; });',
    '    if (located.length >= 2) {',
    "        pm.collectionVariables.set('estimateOriginId', located[0].id);",
    "        pm.collectionVariables.set('estimateDestinationId', located[1].id);",
    '    }',
    '});',
]

# Saves the Midsize Jet rate before the folder changes it...
SAVE_RATE_SCRIPT = [
    '// Remember the real rate before changing it, so the teardown can put it',
    '// back exactly. Running the collection must never alter the desk\'s rates.',
    "const base = pm.collectionVariables.get('baseUrl');",
    "pm.sendRequest({ url: base + '/charter-rates?limit=20', method: 'GET' }, function (err, res) {",
    '    if (err || res.code !== 200) { return; }',
    f"    const row = res.json().data.find(function (r) {{ return r.category === '{CATEGORY}'; }});",
    "    pm.collectionVariables.set('savedCharterRate', JSON.stringify(row ? {",
    '        hourlyRate: row.hourlyRate, averageSpeedKnots: row.averageSpeedKnots,',
    '        typicalSeats: row.typicalSeats, minimumHours: row.minimumHours, notes: row.notes,',
    '    } : null));',
    '});',
]

# ...and puts it back.
RESTORE_RATE_SCRIPT = [
    "const saved = JSON.parse(pm.collectionVariables.get('savedCharterRate') || 'null');",
    '// A category that had no row gets every figure cleared — the same as no',
    '// rate on file. One that had a rate gets exactly its old figures back.',
    'const body = saved || { hourlyRate: null, averageSpeedKnots: null, typicalSeats: null, minimumHours: null, notes: null };',
    "pm.request.body.raw = JSON.stringify(body);",
]


def build(owner: Session, broker: Session, assistant: Session, anonymous: Session) -> dict:
    cap = {}

    # Save the real rate first — the builder obeys the same rule as the folder.
    rows = owner.request('GET', '/charter-rates?limit=20')[1]['data']
    before = next(r for r in rows if r['category'] == CATEGORY)
    saved = {k: before[k] for k in FIGURES}

    airports = owner.request('GET', '/airports?limit=100')[1]['data']
    located = [a for a in airports if a.get('latitude') is not None and a.get('longitude') is not None]
    origin, destination = located[0], located[1]

    set_payload = {'hourlyRate': 4500, 'averageSpeedKnots': 420, 'typicalSeats': 8, 'minimumHours': 1.5}
    estimate_payload = {'originAirportId': origin['id'], 'destinationAirportId': destination['id'],
                        'passengers': 6, 'roundTrip': True}
    try:
        cap['set'] = owner.request('PUT', f'/charter-rates/{CATEGORY}', set_payload)
        cap['list'] = owner.request('GET', '/charter-rates?page=1&limit=10')
        cap['list_400'] = owner.request('GET', '/charter-rates?search=jet')
        cap['list_401'] = anonymous.request('GET', '/charter-rates')
        cap['list_403'] = assistant.request('GET', '/charter-rates')

        cap['set_400'] = owner.request('PUT', f'/charter-rates/{CATEGORY}', {'hourlyRate': -5, 'averageSpeedKnots': 5000})
        cap['set_400_category'] = owner.request('PUT', '/charter-rates/midsize_jet', {'hourlyRate': 4500})
        cap['set_403'] = broker.request('PUT', f'/charter-rates/{CATEGORY}', set_payload)

        cap['estimate'] = owner.request('POST', '/charter-rates/estimate', estimate_payload)
        cap['estimate_400_same'] = owner.request('POST', '/charter-rates/estimate', {
            'originAirportId': origin['id'], 'destinationAirportId': origin['id']})
        cap['estimate_400_unknown'] = owner.request('POST', '/charter-rates/estimate', {
            'originAirportId': MISSING, 'destinationAirportId': destination['id']})
        cap['estimate_403'] = assistant.request('POST', '/charter-rates/estimate', estimate_payload)
    finally:
        cap['restore'] = owner.request('PUT', f'/charter-rates/{CATEGORY}', saved)
        assert cap['restore'][0] == 200, cap['restore']

    list_query = [
        {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
        {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10. There are seven categories.'},
    ]

    items = [
        {
            'name': '01 · Set a category\'s rates',
            'event': [script('prerequest', SAVE_RATE_SCRIPT), status_test(200, '200 OK')],
            'request': {
                'method': 'PUT', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': SET_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url(f'/charter-rates/{CATEGORY}'),
                'description': (
                    'Creates the category\'s row the first time, updates it after. `null` clears a figure.\n\n'
                    f'**`:category`** — case-sensitive: {CATEGORIES}.\n\n'
                    'Only VIEW_FINANCIALS at **ALL** scope (administrator, senior broker) may change a '
                    'company-wide rate; a broker gets 403. Every change is audited with before and after.\n\n'
                    'The pre-request script saves the current rate and `04 · Put the rate back` restores it — '
                    'running the collection never changes the desk\'s real rates.'),
            },
            'response': [
                example('200 · Rates set', 'PUT', f'/charter-rates/{CATEGORY}', *cap['set'], req_body=set_payload),
                example('400 · Out of bounds', 'PUT', f'/charter-rates/{CATEGORY}', *cap['set_400'],
                        req_body={'hourlyRate': -5, 'averageSpeedKnots': 5000}),
                example('400 · Category is case-sensitive', 'PUT', '/charter-rates/midsize_jet',
                        *cap['set_400_category'], req_body={'hourlyRate': 4500}),
                example('403 · A broker cannot set company-wide rates', 'PUT', f'/charter-rates/{CATEGORY}',
                        *cap['set_403'], req_body=set_payload),
            ],
        },
        {
            'name': '02 · List the rate table',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/charter-rates', list_query),
                'description': (
                    'One row per aircraft category — **including categories with no rate on file**, whose '
                    'figures are all `null`. Hiding them would hide that they cannot be estimated.\n\n'
                    'Needs VIEW_FINANCIALS: an hourly rate is what the desk expects to pay. No search, and '
                    'the query is strict — an unknown parameter is a 400, not silently ignored.'),
            },
            'response': [
                example('200 · Every category', 'GET', '/charter-rates?page=1&limit=10', *cap['list']),
                example('400 · Unknown parameter', 'GET', '/charter-rates?search=jet', *cap['list_400']),
                example('401 · Not signed in', 'GET', '/charter-rates', *cap['list_401']),
                example('403 · Assistant cannot see rates', 'GET', '/charter-rates', *cap['list_403']),
            ],
        },
        {
            'name': '03 · Estimate a route',
            'event': [script('prerequest', AIRPORTS_SCRIPT), status_test(200, '200 OK')],
            'request': {
                'method': 'POST', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': ESTIMATE_BODY, 'options': {'raw': {'language': 'json'}}},
                'url': url('/charter-rates/estimate'),
                'description': (
                    'Client adjustment #6. Great-circle distance between the two airports, then for every '
                    'category: flight hours at its average speed, billed hours (never below its minimum) and '
                    'estimated operator cost — doubled for a round trip. **A category without a rate returns '
                    '`estimate: null`, never $0.** `fitsParty` compares `passengers` to typical seats; null '
                    'when either is unknown. Winds, routing and positioning are not modelled. Nothing saved.\n\n'
                    'The pre-request script picks two airports that have coordinates, so the folder runs alone.'),
            },
            'response': [
                example('200 · Estimated', 'POST', '/charter-rates/estimate', *cap['estimate'], req_body=estimate_payload),
                example('400 · Same airport twice', 'POST', '/charter-rates/estimate', *cap['estimate_400_same'],
                        req_body={'originAirportId': origin['id'], 'destinationAirportId': origin['id']}),
                example('400 · Unknown airport', 'POST', '/charter-rates/estimate', *cap['estimate_400_unknown'],
                        req_body={'originAirportId': MISSING, 'destinationAirportId': destination['id']}),
                example('403 · Assistant cannot estimate', 'POST', '/charter-rates/estimate', *cap['estimate_403'],
                        req_body=estimate_payload),
            ],
        },
        {
            'name': '04 · Put the rate back',
            'event': [script('prerequest', RESTORE_RATE_SCRIPT), status_test(200, 'the real rate is back')],
            'request': {
                'method': 'PUT', 'header': WRITE_HEADERS,
                'body': {'mode': 'raw', 'raw': '{}', 'options': {'raw': {'language': 'json'}}},
                'url': url(f'/charter-rates/{CATEGORY}'),
                'description': (
                    'Teardown. Writes back exactly the figures `01` saved before changing them — or clears them '
                    'if the category had no rate. The body is set by the pre-request script.'),
            },
            'response': [
                example('200 · Restored', 'PUT', f'/charter-rates/{CATEGORY}', *cap['restore'], req_body=saved),
            ],
        },
    ]

    return {
        'name': '14 · Charter Rates',
        'description': (
            'The instant quote calculator\'s data — client adjustment #6: *"put in size of plane, airports '
            'and such and it give is an estimate of what it could cost"*.\n\nThe rates are **the desk\'s '
            'own**, typed in through `01`; nothing is invented or AI-estimated (scope §18). The suggested '
            'client price at each markup is `10 · Quotes / 18 · Suggest a price`, fed the estimate as its '
            'operator cost.\n\nRuns alone: it signs itself in, finds its own airports, and restores the rate '
            'it changed.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@example.com')
    broker = Session('broker@example.com')
    assistant = Session('assistant@example.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text())
    folder = build(owner, broker, assistant, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)

    existing = {v['key'] for v in collection['variable']}
    for key in ('estimateOriginId', 'estimateDestinationId', 'savedCharterRate'):
        if key not in existing:
            collection['variable'].append({'key': key, 'value': '', 'type': 'string'})

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
