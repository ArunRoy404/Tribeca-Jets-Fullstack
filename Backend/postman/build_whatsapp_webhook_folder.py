#!/usr/bin/env python3
"""Builds `31 · WhatsApp Webhook` from the isolated 4100 test API (see README)."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

from builder_common import BASE, Session, ensure_variables, example, script, url
from collection_order import place_folder
from session_setup import session_script
from whatsapp_postman import (
    APP_SECRET, CLEAR_SETTINGS, COLLECTION, FAKE_SETTINGS, OWNER, TEST_BASE, VERIFY_TOKEN,
    capture_prepared_view, capture_settings_patch, settings_patch_request, teardown_request,
)

ROUTE = '/webhooks/whatsapp'
UNKNOWN_PHONE = '15550000999'
SIGNATURE_HEADER = 'X-Hub-Signature-256'
PROBE_TEXT = 'Webhook probe'

FOLDER_DESCRIPTION = """Meta calls the webhook routes without a session.
GET verifies the webhook with the test API's verify token.
POST uses `X-Hub-Signature-256`, the app secret's HMAC-SHA256 over the raw body.
Both routes return 404 while the Meta settings are incomplete.
Setup saves fake Meta settings as the seeded Super Admin, and teardown clears them.
Prepare the test database and use port 4100 as described in `postman/README.md`."""

ENVELOPE_DESCRIPTION = """The raw JSON has no inline comments because Postman may strip them. The HMAC
must cover the exact bytes sent after variable resolution.

- `object` must be `whatsapp_business_account` for the API to read events.
- `entry[]` holds account batches. `entry[].changes[]` holds changes within each batch.
- `entry[].changes[].value` holds the events. The API reads `messages[]` for
  incoming messages and `statuses[]` for delivery updates. Either may be absent."""

MESSAGE_DESCRIPTION = """Sends one text message from the unknown number `15550000999`. The API counts
the message. The prepared copy has the assistant switched off and no linked
Super Admin phone, so the message triggers no reply. Meta uses the HTTP 200 acknowledgement.

The fields of `messages[]` are:

- `id` is Meta's message ID, used to detect redelivery for messages that pass
  the sender gate. A fresh test ID is generated for each run.
- `from` is the sender's phone number. The API keeps only its digits.
- `timestamp` is the send time in Unix seconds as a string. The API uses it to
  reject stale messages that pass the sender gate.
- `type` is `text` for this probe. The API reads `text.body` as the message
  content when `type` is `text`."""

RECEIPT_DESCRIPTION = """Sends a delivery receipt with no `messages[]`. Meta uses the HTTP 200
acknowledgement. The API counts zero messages and does not reply to the receipt.

The fields of `statuses[]` are:

- `id` is the ID of the outgoing message. This receipt uses a made-up ID
  generated for each run.
- `status` is `delivered` for this probe. Only `failed` receipts are logged by
  the API, using the message ID and numeric `errors[].code` values if present.
- `timestamp` is the delivery time in Unix seconds as a string. The API ignores it.
- `recipient_id` is the delivery recipient's phone number. The API ignores it."""

SIGN_POST = [
    # `CryptoJS` is already a sandbox global; redeclaring it is a SyntaxError.
    "const hmac = require('crypto-js');",
    "pm.variables.set('webhookMessageId', 'wamid.postman.' + pm.variables.replaceIn('{{$guid}}'));",
    "pm.variables.set('webhookTimestamp', String(Math.floor(Date.now() / 1000)));",
    'const rawBody = pm.variables.replaceIn(pm.request.body.raw);',
    "const secret = pm.variables.get('whatsappAppSecret');",
    "const digest = hmac.HmacSHA256(rawBody, secret).toString(hmac.enc.Hex);",
    "pm.request.headers.upsert({ key: 'X-Hub-Signature-256', value: 'sha256=' + digest });",
]


def uncaptured_errors(limit: int) -> str:
    return (
        '404 while the Meta settings are incomplete. Setup saves fake settings, so no 404 example is captured.\n'
        f'429 when the request rate exceeds {limit} per minute times the test multiplier. '
        'A run cannot reach that limit, so no 429 example is captured.'
    )


def verify_query(mode: str, token: str, challenge: str) -> list[dict]:
    return [
        {'key': 'hub.mode', 'value': mode,
         'description': 'Must be exactly `subscribe` (case-sensitive) for verification. Maximum 40 characters. No default.'},
        {'key': 'hub.verify_token', 'value': token,
         'description': 'Must exactly match the configured verify token. 1–200 characters for verification. No default. '
                        'Use the test API’s value, never the production secret.'},
        {'key': 'hub.challenge', 'value': challenge,
         'description': 'Opaque challenge echoed verbatim. 1–200 characters for verification. No default.'},
    ]


