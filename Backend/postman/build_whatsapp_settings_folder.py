#!/usr/bin/env python3
"""Builds `32 · WhatsApp Settings` from the prepared 4100 test API (see README)."""

from __future__ import annotations

import json
import uuid

from build_users_folder import ADMIN_2FA, two_factor_session
from builder_common import BASE, PASSWORD, WRITE_HEADERS, Session, copy_folder_login, script, url
from collection_order import place_folder
from whatsapp_postman import (
    CLEAR_SETTINGS, CLEARED_VIEW, COLLECTION, FAKE_SETTINGS, OWNER, SAVED_VIEW, SETTINGS_ROUTE, TEST_BASE,
    VERIFY_TOKEN, assert_view, capture_prepared_view, capture_settings_example, capture_settings_patch, documented_body,
    settings_patch_request, teardown_request,
)

PHONE_ROUTE = SETTINGS_ROUTE + '/phone'
VERIFY_ROUTE = PHONE_ROUTE + '/verify'
REVEAL_ROUTE = SETTINGS_ROUTE + '/reveal'
ASSISTANT_ROUTE = SETTINGS_ROUTE + '/assistant'
LINKED_BROKER_PHONE = '15550000777'
WRONG_PASSWORD = 'postman-wrong-password'
WRONG_PASSWORD_MESSAGE = 'Your current password is incorrect'
NOT_SUPER_ADMIN = 'These settings belong to the Super Admin.'
META_INCOMPLETE = 'Finish the Meta settings first'
NO_LINK_SESSION = 'This verification session has expired. Please start again.'
PROBE_CODE = {'code': '000000'}
REVEAL_PROBE = {'field': 'verifyToken', 'currentPassword': PASSWORD}
REVEALED = {'field': 'verifyToken', 'value': VERIFY_TOKEN}
SWITCH_OFF = {'enabled': False}
SWITCH_ON = {'enabled': True, 'currentPassword': PASSWORD}
PASSWORD_NEEDED = 'currentPassword is required to switch on the assistant'

FOLDER_DESCRIPTION = """The Super Admin manages the WhatsApp assistant's credentials and links their own phone here.
Prepare the isolated 4100 database using `postman/README.md` before capture or Newman.
The run saves fake Meta settings, reveals the fake verify token, switches the assistant off,
and switches it off again and clears settings in teardown. The Admin 403 examples
come from a separate two-factor session during capture.

## Not in this folder: the connection tests

Both endpoints require the Super Admin session and CSRF header. Send a JSON object with only
the optional fields below. Omitted fields use the saved settings. The rate limit is 10 requests
per 15 minutes before the test multiplier. A connection test contacts its provider.

**`POST /settings/whatsapp/openai/test`**

- `apiKey` is an optional trimmed OpenAI API key of 1–4096 characters.
- `200` returns `{ ok: true, models: string[] }` in `data`, with the available chat model IDs.
- `400` means the key is missing or OpenAI refused it. `502` means the API could not reach
  OpenAI or could not use its response.

**`POST /settings/whatsapp/meta/test`**

- `accessToken` is an optional trimmed Meta access token of 1–4096 characters.
- `phoneNumberId` is an optional trimmed Meta phone number ID of 1–40 digits.
- `graphVersion` is an optional trimmed, case-sensitive Graph version up to 20 characters, in
  `v<major>.<minor>` format. The saved default is `v25.0`.
- `200` returns `{ ok: true, displayPhoneNumber, verifiedName }` in `data`, with both values
  returned by Meta as strings.
- `400` means required settings are missing, the token was refused, the ID was not found,
  or Meta refused the connection. `502` covers an unavailable or unusable Meta response,
  including an upstream rate limit.
"""


def read_request(examples: list[dict]) -> dict:
    return {
        'name': '01 · Read WhatsApp settings',
        'event': [script('test', [
            "pm.variables.set('whatsappPhoneProbeReady', 'no');",
            "pm.variables.set('whatsappRevealProbeReady', 'no');",
            "pm.test('200 OK', () => pm.response.to.have.status(200));",
            'if (pm.response.code === 200) {',
            '    const settingsView = pm.response.json().data;',
            f'    const expected = {json.dumps(CLEARED_VIEW)};',
            "    pm.test('The test database is prepared', () => {",
            '        pm.expect(settingsView).to.deep.include(expected);',
            '        pm.expect(settingsView.encryptionReady).to.equal(true);',
            "        pm.variables.set('whatsappPhoneProbeReady', 'yes');",
            '    });',
            '}',
        ])],
        'request': {
            'method': 'GET', 'header': [], 'url': url(SETTINGS_ROUTE),
            'description': 'Each secret is represented by `{ set, last4, masked }`. Unset secrets have '
                           '`last4: null` and `masked: null`. Short secrets have twelve mask bullets without a suffix. '
                           'The view also reports the assistant switch and the four setup checks.',
        },
        'response': examples,
    }


