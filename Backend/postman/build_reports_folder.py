#!/usr/bin/env python3
"""
Builds `29 · Reports` (#23), capturing every example from a live API.

    npm run db:deploy && npm run db:seed
    npm run start:dev
    python3 postman/build_reports_folder.py
    cd postman && python3 rewrite_body_comments.py

Every request in the folder is a read, so a Newman run writes nothing. The
*builder* writes, so the examples show real figures rather than a seeded
database's zeros: it books two probe trips on the seeded client Dana
Whitfield (one priced, one not), invoices the priced one and records half
of it as paid — then withdraws the payment and archives the invoice and both
trips before it saves anything, so a build leaves no debris behind.

No 403 examples yet: this folder was captured while role restrictions were
switched off (4–7 Oct 2026), when nobody could be refused. They are captured
when Reports is reviewed.
"""

from __future__ import annotations

import json
import pathlib
import urllib.error
import urllib.request

from builder_common import BASE, STATUS_TEXT, Session, copy_folder_login, example, status_test, url
from collection_order import place_folder

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

FROM, TO = '2026-10-01', '2026-10-31'
WINDOW = f'from={FROM}&to={TO}'
WINDOW_PARAMS = [
    {'key': 'from', 'value': FROM, 'description': 'required · YYYY-MM-DD, the first day included.'},
    {'key': 'to', 'value': TO, 'description': 'required · YYYY-MM-DD, the last day included. On or after `from`; '
     'the window spans at most 3660 days.'},
]
PAGE_PARAMS = [
    {'key': 'page', 'value': '1', 'description': 'optional · integer ≥ 1. Default 1.'},
    {'key': 'limit', 'value': '10', 'description': 'optional · integer 1-100. Default 10.'},
]
BY_DEPARTURE = ('Booked and flown trips (BOOKED, CONFIRMED, IN_FLIGHT, COMPLETED) count by the day they depart; '
                'an unpriced trip is counted but adds no revenue, and profit covers only trips whose operator '
                'cost is known.')


def first_id(session: Session, path: str, label: str) -> str:
    status, body = session.request('GET', path)
    rows = (body or {}).get('data') or []
    if status != 200 or not rows:
        raise SystemExit(f'could not find {label} via {path}: {status} {body}')
    return rows[0]['id']


def ok(result, what: str, expected: int):
    status, body = result
    if status != expected:
        raise SystemExit(f'{what}: expected {expected}, got {status} {json.dumps(body)[:300]}')
    return body


def seed_probe(owner: Session) -> dict:
    """Two trips in the window, an invoice on one, half of it paid. Archived again by `clear_probe`."""
    client = first_id(owner, '/clients?search=Whitfield&limit=1', 'the seeded client Dana Whitfield')
    kjfk = first_id(owner, '/airports?search=KJFK&limit=1', 'KJFK')
    egll = first_id(owner, '/airports?search=EGLL&limit=1', 'EGLL')

    priced = ok(owner.request('POST', '/trips', {
        'clientId': client, 'status': 'BOOKED', 'basePrice': 42000, 'operatorCost': 33500,
        'legs': [{'originAirportId': kjfk, 'destinationAirportId': egll, 'departureDate': '2026-10-10'}],
    }), 'book the priced probe trip', 201)['data']
    unpriced = ok(owner.request('POST', '/trips', {
        'clientId': client, 'status': 'BOOKED',
        'legs': [{'originAirportId': egll, 'destinationAirportId': kjfk, 'departureDate': '2026-10-20'}],
    }), 'book the unpriced probe trip', 201)['data']
    invoice = ok(owner.request('POST', '/receivables', {
        'tripId': priced['id'], 'amount': 42000, 'fetAmount': 3150, 'status': 'SENT', 'dueDate': '2026-10-08',
    }), 'raise the probe invoice', 201)['data']
    paid = ok(owner.request('POST', f"/receivables/{invoice['id']}/payments", {
        'amount': 22575, 'paidAt': '2026-10-05', 'method': 'WIRE_TRANSFER', 'reference': 'POSTMAN-PROBE',
    }), 'record the probe payment', 201)['data']
    payment = next(p for p in paid['payments'] if p.get('reference') == 'POSTMAN-PROBE')
    return {'trips': [priced['id'], unpriced['id']], 'invoice': invoice['id'], 'payment': payment['id']}


def clear_probe(owner: Session, probe: dict) -> None:
    """Withdraws the payment and archives the invoice and both trips — there is no hard delete."""
    ok(owner.request('DELETE', f"/receivables/{probe['invoice']}/payments/{probe['payment']}"),
       'withdraw the probe payment', 200)
    ok(owner.request('DELETE', f"/receivables/{probe['invoice']}"), 'archive the probe invoice', 204)
    for trip in probe['trips']:
        ok(owner.request('DELETE', f'/trips/{trip}'), 'archive a probe trip', 204)


