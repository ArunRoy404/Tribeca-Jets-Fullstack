#!/usr/bin/env python3
"""
Makes `04 · Set new password` re-runnable.

The request sent a fixed `newPassword` ("BrandNewPass9"), and the endpoint
refuses a password identical to the current one. So the flow worked exactly
once per database: the first run set the reset-demo account's password to
BrandNewPass9, and every run after that failed with

    "Your new password must be different from your current password"

A collection that only passes on a freshly seeded database is a collection that
reports a false failure every other time it is run, which is how a real failure
gets ignored.

The password is now generated per run. It still satisfies the policy — at least
ten characters with a lowercase letter, an uppercase letter and a digit — and it
is written back to the `newPassword` collection variable so the body, which
sends it twice, still sends one value.

The account is `reset-demo@tribecajets.com`, which exists for this flow and is
not used to sign in anywhere else, so its drifting password breaks nothing.
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

PREREQUEST = [
    '/*',
    ' * A fresh password for every run.',
    ' *',
    ' * The API refuses a new password identical to the current one, so a fixed',
    ' * literal here passed on a freshly seeded database and failed on every run',
    ' * after it — the first run had already set that password.',
    ' *',
    " * Policy: at least 10 characters, with a lowercase letter, an uppercase",
    ' * letter and a digit. The suffix keeps runs apart; the prefix keeps it',
    ' * readable in the console when someone is debugging this flow.',
    ' */',
    "pm.collectionVariables.set('newPassword', 'BrandNewPass' + Date.now().toString().slice(-8));",
]


def main() -> None:
    collection = json.loads(COLLECTION.read_text())

    target = None

    def walk(items):
        nonlocal target
        for item in items:
            if 'item' in item:
                walk(item['item'])
            elif item['name'] == '04 · Set new password':
                target = item

    walk(collection['item'])
    if target is None:
        raise SystemExit('could not find 04 · Set new password')

    events = [e for e in target.get('event', []) if e['listen'] != 'prerequest']
    events.insert(0, {
        'listen': 'prerequest',
        'script': {'type': 'text/javascript', 'exec': PREREQUEST},
    })
    target['event'] = events

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')
    print('password reset flow: now re-runnable')


if __name__ == '__main__':
    main()
