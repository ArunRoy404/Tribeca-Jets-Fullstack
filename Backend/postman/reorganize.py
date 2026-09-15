#!/usr/bin/env python3
"""
Restructures the collection so auth lives in exactly one place.

Three things were wrong:

1. `/auth/login` appeared as a request in `03 · Clients` and twice in
   `04 · Users`, reading as though it were part of those APIs. Module folders
   now get a session from a folder pre-request script instead (session_setup).
2. `01 · Auth` only signed in as one account, so the other four roles had no
   documented sign-in at all.
3. `02 · Regression checks` restated three failures that were already captured
   as examples on the requests they belong to.

    python3 postman/reorganize.py

Prerequisites: the API on localhost:4000 with a freshly seeded database.
"""
from __future__ import annotations

import json
import pathlib
import sys

from build_users_folder import Session, clear_rate_limits, example, reset_env
from session_setup import ACCOUNTS, PASSWORD, with_session

# Values that appear in more than one place. A literal repeated across requests
# drifts the moment one copy is edited, and the failure looks like an API bug
# rather than a stale fixture. Single-use values stay literal — an indirection
# that resolves in exactly one place is harder to read, not easier.
COLLECTION_VARIABLES = [
    ("baseUrl", "http://localhost:4000/api",
     "API root. The only value to change when pointing at another environment."),
    ("ownerEmail", "admin@tribecajets.com",
     "The seeded SUPER_ADMIN. Used by its sign-in request and by the folder "
     "session scripts in Clients and Users."),
    ("password", "ChangeMe123!",
     "Shared by every seeded account, and by every folder session script."),
    ("newPassword", "BrandNewPass9",
     "Set by the password-reset flow. Sent twice in one body — newPassword and "
     "confirmPassword must match exactly — so a literal would be two places to "
     "edit for one change."),
    ("csrfToken", "",
     "Captured from the tj_csrf cookie after any sign-in. Echoed as "
     "X-CSRF-Token on every write."),
    ("otpCode", "",
     "Captured from devCode on sign-in and on forgot-password, then spent by "
     "the matching verify request."),
    ("clientId", "",
     "First id from the clients list, replaced by the id of any client this "
     "run creates so updates and deletes never touch seeded data."),
    ("userId", "",
     "First BROKER id from the team list, for the detail request."),
    ("invitedUserId", "",
     "Id of the account invited during this run. Update and remove target it, "
     "so the folder never mutates a seeded account."),
    ("inviteEmail", "",
     "Generated per run so a repeat run does not 409 on an address that "
     "already exists."),
]

# Requests that only assert a refusal. Their value is already carried by the
# saved error examples on the requests that actually produce them, so as
# separate entries they pad the collection without documenting an endpoint.
CHECK_REQUESTS = (
    "Authorization checks",
    "Write without X-CSRF-Token",
)


def strip_check_requests(items):
    """Removes refusal-only requests and folders, then renumbers the rest."""
    kept = [
        item for item in items
        if not any(marker in item.get("name", "") for marker in CHECK_REQUESTS)
    ]
    for index, item in enumerate(kept, start=1):
        if " · " in item.get("name", ""):
            item["name"] = f"{index:02d} · " + item["name"].split(" · ", 1)[1]
    return kept


def force_json_bodies(node):
    """
    Marks every raw body as JSON.

    Without `options.raw.language`, Postman renders a raw body as plain Text:
    no syntax highlighting, no formatting, and the inline comments that carry
    the field documentation are unreadable. Applied to saved examples too,
    since those carry bodies of their own.
    """
    if isinstance(node, dict):
        body = node.get("body")
        if isinstance(body, dict) and body.get("mode") == "raw":
            body["options"] = {"raw": {"language": "json"}}
        for value in node.values():
            force_json_bodies(value)
    elif isinstance(node, list):
        for value in node:
            force_json_bodies(value)

COLLECTION = pathlib.Path(__file__).parent / "Tribeca-Jets-API.postman_collection.json"

JSON_HEADER = {"key": "Content-Type", "value": "application/json"}

# The two-factor account goes LAST, not first.
#
# Signing in as it starts a challenge that `02 · Two-factor` then completes,
# and any later sign-in replaces the challenge cookie — so with it anywhere
# else in this folder, the verify step fails against a challenge that is no
# longer current. Ordering by privilege read better and did not work.
ROLE_ORDER = ["owner", "senior", "broker", "assistant", "admin"]

