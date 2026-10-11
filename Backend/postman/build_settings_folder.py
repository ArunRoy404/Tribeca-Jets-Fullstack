#!/usr/bin/env python3
"""
Builds `30 · Settings`, capturing every example from a live API.

    POSTMAN_BASE=http://localhost:4100/api python3 postman/build_settings_folder.py
    cd postman && python3 rewrite_body_comments.py

Run against an API with `MAIL_DRIVER=log` and its own Redis (README): the
"require 2FA for administrators" example signs an administrator in, which
sends a code.

The settings are the company's real ones, so the folder **restores them
exactly**: the builder puts back every value it changed, and the Newman run
saves the whole set in `01` and sends it back in `05 · Teardown`.
"""

from __future__ import annotations

import json
import pathlib
import urllib.error
import urllib.request

from builder_common import BASE, FIXTURES, WRITE_HEADERS, Session, ensure_variables, example, script, url
from collection_order import place_folder
from session_setup import with_session

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
OWNER = 'admin@example.com'
BROKER = 'broker@example.com'
PHOTO = FIXTURES / 'sample-photo.png'
DOCUMENT = FIXTURES / 'sample-document.pdf'

SECTIONS_DOC = """One set of settings for the whole company (owner's decision, 7 Oct 2026) — never per user. One object per Settings screen:

| Section | Fields | Read by |
|---|---|---|
| `company` | `companyName`, `companyEmail`, `website`, `phone`, `address`, `clientServicesLabel`, `logoUrl`, `showContactBlock`, `logoOnDocuments`, `showBrokerContact` | The public branding (every sidebar, the sign-in page); documents when they are built |
| `defaults` | `defaultMarkupPercent`, `quoteValidityHours`, `defaultFetPercent`, `applyFetByDefault`, `followUpIntervalDays`, `defaultLeadStage`, `defaultQuoteTerms` | Quotes, Trips, Clients and Leads — each when its module is reviewed. **New records only.** |
| `security` | `idleTimeoutMinutes`, `idleWarningMinutes`, `showIdleWarning`, `requireAdminTwoFactor` | Auth, now: the idle limit, the warning (`/auth/me` → `session`) and sign-in |
| `notifications` | `emailNotifications`, `inAppNotifications`, `flightAlertsToBrokers`, `followUpReminders`, `paymentReminders`, `quoteExpiryReminders`, `quoteExpiryWarningHours`, `paymentReminderDays`, `followUpReminderMinutes` | Stored; read when the alerts are built |

**Fixed choices (case-sensitive numbers):** `quoteValidityHours` 12 · 24 · 48 · 72 · 168 — `followUpIntervalDays` 1 · 2 · 3 · 5 · 7 — `idleTimeoutMinutes` 5 · 10 · 15 · 30 · 60 — `idleWarningMinutes` 1 · 2 · 5 (less than the timeout) — `quoteExpiryWarningHours` 1 · 2 · 4 · 12 · 24 — `paymentReminderDays` 0 · 1 · 3 · 7 — `followUpReminderMinutes` 0 · 15 · 60 · 1440. `defaultLeadStage`: NEW | CONTACTED | QUALIFIED | PROPOSAL | QUOTED | WON | LOST.

**Permissions:** reading needs Settings · View, changing needs Settings · Edit — administrators by default; every other role is locked out (403). The branding and the logo are **public**."""


def fetch_bytes(path: str) -> tuple[int, int, dict]:
    """GET without a session; the logo's body is the image, so read it raw."""
    try:
        with urllib.request.urlopen(BASE + path) as response:
            return response.status, len(response.read()), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, 0, {}


