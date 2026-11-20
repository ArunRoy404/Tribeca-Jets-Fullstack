"""The settings fixtures and PATCH requests used by both WhatsApp folders."""

from __future__ import annotations

import json
import pathlib

from builder_common import PASSWORD, WRITE_HEADERS, Session, example, script, url

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')
TEST_BASE = 'http://localhost:4100/api'
OWNER = 'admin@example.com'
SETTINGS_ROUTE = '/settings/whatsapp'
APP_SECRET = 'postman-app-secret'
VERIFY_TOKEN = 'postman-verify-token'
GRAPH_VERSION = 'v25.0'

FAKE_SETTINGS = {
    'accessToken': 'postman-not-a-token',
    'phoneNumberId': '100000000000000',
    'appSecret': APP_SECRET,
    'verifyToken': VERIFY_TOKEN,
    'graphVersion': GRAPH_VERSION,
}
CLEAR_SETTINGS = dict.fromkeys(('openaiApiKey', 'accessToken', 'appSecret', 'verifyToken', 'phoneNumberId'))
SECRET_FIELDS = ('openaiApiKey', 'accessToken', 'appSecret', 'verifyToken')
EMPTY_SECRET = {'set': False, 'last4': None}
CLEARED_VIEW = {
    **dict.fromkeys(SECRET_FIELDS, EMPTY_SECRET),
    'phoneNumberId': None,
    'openaiModel': None,
    'graphVersion': GRAPH_VERSION,
    'linkedPhone': None,
}
SAVED_VIEW = {
    **CLEARED_VIEW,
    **{
        field: {'set': True, 'last4': FAKE_SETTINGS[field][-4:]}
        for field in SECRET_FIELDS if field in FAKE_SETTINGS
    },
    'phoneNumberId': FAKE_SETTINGS['phoneNumberId'],
}

FIELD_COMMENTS = {
    'currentPassword': 'Required and nonempty. Use the current Super Admin password.',
    'accessToken': 'Optional trimmed Meta access token, 1–4096 characters. Send null to clear.',
    'phoneNumberId': 'Optional trimmed Meta phone number ID, 1–40 digits. Send null to clear.',
    'appSecret': 'Optional trimmed Meta app secret, 1–4096 characters. Send null to clear.',
    'verifyToken': 'Optional trimmed webhook verify token, 1–200 characters. Send null to clear.',
    'graphVersion': 'Optional trimmed, case-sensitive Graph version in v<major>.<minor> format, up to 20 characters. Defaults to v25.0.',
    'openaiApiKey': 'Optional trimmed OpenAI API key, 1–4096 characters. Send null to clear.',
    'phone': 'Required number with country code. Up to 40 characters before normalization to 8–15 digits. A leading +, spaces, parentheses, periods and hyphens are accepted.',
    'code': 'Required string of exactly six digits after trimming. Keep leading zeroes.',
}


def documented_body(payload: dict) -> dict:
    lines = json.dumps(payload, indent=2).splitlines()
    width = max(map(len, lines))
    for index, field in enumerate(payload, start=1):
        lines[index] = f'{lines[index]:<{width}}  // {FIELD_COMMENTS[field]}'
    return {'mode': 'raw', 'raw': '\n'.join(lines), 'options': {'raw': {'language': 'json'}}}


def capture_settings_example(session: Session, label: str, method: str, path: str,
                             payload: dict | None = None, *, message: str | None = None) -> dict:
    status, response = session.request(method, path, payload)
    saved = example(label, method, path, status, response)
    if message is not None and response.get('message') != message:
        raise SystemExit(f'{label} expected {message!r}, got {response.get("message")!r}')
    if payload is not None:
        shown = dict(payload)
        if shown.get('currentPassword') == PASSWORD:
            shown['currentPassword'] = '{{password}}'
        saved['originalRequest']['body'] = documented_body(shown)
        saved['originalRequest']['header'] = WRITE_HEADERS
    return saved


def assert_view(saved: dict, expected: dict, hint: str) -> None:
    view = json.loads(saved['body'])['data']
    if any(field not in view or view[field] != value for field, value in expected.items()):
        raise SystemExit(hint)


def capture_prepared_view(owner: Session) -> dict:
    saved = capture_settings_example(owner, '200 · Nothing set yet', 'GET', SETTINGS_ROUTE)
    assert_view(saved, {**CLEARED_VIEW, 'encryptionReady': True},
                'Expected prepared WhatsApp settings and a configured encryption key on the 4100 API. See README.')
    return saved


def capture_settings_patch(owner: Session, label: str, changes: dict) -> dict:
    saved = capture_settings_example(owner, label, 'PATCH', SETTINGS_ROUTE,
                                     {'currentPassword': PASSWORD, **changes})
    expected = SAVED_VIEW if changes == FAKE_SETTINGS else CLEARED_VIEW
    assert_view(saved, expected, f'{label} did not return the expected masked WhatsApp settings.')
    return saved


def settings_patch_request(name: str, changes: dict, description: str, examples: list[dict]) -> dict:
    expected = SAVED_VIEW if changes == FAKE_SETTINGS else CLEARED_VIEW
    return {
        'name': name,
        'event': [script('test', [
            "pm.test('200 OK', () => pm.response.to.have.status(200));",
            "pm.test('The response shows the expected masked settings', () =>",
            f'  pm.expect(pm.response.json().data).to.deep.include({json.dumps(expected)}));',
        ])],
        'request': {
            'method': 'PATCH', 'url': url(SETTINGS_ROUTE), 'header': WRITE_HEADERS,
            'body': documented_body({'currentPassword': '{{password}}', **changes}),
            'description': description,
        },
        'response': examples,
    }


def teardown_request(saved: dict) -> dict:
    return settings_patch_request(
        'Teardown — clear the test WhatsApp settings', CLEAR_SETTINGS,
        'Clears all four secrets and the phone number ID. The prepared copy has no OpenAI model '
        'and uses Graph version `v25.0` throughout the run.', [saved],
    )