ROLE_TITLES = {
    "owner": "Owner · SUPER_ADMIN",
    "admin": "Admin · two-factor",
    "senior": "Senior Broker",
    "broker": "Broker",
    "assistant": "Assistant",
}

ROLE_NOTES = {
    "owner": (
        "The seeded owner. Holds every permission, and is the one account that "
        "cannot be demoted, suspended or removed — so the system can never be "
        "locked out of its own administration.\n\n"
        "Use this for the Users and Clients folders."
    ),
    "admin": (
        "**Listed last deliberately.** This starts a challenge that "
        "`02 · Two-factor` completes, and any sign-in after it would replace "
        "that challenge and break the verify step.\n\n"
        "An administrator with **two-factor enabled**, so this returns "
        "`requiresTwoFactor: true` and *no session yet* — `02 · Two-factor / "
        "02 · Verify code` must follow before anything else will authenticate.\n\n"
        "Without SMTP configured the code comes back in `devCode`, and the test "
        "script stores it in `otpCode` for the verify step. It never appears "
        "once SMTP is set."
    ),
    "senior": (
        "Full trip management, operator sourcing and team-wide financial "
        "visibility — but **no Manage Users**. Sign in here to see the Users "
        "folder's writes refuse with 403 while its reads still work."
    ),
    "broker": (
        "Sees only their own clients and trips. The narrowest role that still "
        "does day-to-day work, so it is the useful one for testing row-level "
        "scoping: the Clients list returns a different `meta.total` here than "
        "it does for the owner."
    ),
    "assistant": (
        "Read-mostly. Holds `OPERATOR_SOURCING` at `READ` scope, which is why "
        "write routes guarded with `@RequireWritePermissions` refuse it even "
        "though it holds the permission."
    ),
}

CAPTURE_TEST = [
    "// Every folder below gets its session from a pre-request script, but a",
    "// login run by hand should still leave the collection usable.",
    "const csrf = pm.cookies.get('tj_csrf');",
    "if (csrf) pm.collectionVariables.set('csrfToken', csrf);",
    "",
    "const body = pm.response.json();",
    "if (body.data && body.data.devCode) {",
    "    pm.collectionVariables.set('otpCode', body.data.devCode.code);",
    "}",
    "",
    "pm.test('accepted', function () {",
    "    pm.response.to.have.status(200);",
    "});",
]


def sign_in_request(index: int, account: str, responses: list) -> dict:
    email, _, variable = ACCOUNTS[account]
    # Only the owner's address is reused (its sign-in plus two folder session
    # scripts). The other four appear once each and read better as literals.
    email_value = f"{{{{{variable}}}}}" if variable else email
    email_note = (
        "  // required · valid email, case-insensitive\n"
        f"  // Held in the {variable} variable: the Clients and Users folders\n"
        "  // sign in as this account too, and two copies would drift.\n"
        if variable
        else "  // required · valid email, case-insensitive\n"
    )
    return {
        "name": f"{index:02d} · {ROLE_TITLES[account]}",
        "event": [
            {
                "listen": "test",
                "script": {"type": "text/javascript", "exec": CAPTURE_TEST},
            }
        ],
        "request": {
            "method": "POST",
            "header": [JSON_HEADER],
            "url": {
                "raw": "{{baseUrl}}/auth/login",
                "host": ["{{baseUrl}}"],
                "path": ["auth", "login"],
            },
            "description": (
                f"{ROLE_NOTES[account]}\n\n"
                "**Sets three cookies**, all httpOnly except the last:\n\n"
                "| Cookie | Lifetime | Purpose |\n|---|---|---|\n"
                "| `tj_access` | 15 minutes | the session |\n"
                "| `tj_refresh` | 7 days, or 30 with `rememberMe` | rotates the session |\n"
                "| `tj_csrf` | matches refresh | echoed back as `X-CSRF-Token` on writes |\n\n"
                "No token is ever returned in the body. The browser attaches "
                "them automatically and frontend JavaScript cannot read the "
                "first two."
            ),
            "body": {
                "mode": "raw",
                "raw": (
                    "{\n"
                    f"{email_note}"
                    f'  "email": "{email_value}",\n\n'
                    "  // required · every seeded account shares this password,\n"
                    "  // so it lives in the password variable rather than in five bodies\n"
                    '  "password": "{{password}}",\n\n'
                    "  // optional · default false\n"
                    "  // true extends the refresh cookie from 7 days to 30\n"
                    '  "rememberMe": false\n'
                    "}"
                ),
            },
        },
        "response": responses,
    }


