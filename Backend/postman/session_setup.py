"""
Folder-level session setup, shared by every module folder.

Module folders used to each carry their own `01 · Sign in (session setup)`
request. That put the same auth endpoint in three different folders, so the
collection read as though `/auth/login` were part of the Clients and Users
APIs. Auth endpoints now live only in `01 · Auth`.

What replaces them is a folder *pre-request script*, not a request: it signs
the folder in as whichever account it needs, once per run, and switches
accounts when a nested folder needs a different one. That also makes every
folder independently runnable — previously running `04 · Users` alone worked
only because it happened to carry its own login.
"""

# email, description, and the collection variable each folder script reads.
# A value used by both a request body and a script gets a variable; a value
# used once stays a literal, where it is easier to read than an indirection.
ACCOUNTS = {
    "owner": ("admin@tribecajets.com", "the seeded SUPER_ADMIN", "ownerEmail"),
    "admin": ("security@tribecajets.com", "an ADMIN (two-factor enabled)", None),
    "senior": ("senior@tribecajets.com", "a SENIOR_BROKER", None),
    "broker": ("broker@tribecajets.com", "a BROKER — no Manage Users", None),
    "assistant": ("assistant@tribecajets.com", "an ASSISTANT", None),
}

PASSWORD = "ChangeMe123!"


def session_script(account: str) -> dict:
    """A folder `prerequest` event that guarantees a session for `account`."""
    email, description, variable = ACCOUNTS[account]
    # Read the address from its collection variable when it has one, so the
    # script and the sign-in request can never disagree about the account.
    email_expr = (
        f"pm.collectionVariables.get('{variable}')" if variable else f"'{email}'"
    )
    return {
        "listen": "prerequest",
        "script": {
            "type": "text/javascript",
            "exec": [
                "/*",
                f" * Signs this folder in as {description}.",
                " *",
                " * Runs before every request in the folder but only acts when the",
                " * current session is for a different account, so it costs one login",
                " * per run rather than one per request. `pm.variables` is run-scoped,",
                " * so a fresh run always re-authenticates.",
                " *",
                " * This is why no folder below `01 · Auth` contains a login request:",
                " * auth endpoints are documented once, in one place.",
                " */",
                f"const NEEDED = '{account}';",
                "",
                "if (pm.variables.get('_sessionAs') !== NEEDED) {",
                "    pm.sendRequest({",
                "        url: pm.collectionVariables.get('baseUrl') + '/auth/login',",
                "        method: 'POST',",
                "        header: { 'Content-Type': 'application/json' },",
                "        body: {",
                "            mode: 'raw',",
                "            raw: JSON.stringify({",
                f"                email: {email_expr},",
                "                password: pm.collectionVariables.get('password'),",
                "            }),",
                "        },",
                "    }, function (err, res) {",
                "        if (err) { console.error('session setup failed', err); return; }",
                "",
                "        const body = res.json();",
                "        // security@ has two-factor on, so a password alone leaves the",
                "        // session incomplete. Finish the challenge before continuing,",
                "        // or every request in the folder 401s.",
                "        if (body && body.data && body.data.requiresTwoFactor) {",
                "            const code = body.data.devCode && body.data.devCode.code;",
                "            pm.sendRequest({",
                "                url: pm.collectionVariables.get('baseUrl') + '/auth/two-factor/verify',",
                "                method: 'POST',",
                "                header: { 'Content-Type': 'application/json' },",
                "                body: { mode: 'raw', raw: JSON.stringify({ code: code }) },",
                "            }, function (e, verifyRes) {",
                "                pm.variables.set('_sessionAs', NEEDED);",
                "                captureCsrf(verifyRes);",
                "            });",
                "            return;",
                "        }",
                "",
                "        pm.variables.set('_sessionAs', NEEDED);",
                "        captureCsrf(res);",
                "    });",
                "}",
                "",
                "// Writes need X-CSRF-Token, and the value is only readable from the",
                "// cookie the server just set.",
                "//",
                "// Parsed out of Set-Cookie rather than read from pm.cookies.jar():",
                "// the jar is not reliably populated in Newman, and a jar read that",
                "// comes back empty would clobber a working token with undefined.",
                "function captureCsrf(res) {",
                "    if (!res) return;",
                "    const cookies = res.headers.all()",
                "        .filter(function (h) { return h.key.toLowerCase() === 'set-cookie'; })",
                "        .map(function (h) { return h.value; });",
                "    for (var i = 0; i < cookies.length; i++) {",
                "        const match = /tj_csrf=([^;]+)/.exec(cookies[i]);",
                "        if (match) { pm.collectionVariables.set('csrfToken', match[1]); return; }",
                "    }",
                "}",
            ],
        },
    }


def with_session(folder: dict, account: str) -> dict:
    """Attaches session setup to a folder, replacing any existing one."""
    events = [e for e in folder.get("event", []) if e.get("listen") != "prerequest"]
    events.insert(0, session_script(account))
    folder["event"] = events
    return folder