def capture() -> dict:
    owner, broker, anonymous = Session(OWNER), Session(BROKER), Session(None)
    cap: dict = {}

    status, before = owner.request('GET', '/settings')
    assert status == 200, before
    saved = before['data']
    original = {section: dict(saved[section]) for section in ('company', 'defaults', 'security', 'notifications')}

    cap['read'] = (status, before)
    cap['read_broker'] = broker.request('GET', '/settings')
    cap['read_anonymous'] = anonymous.request('GET', '/settings')

    probe_validity = 48 if saved['defaults']['quoteValidityHours'] != 48 else 72
    cap['patch_body'] = {'defaults': {'quoteValidityHours': probe_validity}}
    cap['patch'] = owner.request('PATCH', '/settings', cap['patch_body'])
    cap['patch_option'] = owner.request('PATCH', '/settings', {'defaults': {'quoteValidityHours': 36}})
    cap['patch_key'] = owner.request('PATCH', '/settings', {'defaults': {'quoteValidity': 48}})
    cap['patch_warning'] = owner.request('PATCH', '/settings', {'security': {'idleTimeoutMinutes': 5, 'idleWarningMinutes': 5}})
    cap['patch_broker'] = broker.request('PATCH', '/settings', cap['patch_body'])

    # A document is not a logo.
    _, document = owner.upload('/uploads/document', DOCUMENT, {'label': 'Not a logo'})
    cap['patch_logo_doc'] = owner.request('PATCH', '/settings', {'company': {'logoUrl': document['data']['url']}})
    owner.request('DELETE', f"/uploads/{document['data']['id']}")

    # Branding, with and without the contact block.
    cap['branding'] = anonymous.request('GET', '/settings/branding')
    owner.request('PATCH', '/settings', {'company': {'showContactBlock': not saved['company']['showContactBlock']}})
    cap['branding_toggled'] = anonymous.request('GET', '/settings/branding')
    contact_on = saved['company']['showContactBlock']

    # The logo: none, then one.
    owner.request('PATCH', '/settings', {'company': {'logoUrl': None}})
    cap['logo_none'] = anonymous.request('GET', '/settings/branding/logo')
    _, photo = owner.upload('/uploads/image', PHOTO, {'visibility': 'PUBLIC', 'label': 'Company logo'})
    cap['logo_body'] = {'company': {'logoUrl': photo['data']['url']}}
    cap['patch_logo'] = owner.request('PATCH', '/settings', cap['logo_body'])
    _, branding = anonymous.request('GET', '/settings/branding')
    cap['logo_path'] = branding['data']['logoUrl'].removeprefix('/api')
    cap['logo_fetch'] = fetch_bytes(cap['logo_path'])

    # Require 2FA for administrators, then sign the owner in.
    owner.request('PATCH', '/settings', {'security': {'requireAdminTwoFactor': True}})
    cap['admin_2fa'] = Session(None).request('POST', '/auth/login', {'email': OWNER, 'password': 'ChangeMe123!'})

    # Put back exactly what was there.
    status, restored = owner.request('PATCH', '/settings', original)
    assert status == 200, restored
    for section, values in original.items():
        assert restored['data'][section] == values, (section, restored['data'][section], values)
    cap['teardown'] = (status, restored)
    # The probe logo is not the company's; archive it like any other probe.
    if photo['data']['url'] != original['company']['logoUrl']:
        owner.request('DELETE', f"/uploads/{photo['data']['id']}")
    cap['original'] = original
    cap['contact_on'] = contact_on
    return cap