def download(session: Session, path: str):
    """A file route: the status, its headers, and the body as text when it is text."""
    req = urllib.request.Request(BASE + path, method='GET')
    try:
        with session.opener.open(req) as response:
            raw = response.read()
            headers = {k: v for k, v in response.headers.items()
                       if k.lower() in ('content-type', 'content-disposition', 'x-content-type-options')}
            ctype = headers.get('Content-Type', '')
            return response.status, headers, (raw.decode('utf-8') if ctype.startswith('text/') else None)
    except urllib.error.HTTPError as error:
        return error.code, {}, error.read().decode()


def file_example(name: str, path: str, status: int, headers: dict, text: str | None, note: str) -> dict:
    """A file example: the real headers, the real CSV, or a note for a binary workbook."""
    if not name.startswith(str(status)):
        raise SystemExit(f"example '{name}' promises {name[:3]} but the API answered {status} for {path}")
    return {
        'name': name,
        'originalRequest': {'method': 'GET', 'header': [],
                            'url': {'raw': '{{baseUrl}}' + path, 'host': ['{{baseUrl}}'],
                                    'path': [p for p in path.split('?')[0].lstrip('/').split('/') if p]}},
        'status': STATUS_TEXT[status], 'code': status,
        '_postman_previewlanguage': 'text',
        'header': [{'key': k, 'value': v} for k, v in headers.items()],
        'cookie': [], 'body': text if text is not None else note,
    }