def phone_request(name: str, method: str, path: str, payload: dict, description: str,
                  examples: list[dict], status: int, expected: str | dict) -> dict:
    field = 'message' if isinstance(expected, str) else 'data'
    return {
        'name': name,
        'event': [script('test', [
            f"pm.test('{status} response', () => pm.response.to.have.status({status}));",
            "pm.test('The response has the expected result', () =>",
            f'  pm.expect(pm.response.json().{field}).to.deep.equal({json.dumps(expected)}));',
        ])],
        'request': {
            'method': method, 'header': WRITE_HEADERS, 'url': url(path),
            'body': documented_body(payload), 'description': description,
        },
        'response': examples,
    }


def send_code_request(owner: Session) -> dict:
    probe = f'15550001{uuid.uuid4().int % 1000:03d}'
    examples = [
        capture_settings_example(owner, '400 · Wrong password', 'POST', PHONE_ROUTE,
                                 {'phone': probe, 'currentPassword': WRONG_PASSWORD}, message=WRONG_PASSWORD_MESSAGE),
        capture_settings_example(owner, '409 · Number linked to another user', 'POST', PHONE_ROUTE,
                                 {'phone': LINKED_BROKER_PHONE, 'currentPassword': PASSWORD},
                                 message='This WhatsApp number is already linked to another user.'),
        capture_settings_example(owner, '400 · Finish the Meta settings first', 'POST', PHONE_ROUTE,
                                 {'phone': probe, 'currentPassword': PASSWORD}, message=META_INCOMPLETE),
    ]
    request = phone_request(
        '02 · Send a link code', 'POST', PHONE_ROUTE,
        {'phone': '{{whatsappProbePhone}}', 'currentPassword': '{{whatsappProbePassword}}'},
        'Sends a verification code through Meta after checking the current password, phone availability '
        'and Meta settings. A successful `200` sets the HTTP-only `tj_whatsapp_link` cookie and returns '
        '`data.expiresInSeconds` as an integer. `502` means WhatsApp did not accept the message. '
        'Sending successfully would message a phone, so the executable probe expects `400` with '
        'the Meta settings cleared.', examples, 400, META_INCOMPLETE,
    )
    request['event'].insert(0, script('prerequest', [
        "const probeSuffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');",
        "pm.variables.set('whatsappProbePhone', '15550001' + probeSuffix);",
        f"const ready = pm.variables.get('baseUrl') === {json.dumps(TEST_BASE)} &&",
        "    pm.variables.get('whatsappPhoneProbeReady') === 'yes';",
        "// A missing preparation check leaves the password empty, which the DTO rejects before sending.",
        "pm.variables.set('whatsappProbePassword', ready ? pm.collectionVariables.get('password') : '');",
    ]))
    return request


def switch_request(name: str, examples: list[dict]) -> dict:
    return {
        'name': name,
        'event': [script('test', [
            "pm.test('200 OK', () => pm.response.to.have.status(200));",
            "pm.test('The assistant is off', () => pm.expect(pm.response.json().data.assistantEnabled).to.equal(false));",
        ])],
        'request': {
            'method': 'PATCH', 'url': url(ASSISTANT_ROUTE), 'header': WRITE_HEADERS,
            'body': documented_body(SWITCH_OFF),
            'description': 'Send a boolean `enabled`. Switching on requires the current password and is allowed '
                           'before setup is complete. Switching off is immediate. An optional password on an off '
                           'request is accepted and does not trigger a password check. Returns the full settings view.',
        },
        'response': examples,
    }


