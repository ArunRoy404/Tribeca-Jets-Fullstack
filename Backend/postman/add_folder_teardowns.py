#!/usr/bin/env python3
"""
Gives `05 · Airports` and `06 · Operators` the teardown the other folders have.

Both folders create a row and end by *restoring* it, so every Newman run left
one more behind. Thirty-seven live "Solairus Aviation" operators had piled up —
41 live operators, 4 of them real — which makes the operator picker on every
sourcing and aircraft form useless.

Same fix as `03 · Clients`: the folder's last request archives what the run
created. There is no hard delete in this system by design, so the debris moves
to the Archived tab rather than disappearing.

`04 · Users` leaks too and is deliberately not fixed here: staff accounts have
no removal by design, so a run cannot clean up after itself. That is a known
consequence of withdrawing user deletion, recorded in AGENTS.md.
"""

import json
import pathlib

COLLECTION = pathlib.Path(__file__).with_name('Tribeca-Jets-API.postman_collection.json')

FOLDERS = {
    '05 · Airports': {
        'create': '05 · Add airport',
        'last': '10 · Restore several airports',
        'var': 'newAirportId',
        'path': '/airports/',
        'noun': 'airport',
    },
    '06 · Operators': {
        'create': '04 · Add operator',
        'last': '09 · Restore several operators',
        'var': 'newOperatorId',
        'path': '/operators/',
        'noun': 'operator',
    },
}


def capture_lines(existing: list[str], var: str) -> list[str]:
    """Adds the run-scoped id capture beside whatever the create already does."""
    return existing + [
        '',
        '// Kept separately from the id the list request captures, which later',
        '// requests overwrite. The teardown needs to know which row *this run*',
        '// created.',
        'if (pm.response.code < 400) {',
        f"    pm.collectionVariables.set('{var}', pm.response.json().data.id);",
        '}',
    ]


def teardown_lines(cfg: dict) -> list[str]:
    return [
        '// Teardown. This is the last request in the folder, and the folder ends',
        f"// by restoring the {cfg['noun']} it created — so every run used to leave",
        f"// one more live {cfg['noun']} behind. Thirty-seven had piled up in",
        '// operators before anyone looked.',
        '//',
        '// There is no hard delete in this system by design, so the run cannot',
        '// erase its own row. Archiving it is the best available end state: the',
        '// debris sits in the Archived tab instead of among the records the desk',
        '// actually works.',
        f"const id = pm.collectionVariables.get('{cfg['var']}');",
        'if (id) {',
        '    pm.sendRequest({',
        f"        url: pm.collectionVariables.get('baseUrl') + '{cfg['path']}' + id,",
        "        method: 'DELETE',",
        "        header: { 'X-CSRF-Token': pm.collectionVariables.get('csrfToken') },",
        '    }, function (err) {',
        "        if (err) { console.warn('teardown could not archive ' + id, err); }",
        '    });',
        f"    pm.collectionVariables.set('{cfg['var']}', '');",
        '}',
    ]


def main() -> None:
    collection = json.loads(COLLECTION.read_text())

    for folder_name, cfg in FOLDERS.items():
        folder = next(f for f in collection['item'] if f['name'] == folder_name)
        by_name = {r['name']: r for r in folder['item']}

        create = by_name[cfg['create']]
        for event in create.get('event', []):
            if event['listen'] == 'test':
                event['script']['exec'] = capture_lines(
                    event['script']['exec'], cfg['var']
                )
                break

        last = by_name[cfg['last']]
        events = [e for e in last.get('event', []) if e['listen'] != 'test']
        events.append({
            'listen': 'test',
            'script': {'type': 'text/javascript', 'exec': teardown_lines(cfg)},
        })
        last['event'] = events

        existing = {v['key'] for v in collection['variable']}
        if cfg['var'] not in existing:
            collection['variable'].append(
                {'key': cfg['var'], 'value': '', 'type': 'string'}
            )
        print(f'{folder_name}: teardown wired')

    COLLECTION.write_text(json.dumps(collection, indent=2) + '\n')


if __name__ == '__main__':
    main()