def message_payload(message_id: str, timestamp: str) -> dict:
    return envelope('messages', {
        'id': message_id,
        'from': UNKNOWN_PHONE,
        'timestamp': timestamp,
        'type': 'text',
        'text': {'body': PROBE_TEXT},
    })


def receipt_payload(message_id: str, timestamp: str) -> dict:
    return envelope('statuses', {
        'id': message_id,
        'status': 'delivered',
        'timestamp': timestamp,
        'recipient_id': UNKNOWN_PHONE,
    })


def envelope(key: str, event: dict) -> dict:
    return {
        'object': 'whatsapp_business_account',
        'entry': [{'changes': [{'value': {key: [event]}}]}],
    }


def raw_json(raw: str) -> dict:
    return {'mode': 'raw', 'raw': raw, 'options': {'raw': {'language': 'json'}}}


def sign(raw: str, secret: str = APP_SECRET) -> str:
    return 'sha256=' + hmac.new(secret.encode('utf-8'), raw.encode('utf-8'), hashlib.sha256).hexdigest()


def capture_example(name: str, method: str, *, query: list[dict] | None = None,
                    raw: str | None = None, signature: str | None = None) -> dict:
    """Capture without cookies, preserving the exact request and response bodies."""
    path = ROUTE
    if query:
        path += '?' + urllib.parse.urlencode([(param['key'], param['value']) for param in query])

    headers = {}
    if raw is not None:
        headers['Content-Type'] = 'application/json'
    if signature is not None:
        headers[SIGNATURE_HEADER] = signature

    request = urllib.request.Request(
        BASE + path, data=raw.encode('utf-8') if raw is not None else None,
        headers=headers, method=method,
    )
    try:
        response = urllib.request.urlopen(request, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.code
        content_type = response.headers.get('Content-Type', '')
        response_body = response.read().decode('utf-8')

    preview = 'text' if method == 'GET' and status == 200 else 'json'
    saved = example(name, method, path, status, response_body, preview=preview)
    saved['body'] = response_body
    saved['header'] = [{'key': 'Content-Type', 'value': content_type}] if content_type else []

    original = saved['originalRequest']
    original['url'] = url(ROUTE, query)
    original['header'] = [{'key': key, 'value': value} for key, value in headers.items()]
    if raw is not None:
        original['body'] = raw_json(raw)
    return saved


def verify_request() -> dict:
    challenge = uuid.uuid4().hex
    echoed = capture_example('200 · Challenge echoed', 'GET',
                             query=verify_query('subscribe', VERIFY_TOKEN, challenge))
    if (echoed['body'] != challenge
            or not any(header['value'].startswith('text/plain') for header in echoed['header'])):
        raise SystemExit('GET verification did not echo the exact challenge as text/plain')

    return {
        'name': '01 · Verify the webhook',
        'event': [
            script('prerequest', ["pm.variables.set('webhookChallenge', pm.variables.replaceIn('{{$guid}}'));"]),
            script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('The response is plain text', () =>",
                "  pm.expect(pm.response.headers.get('Content-Type')).to.include('text/plain'));",
                "pm.test('The body is the challenge sent', () =>",
                "  pm.expect(pm.response.text()).to.equal(pm.variables.get('webhookChallenge')));",
            ]),
        ],
        'request': {
            'method': 'GET',
            'header': [],
            'url': url(ROUTE, verify_query('subscribe', '{{whatsappVerifyToken}}', '{{webhookChallenge}}')),
            'description': (
                'Meta verifies the callback URL with this public GET. All three query fields must be '
                'present for verification. A wrong token or mode returns 403. A field exceeding its '
                'length limit returns 400. A successful response is the bare challenge as plain text.\n\n'
                + uncaptured_errors(30)
            ),
        },
        'response': [
            echoed,
            capture_example('403 · Wrong verify token', 'GET',
                            query=verify_query('subscribe', 'postman-wrong-verify-token', challenge)),
            capture_example('403 · Mode is not subscribe', 'GET',
                            query=verify_query('unsubscribe', VERIFY_TOKEN, challenge)),
            capture_example('400 · Challenge too long', 'GET',
                            query=verify_query('subscribe', VERIFY_TOKEN, 'x' * 201)),
        ],
    }