def capture() -> list[dict]:
    owner = Session(OWNER)
    prepared = capture_prepared_view(owner)
    admin = two_factor_session(ADMIN_2FA)
    read = read_request([
        prepared,
        capture_settings_example(admin, '403 · Not the Super Admin', 'GET', SETTINGS_ROUTE, message=NOT_SUPER_ADMIN),
    ])
    send = send_code_request(owner)
    unset = capture_settings_example(owner, '400 · Not set', 'POST', REVEAL_ROUTE,
                                     REVEAL_PROBE, message='That secret is not set')
    save_errors = [
        capture_settings_example(owner, '400 · Wrong password', 'PATCH', SETTINGS_ROUTE,
                                 {'currentPassword': WRONG_PASSWORD, **FAKE_SETTINGS}, message=WRONG_PASSWORD_MESSAGE),
        capture_settings_example(owner, '400 · Invalid value', 'PATCH', SETTINGS_ROUTE,
                                 {'currentPassword': PASSWORD, 'phoneNumberId': 'not-digits'}),
        capture_settings_example(admin, '403 · Not the Super Admin', 'PATCH', SETTINGS_ROUTE,
                                 {'currentPassword': PASSWORD, **FAKE_SETTINGS}, message=NOT_SUPER_ADMIN),
    ]
    try:
        saved = capture_settings_patch(owner, '200 · Saved', FAKE_SETTINGS)
        save = settings_patch_request(
            '03 · Save WhatsApp settings', FAKE_SETTINGS,
            'Saves the supplied fields after checking the current password. Omitted settings retain their '
            'values. `openaiModel` is optional, trimmed and 1–100 characters when set. '
            '`openaiApiKey` is an optional trimmed key of 1–4096 characters. Both accept `null` to clear. '
            'This request sets only fake Meta values. The response masks all four secrets.', [saved, *save_errors],
            verified_flag='whatsappRevealProbeReady',
        )
        shown = capture_settings_example(owner, '200 · Shown', 'POST', REVEAL_ROUTE, REVEAL_PROBE)
        assert_view(shown, REVEALED, 'The reveal did not return the fake verify token.')
        reveal = phone_request(
            '04 · Reveal a secret', 'POST', REVEAL_ROUTE,
            {**REVEAL_PROBE, 'currentPassword': '{{whatsappRevealProbePassword}}'},
            'Re-checks the current password and returns one secret as `{ field, value }` with '
            '`Cache-Control: no-store`. The executable request reveals only the fake verify token. '
            'An unreadable secret returns 409.',
            [unset, shown,
             capture_settings_example(owner, '400 · Wrong password', 'POST', REVEAL_ROUTE,
                                      {**REVEAL_PROBE, 'currentPassword': WRONG_PASSWORD}, message=WRONG_PASSWORD_MESSAGE),
             capture_settings_example(admin, '403 · Not the Super Admin', 'POST', REVEAL_ROUTE,
                                      REVEAL_PROBE, message=NOT_SUPER_ADMIN)],
            200, REVEALED,
        )
        reveal['event'][0]['script']['exec'].append(
            "pm.test('Cache-Control is no-store', () => pm.expect(pm.response.headers.get('Cache-Control')).to.equal('no-store'));"
        )
        reveal['event'].insert(0, script('prerequest', [
            f"const revealReady = pm.variables.get('baseUrl') === {json.dumps(TEST_BASE)} &&",
            "    pm.variables.get('whatsappPhoneProbeReady') === 'yes' &&",
            "    pm.variables.get('whatsappRevealProbeReady') === 'yes';",
            "pm.variables.set('whatsappRevealProbePassword', revealReady ? pm.collectionVariables.get('password') : '');",
        ]))
        verify = phone_request(
            '05 · Verify the link code', 'POST', VERIFY_ROUTE, PROBE_CODE,
            'Checks the six-digit code against the `tj_whatsapp_link` cookie. '
            'A successful `200` clears the cookie and returns the linked `phone` and `verifiedAt` in `data`. '
            f'Without the cookie the API returns `400` with “{NO_LINK_SESSION}”',
            [capture_settings_example(owner, '400 · No code requested', 'POST', VERIFY_ROUTE,
                                      PROBE_CODE, message=NO_LINK_SESSION)], 400, NO_LINK_SESSION,
        )
        unlink_refused = capture_settings_example(owner, '400 · Wrong password', 'DELETE', PHONE_ROUTE,
                                                  {'currentPassword': WRONG_PASSWORD}, message=WRONG_PASSWORD_MESSAGE)
        unlinked = capture_settings_example(owner, '200 · Nothing to unlink', 'DELETE', PHONE_ROUTE,
                                            {'currentPassword': PASSWORD})
        unlink = phone_request(
            '06 · Unlink WhatsApp', 'DELETE', PHONE_ROUTE, {'currentPassword': '{{password}}'},
            'Checks the current password, clears the linked number and cookie, and consumes pending link codes. '
            'The response is `data.linkedPhone: null`, including when the Super Admin had no linked number.',
            [unlinked, unlink_refused], 200, {'linkedPhone': None},
        )
        switch_errors = [
            capture_settings_example(owner, '400 · Password needed to switch on', 'PATCH', ASSISTANT_ROUTE,
                                     {'enabled': True}, message=PASSWORD_NEEDED),
            capture_settings_example(owner, '400 · Wrong password', 'PATCH', ASSISTANT_ROUTE,
                                     {**SWITCH_ON, 'currentPassword': WRONG_PASSWORD}, message=WRONG_PASSWORD_MESSAGE),
        ]
        switched_on = capture_settings_example(owner, '200 · Switched on', 'PATCH', ASSISTANT_ROUTE, SWITCH_ON)
        assert_view(switched_on, {**SAVED_VIEW, 'assistantEnabled': True}, 'The assistant was not switched on.')
    finally:
        switched_off = capture_settings_example(owner, '200 · Switched off', 'PATCH', ASSISTANT_ROUTE, SWITCH_OFF)
        cleared = capture_settings_patch(owner, '200 · Test settings cleared', CLEAR_SETTINGS)

    assert_view(switched_off, SAVED_VIEW, 'The assistant was not switched off.')
    switch = switch_request('07 · Switch the assistant', [switched_on, *switch_errors, switched_off])
    teardown_switch = switch_request('Teardown — switch the assistant off', [switched_off])
    return [read, send, save, reveal, verify, unlink, switch, teardown_switch, teardown_request(cleared)]


def main() -> None:
    if BASE != TEST_BASE:
        raise SystemExit(f'Set POSTMAN_BASE={TEST_BASE} to capture on the isolated test API.')

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    folder = {'name': '32 · WhatsApp Settings', 'description': FOLDER_DESCRIPTION, 'item': capture()}
    copy_folder_login(collection, folder)
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(item['response']) for item in folder['item'])} examples")


if __name__ == '__main__':
    main()