def build(cap: dict) -> dict:
    ok_label = 'branding with the contact block' if cap['contact_on'] else 'branding without the contact block'
    toggled_label = 'branding without the contact block' if cap['contact_on'] else 'branding with the contact block'
    return {
        'name': '30 · Settings',
        'description': SECTIONS_DOC,
        'item': [
            {
                'name': '01 · Read the settings',
                'event': [script('test', [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "const current = pm.response.json().data;",
                    "pm.test('one object per screen', () =>",
                    "  pm.expect(current).to.include.keys('company', 'defaults', 'security', 'notifications'));",
                    "// Saved whole, so 05 · Teardown can put every value back.",
                    "const { updatedAt, ...sections } = current;",
                    "pm.collectionVariables.set('settingsBefore', JSON.stringify(sections));",
                    "pm.collectionVariables.set('probeValidity', current.defaults.quoteValidityHours === 48 ? 72 : 48);",
                ])],
                'request': {
                    'method': 'GET', 'header': [], 'url': url('/settings'),
                    'description': 'The company\'s settings, one object per Settings screen, in the shape `PATCH` accepts. Needs Settings · View.',
                },
                'response': [
                    example('200 · The settings', 'GET', '/settings', *cap['read']),
                    example('403 · A broker (Settings is locked for the role)', 'GET', '/settings', *cap['read_broker']),
                    example('401 · Signed out', 'GET', '/settings', *cap['read_anonymous']),
                ],
            },
            {
                'name': '02 · Change a setting',
                'event': [script('test', [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "pm.test('the change is stored', () => pm.expect(pm.response.json().data.defaults.quoteValidityHours)",
                    "  .to.eql(Number(pm.collectionVariables.get('probeValidity'))));",
                ])],
                'request': {
                    'method': 'PATCH', 'header': WRITE_HEADERS, 'url': url('/settings'),
                    'body': {'mode': 'raw', 'raw': json.dumps({'defaults': {'quoteValidityHours': '{{probeValidity}}'}}, indent=2)
                             .replace('"{{probeValidity}}"', '{{probeValidity}}')},
                    'description': (
                        'Send one or more sections, and in each only the fields to change — a Settings screen saves '
                        'its own section. **Absent fields are left alone**; an emptied text field (`""`) clears it. '
                        'Every section is strict: an unknown key is a 400, not a save that quietly did nothing.\n\n'
                        'A default seeds the **next** record; quotes and clients that already exist never change.\n\n'
                        'Audited as `settings.updated` with each value that moved (`{ field: { from, to } }`). '
                        'Needs Settings · Edit.'
                    ),
                },
                'response': [
                    example('200 · Saved', 'PATCH', '/settings', *cap['patch'], req_body=cap['patch_body']),
                    example('200 · A logo set (an image upload URL)', 'PATCH', '/settings', *cap['patch_logo'],
                            req_body=cap['logo_body']),
                    example('400 · Not one of the offered values', 'PATCH', '/settings', *cap['patch_option'],
                            req_body={'defaults': {'quoteValidityHours': 36}}),
                    example('400 · An unknown field', 'PATCH', '/settings', *cap['patch_key'],
                            req_body={'defaults': {'quoteValidity': 48}}),
                    example('400 · The warning must come before the timeout', 'PATCH', '/settings',
                            *cap['patch_warning'], req_body={'security': {'idleTimeoutMinutes': 5, 'idleWarningMinutes': 5}}),
                    example('400 · A document is not a logo', 'PATCH', '/settings', *cap['patch_logo_doc'],
                            req_body={'company': {'logoUrl': '/api/uploads/<a document>'}}),
                    example('403 · A broker', 'PATCH', '/settings', *cap['patch_broker'], req_body=cap['patch_body']),
                    example('200 · Then, with "require 2FA for administrators" on, the owner signing in is asked for a code',
                            'POST', '/auth/login', *cap['admin_2fa'],
                            req_body={'email': OWNER, 'password': '{{password}}'}),
                ],
            },
            {
                'name': '03 · Company branding (public)',
                'event': [script('test', [
                    "pm.test('200 OK', () => pm.response.to.have.status(200));",
                    "pm.test('carries the company name', () => pm.expect(pm.response.json().data.companyName).to.be.a('string'));",
                ])],
                'request': {
                    'method': 'GET', 'header': [], 'url': url('/settings/branding'),
                    'description': (
                        '**Public — no session.** The sign-in page and every sidebar read it.\n\n'
                        '- `companyName` and `logoUrl` always. `logoUrl` is the public logo route below, versioned '
                        'by its upload (`?v=`), so a new logo is a new address — never the upload URL, which needs '
                        'a session.\n'
                        '- `contact` (email, website, phone, address, client-services label) **only while '
                        '`showContactBlock` is on**; otherwise `null`.\n'
                        '- `documents`: the three client-facing document switches.\n\n'
                        'Nothing else — no defaults, security policy or notification settings.'
                    ),
                },
                'response': [
                    example(f'200 · The {ok_label}', 'GET', '/settings/branding', *cap['branding']),
                    example(f'200 · The {toggled_label}', 'GET', '/settings/branding', *cap['branding_toggled']),
                ],
            },
            {
                'name': '04 · Company logo (public)',
                'event': [script('test', [
                    "// 200 with the image when a logo is set, 404 when none is.",
                    "pm.test('200 or 404', () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));",
                    "if (pm.response.code === 200) {",
                    "  pm.test('an image', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('image/'));",
                    "}",
                ])],
                'request': {
                    'method': 'GET', 'header': [], 'url': url('/settings/branding/logo'),
                    'description': (
                        '**Public — no session.** The logo image itself, for `<img src>` on the sign-in page and in '
                        'every sidebar. Only the one upload the settings name is ever served here, so this is not a '
                        'way to read any other file. Cached for an hour; a new logo has a new `?v=` address. '
                        '404 when no logo is set — the app then shows its built-in mark.'
                    ),
                },
                'response': [
                    example('200 · The logo', 'GET', cap['logo_path'], cap['logo_fetch'][0],
                            {'_': f"The body is the image itself — {cap['logo_fetch'][1]} bytes of "
                                  f"{cap['logo_fetch'][2].get('Content-Type', 'image')}."}, preview='text'),
                    example('404 · No logo set', 'GET', '/settings/branding/logo', *cap['logo_none']),
                ],
            },
            {
                'name': '05 · Teardown — put the settings back',
                'event': [
                    script('prerequest', [
                        "// Every value as 01 read it, so the run changes nothing the desk set.",
                        "pm.variables.set('settingsBody', pm.collectionVariables.get('settingsBefore'));",
                    ]),
                    script('test', [
                        "pm.test('restored', () => pm.response.to.have.status(200));",
                        "const before = JSON.parse(pm.collectionVariables.get('settingsBefore'));",
                        "pm.test('exactly as before', () => pm.expect(pm.response.json().data.defaults).to.eql(before.defaults));",
                    ]),
                ],
                'request': {
                    'method': 'PATCH', 'header': WRITE_HEADERS, 'url': url('/settings'),
                    'body': {'mode': 'raw', 'raw': '{{settingsBody}}'},
                    'description': 'Sends back every value `01` read. The run is a demonstration; it must not change a setting the desk chose.',
                },
                'response': [
                    example('200 · Restored', 'PATCH', '/settings', *cap['teardown'], req_body=cap['original']),
                ],
            },
        ],
    }


def main() -> None:
    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    ensure_variables(collection, {'settingsBefore': '', 'probeValidity': '48'})
    folder = with_session(build(capture()), 'owner')
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(r['response']) for r in folder['item'])} examples")


if __name__ == '__main__':
    main()