def post_request(name: str, description: str, payload: dict, received: int, examples: list[dict]) -> dict:
    expected = {'success': True, 'data': {'received': received}}
    if json.loads(examples[0]['body']) != expected:
        raise SystemExit(f'{name} expected {expected}, got {examples[0]["body"]}')

    return {
        'name': name,
        'event': [
            script('prerequest', SIGN_POST),
            script('test', [
                "pm.test('200 OK', () => pm.response.to.have.status(200));",
                "pm.test('The response contains the expected message count', () =>",
                f"  pm.expect(pm.response.json()).to.deep.equal({json.dumps(expected)}));",
            ]),
        ],
        'request': {
            'method': 'POST',
            'header': [
                {'key': 'Content-Type', 'value': 'application/json'},
                {'key': SIGNATURE_HEADER, 'value': '',
                 'description': 'The pre-request script sets `sha256=` plus the hex HMAC-SHA256 of the resolved raw body.'},
            ],
            'url': url(ROUTE),
            'body': raw_json(json.dumps(payload, indent=2)),
            'description': '\n\n'.join((description, ENVELOPE_DESCRIPTION, uncaptured_errors(600))),
        },
        'response': examples,
    }


def incoming_request() -> dict:
    message_id = f'wamid.postman.{uuid.uuid4().hex}'
    raw = json.dumps(message_payload(message_id, str(int(time.time()))), indent=2)
    signature = sign(raw)
    return post_request(
        '02 · An incoming message', MESSAGE_DESCRIPTION,
        message_payload('{{webhookMessageId}}', '{{webhookTimestamp}}'), 1,
        [
            capture_example('200 · From an unknown number — dropped', 'POST', raw=raw, signature=signature),
            # Omit the signature header entirely for this example.
            capture_example('401 · Missing signature', 'POST', raw=raw),
            # Sign with another secret so the header is well formed but wrong.
            capture_example('401 · Wrong signature', 'POST', raw=raw,
                            signature=sign(raw, 'postman-wrong-app-secret')),
            # Change one character in the valid JSON and keep the original signature.
            capture_example('401 · Body changed after signing', 'POST',
                            raw=raw.replace(PROBE_TEXT, 'Webhook Probe', 1), signature=signature),
        ],
    )


def delivery_request() -> dict:
    message_id = f'wamid.postman.{uuid.uuid4().hex}'
    raw = json.dumps(receipt_payload(message_id, str(int(time.time()))), indent=2)
    return post_request(
        '03 · A delivery receipt', RECEIPT_DESCRIPTION,
        receipt_payload('{{webhookMessageId}}', '{{webhookTimestamp}}'), 0,
        [capture_example('200 · Status update, no messages', 'POST', raw=raw, signature=sign(raw))],
    )


def main() -> None:
    if BASE != TEST_BASE:
        raise SystemExit(f'Set POSTMAN_BASE={TEST_BASE} to capture on the isolated test API.')

    collection = json.loads(COLLECTION.read_text(encoding='utf-8'))
    defaults = {'whatsappAppSecret': APP_SECRET, 'whatsappVerifyToken': VERIFY_TOKEN}
    ensure_variables(collection, defaults)
    for variable in collection['variable']:
        if variable['key'] in defaults:
            variable['value'] = defaults[variable['key']]
            variable['description'] = 'The test API’s value — never the production secret.'

    owner = Session(OWNER)
    capture_prepared_view(owner)
    try:
        configured = capture_settings_patch(owner, '200 · Test settings saved', FAKE_SETTINGS)
        setup = settings_patch_request(
            '00 · Setup — test WhatsApp settings', FAKE_SETTINGS,
            'Saves the fake Meta settings on the prepared 4100 API. The webhook requests use '
            'the matching fake app secret and verify token.', [configured],
        )
        webhook_requests = [verify_request(), incoming_request(), delivery_request()]
    finally:
        cleared = capture_settings_patch(owner, '200 · Test settings cleared', CLEAR_SETTINGS)
    teardown = teardown_request(cleared)
    for request in (setup, teardown):
        request['event'].insert(0, session_script('owner'))

    folder = {
        'name': '31 · WhatsApp Webhook',
        'description': FOLDER_DESCRIPTION,
        'auth': {'type': 'noauth'},
        'item': [setup, *webhook_requests, teardown],
    }
    place_folder(collection, folder)
    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n', encoding='utf-8')
    print(f"wrote {folder['name']}: {len(folder['item'])} requests, "
          f"{sum(len(item['response']) for item in folder['item'])} examples")


if __name__ == '__main__':
    main()