def capture_sign_ins():
    """One captured success per role, plus the failures Regression used to hold."""
    print("  re-seeding + clearing rate limits...")
    reset_env()

    out = {}
    for account in ROLE_ORDER:
        clear_rate_limits()
        email, _, _variable = ACCOUNTS[account]
        session = Session()
        body = {"email": email, "password": PASSWORD, "rememberMe": False}
        status, payload = session.call("/auth/login", "POST", body)

        name = (
            "200 · Two-factor required"
            if (payload or {}).get("data", {}).get("requiresTwoFactor")
            else "200 · Signed in"
        )
        responses = [
            example(name, status, payload, method="POST", url="/auth/login", req_body=body)
        ]

        # The three cases `02 · Regression checks` used to duplicate belong on
        # the request that produces them, so they are captured here instead.
        if account == "owner":
            clear_rate_limits()
            bad = {"email": email, "password": "WrongPassword1!"}
            s, p = session.call("/auth/login", "POST", bad)
            responses.append(
                example("401 · Wrong password", s, p, method="POST", url="/auth/login", req_body=bad)
            )

            clear_rate_limits()
            missing = {"email": "nobody@tribecajets.com", "password": PASSWORD}
            s, p = session.call("/auth/login", "POST", missing)
            responses.append(
                example(
                    "401 · No such account (identical to a wrong password)",
                    s, p, method="POST", url="/auth/login", req_body=missing,
                )
            )

            clear_rate_limits()
            malformed = {"email": "not-an-email", "password": ""}
            s, p = session.call("/auth/login", "POST", malformed)
            responses.append(
                example("400 · Malformed body", s, p, method="POST", url="/auth/login", req_body=malformed)
            )

        out[account] = responses
    print("  re-seeding to leave the database clean...")
    reset_env()
    return out


def find(items, name):
    for item in items:
        if item.get("name") == name:
            return item
    return None


def main() -> None:
    collection = json.loads(COLLECTION.read_text())
    captured = capture_sign_ins()

    # --- 1. Auth: one sign-in per role ------------------------------------
    auth = find(collection["item"], "01 · Auth")
    sign_in = find(auth["item"], "01 · Sign in")
    sign_in["description"] = (
        "One sign-in per role, so every account the collection uses is "
        "documented in one place and the rest of the collection never repeats "
        "an auth endpoint.\n\n"
        "All five share the password `ChangeMe123!`. Each stores `csrfToken` "
        "for manual use; the module folders get their own session from a "
        "pre-request script and do not depend on running these first.\n\n"
        "`02 · Admin · two-factor` is the odd one out — it returns a challenge "
        "rather than a session, and needs `02 · Two-factor / 02 · Verify code` "
        "to complete."
    )
    sign_in["item"] = [
        sign_in_request(i, account, captured[account])
        for i, account in enumerate(ROLE_ORDER, start=1)
    ]

    # --- 2. Drop the regression folder ------------------------------------
    collection["item"] = [
        item for item in collection["item"]
        if item.get("name") != "02 · Regression checks"
    ]

    # --- 3. Module folders: no login requests, session from a script ------
    clients = find(collection["item"], "03 · Clients")
    if clients:
        clients["item"] = strip_check_requests([
            item for item in clients["item"]
            if "Sign in" not in item.get("name", "")
        ])
        with_session(clients, "owner")
        clients["description"] = (
            "Clients and travel agents.\n\n"
            "Signed in automatically as the owner by this folder's pre-request "
            "script, so it runs standalone. To watch row-level scoping, sign in "
            "as `04 · Broker` from the Auth folder and re-run `01 · List "
            "clients`: `meta.total` drops to the clients assigned to them."
        )

    users = find(collection["item"], "04 · Users")
    if users:
        users["item"] = strip_check_requests([
            item for item in users["item"]
            if "Sign in" not in item.get("name", "")
        ])
        with_session(users, "owner")

    # --- 4. Normalise bodies and variables --------------------------------
    force_json_bodies(collection)

    existing = {v["key"]: v for v in collection.get("variable", [])}
    collection["variable"] = [
        {
            "key": key,
            # Captured values keep whatever the last run stored; seeded ones
            # are pinned so a fresh clone works without editing anything.
            "value": existing.get(key, {}).get("value", default) if not default else default,
            "type": "string",
            "description": description,
        }
        for key, default, description in COLLECTION_VARIABLES
    ]

    COLLECTION.write_text(json.dumps(collection, indent=2) + "\n")
    print(f"Wrote {COLLECTION}")


if __name__ == "__main__":
    sys.exit(main())