def build(owner: Session, anonymous: Session):
    cap = {}
    summary = f'/reports/summary?{WINDOW}'
    series_month = '/reports/series?bucket=MONTH&on=2026-10-31'
    series_week = '/reports/series?bucket=WEEK&on=2026-10-31'
    brokers = f'/reports/brokers?{WINDOW}'
    clients = f'/reports/clients?{WINDOW}'
    routes = f'/reports/routes?{WINDOW}'
    export_csv = f'/reports/export?{WINDOW}&format=CSV'
    export_xlsx = '/reports/export?format=XLSX'

    probe = seed_probe(owner)
    try:
        cap['summary'] = owner.request('GET', summary)
        cap['summary_400_order'] = owner.request('GET', '/reports/summary?from=2026-10-31&to=2026-10-01')
        cap['summary_400_param'] = owner.request('GET', f'/reports/summary?{WINDOW}&search=Whitfield')
        cap['summary_400_missing'] = owner.request('GET', '/reports/summary?from=2026-10-01')
        cap['summary_401'] = anonymous.request('GET', summary)

        cap['series_month'] = owner.request('GET', series_month)
        cap['series_week'] = owner.request('GET', series_week)
        cap['series_400'] = owner.request('GET', '/reports/series?bucket=QUARTER')

        cap['brokers'] = owner.request('GET', brokers)
        cap['brokers_400'] = owner.request('GET', f'/reports/brokers?{WINDOW}&sortBy=revenue')
        cap['clients'] = owner.request('GET', clients)
        cap['clients_400'] = owner.request('GET', f'/reports/clients?{WINDOW}&limit=0')
        cap['routes'] = owner.request('GET', routes)
        cap['routes_401'] = anonymous.request('GET', routes)

        cap['csv'] = download(owner, export_csv)
        cap['xlsx'] = download(owner, export_xlsx)
        cap['export_400_half'] = owner.request('GET', '/reports/export?from=2026-10-01&format=CSV')
        cap['export_400_pdf'] = owner.request('GET', f'/reports/export?{WINDOW}&format=PDF')
        cap['export_401'] = anonymous.request('GET', export_csv)
    finally:
        clear_probe(owner, probe)

    items = [
        {
            'name': '01 · Summary',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/reports/summary', WINDOW_PARAMS),
                'description': (
                    f'The tiles and the financial summary. {BY_DEPARTURE} `collected` is cash and the FET inside '
                    'it by payment date — each payment carries its invoice\'s share of FET, so a half-paid invoice '
                    'has collected half its tax. `outstanding` is receivables and payables as they stand today. '
                    'Averages and margin are null with nothing to divide. `operations` counts trips for the export '
                    'dialog. Any other query parameter is a 400.'),
            },
            'response': [
                example('200 · October — one priced trip, one not, half the invoice paid', 'GET', summary,
                        *cap['summary']),
                example('400 · The window ends before it starts', 'GET',
                        '/reports/summary?from=2026-10-31&to=2026-10-01', *cap['summary_400_order']),
                example('400 · A parameter the endpoint does not take', 'GET',
                        f'/reports/summary?{WINDOW}&search=Whitfield', *cap['summary_400_param']),
                example('400 · No last day', 'GET', '/reports/summary?from=2026-10-01', *cap['summary_400_missing']),
                example('401 · Not signed in', 'GET', summary, *cap['summary_401']),
            ],
        },
        {
            'name': '02 · Revenue, profit and trips over time',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/reports/series', [
                    {'key': 'bucket', 'value': 'MONTH', 'description': 'optional · WEEK | MONTH | YEAR. Default MONTH. '
                     'WEEK: the twelve Monday-start weeks ending with the one containing `on`. MONTH: the twelve '
                     'months of its year. YEAR: the five years ending with its year.'},
                    {'key': 'on', 'value': '2026-10-31', 'description': 'optional · YYYY-MM-DD, the chart\'s anchor — '
                     'the report\'s last day. Default today in UTC.'},
                ]),
                'description': f'One point per bucket, each with its `start` day. {BY_DEPARTURE}',
            },
            'response': [
                example('200 · Months of 2026', 'GET', series_month, *cap['series_month']),
                example('200 · Twelve weeks to the end of October', 'GET', series_week, *cap['series_week']),
                example('400 · Unknown bucket', 'GET', '/reports/series?bucket=QUARTER', *cap['series_400']),
            ],
        },
        {
            'name': '03 · Broker performance',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/reports/brokers', WINDOW_PARAMS + PAGE_PARAMS),
                'description': (
                    f'Revenue, profit, margin and trips per assigned broker, largest revenue first; ties break on '
                    f'trip count, then the broker. `broker` is null for trips nobody is assigned. {BY_DEPARTURE} '
                    'Page and limit only — no search, no sort.'),
            },
            'response': [
                example('200 · October', 'GET', brokers, *cap['brokers']),
                example('400 · Sorting is not offered', 'GET', f'/reports/brokers?{WINDOW}&sortBy=revenue',
                        *cap['brokers_400']),
            ],
        },
        {
            'name': '04 · Top clients',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/reports/clients', WINDOW_PARAMS + PAGE_PARAMS),
                'description': f'Revenue, profit, margin and trips per client, largest revenue first. {BY_DEPARTURE}',
            },
            'response': [
                example('200 · October', 'GET', clients, *cap['clients']),
                example('400 · Limit below 1', 'GET', f'/reports/clients?{WINDOW}&limit=0', *cap['clients_400']),
            ],
        },
        {
            'name': '05 · Top routes',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [], 'url': url('/reports/routes', WINDOW_PARAMS + PAGE_PARAMS),
                'description': ('Trips and revenue per route — the first leg\'s origin and destination, so a round '
                                 f'trip counts as its outbound — largest revenue first. {BY_DEPARTURE}'),
            },
            'response': [
                example('200 · October', 'GET', routes, *cap['routes']),
                example('401 · Not signed in', 'GET', routes, *cap['routes_401']),
            ],
        },
        {
            'name': '06 · Export the window as CSV',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/reports/export', [
                    {'key': 'from', 'value': FROM, 'description': 'optional · YYYY-MM-DD. Send both `from` and `to`, '
                     'or neither for every operation on record.'},
                    {'key': 'to', 'value': TO, 'description': 'optional · YYYY-MM-DD, the last day included.'},
                    {'key': 'format', 'value': 'CSV', 'description': 'optional · CSV | XLSX. Default CSV. PDF is not '
                     'offered: nothing in the system generates one yet.'},
                ]),
                'description': (
                    'One row per trip, oldest departure first: reference, departure, status, client, broker, route, '
                    'aircraft, operator, revenue, FET, operator cost, profit and margin. Always an attachment. An '
                    'unknown figure is an empty cell, never zero; text a spreadsheet would run as a formula is '
                    'prefixed with an apostrophe.'),
            },
            'response': [
                file_example('200 · October as CSV', export_csv, *cap['csv'], note=''),
                example('400 · Half a window', 'GET', '/reports/export?from=2026-10-01&format=CSV',
                        *cap['export_400_half']),
                example('400 · PDF is not offered', 'GET', f'/reports/export?{WINDOW}&format=PDF',
                        *cap['export_400_pdf']),
                example('401 · Not signed in', 'GET', export_csv, *cap['export_401']),
            ],
        },
        {
            'name': '07 · Export everything as Excel',
            'event': [status_test(200, '200 OK')],
            'request': {
                'method': 'GET', 'header': [],
                'url': url('/reports/export', [
                    {'key': 'format', 'value': 'XLSX', 'description': 'optional · CSV | XLSX. Default CSV.'},
                ]),
                'description': 'Every operation on record as one worksheet — a bold, frozen header row, and money '
                               'kept as numbers so the sheet can sum it. Use Postman\'s "Send and Download".',
            },
            'response': [
                file_example('200 · Every operation as a workbook', export_xlsx, *cap['xlsx'],
                             note='(binary .xlsx workbook — one sheet, "Operations", same columns as the CSV)'),
            ],
        },
    ]

    return {
        'name': '29 · Reports',
        'description': (
            'Reports (#23): every figure is read through the module that owns it, nothing is stored. Revenue, '
            'profit, margin and trips by departure date; cash and FET collected by payment date; outstanding '
            'AR/AP as of today. Reads only — the examples were captured against probe trips the builder created '
            'and archived again. An assistant or referral agent is refused every route here with 403 (VIEW_FINANCIALS); those examples are captured when Reports is reviewed.'),
        'item': items,
    }


def main() -> None:
    owner = Session('admin@example.com')
    anonymous = Session(None)

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = build(owner, anonymous)
    copy_folder_login(collection, folder)
    place_folder(collection, folder)

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
