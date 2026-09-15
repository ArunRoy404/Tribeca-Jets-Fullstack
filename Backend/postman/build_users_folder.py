#!/usr/bin/env python3
"""
Builds the "04 · Users" folder of the Postman collection.

Every example in the collection is captured from a live API run rather than
hand-written, because hand-written examples drift silently: they keep claiming
a shape the API stopped returning months ago, and nobody notices until someone
integrates against them. Run this after changing the users module.

    python3 postman/build-users-folder.py

Prerequisites: the API on localhost:4000 with a freshly seeded database.
"""
from __future__ import annotations

import http.cookiejar
import json
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "http://localhost:4000/api"
COLLECTION = pathlib.Path(__file__).parent / "Tribeca-Jets-API.postman_collection.json"
PASSWORD = "ChangeMe123!"

# --------------------------------------------------------------------------
# Live capture
# --------------------------------------------------------------------------


class Session:
    def __init__(self) -> None:
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )

    @property
    def csrf(self) -> str:
        for c in self.jar:
            if c.name == "tj_csrf":
                return c.value
        return ""

    def call(self, path, method="GET", body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            BASE + path,
            data=data,
            headers={"Content-Type": "application/json", **(headers or {})},
            method=method,
        )
        if self.csrf and "X-CSRF-Token" not in (headers or {}):
            req.add_header("X-CSRF-Token", self.csrf)
        try:
            r = self.opener.open(req)
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as e:
            raw = e.read()
            return e.code, (json.loads(raw) if raw else None)

    def login(self, email, password=PASSWORD):
        clear_rate_limits()
        status, body = self.call(
            "/auth/login", "POST", {"email": email, "password": password}
        )
        if status != 200:
            raise SystemExit(f"login failed for {email}: {status} {body}")
        # security@ has two-factor on; complete the challenge so the session is real.
        data = body.get("data") or {}
        if data.get("requiresTwoFactor"):
            code = (data.get("devCode") or {}).get("code")
            status, body = self.call("/auth/two-factor/verify", "POST", {"code": code})
            if status != 200:
                raise SystemExit(f"2FA failed for {email}: {status} {body}")
        return body


# Accounts the seed owns. Anything else in the users table was created by a
# capture or a Postman run and is safe to purge.
SEEDED_EMAILS = (
    "admin@tribecajets.com", "broker@tribecajets.com", "security@tribecajets.com",
    "reset-demo@tribecajets.com", "senior@tribecajets.com", "assistant@tribecajets.com",
    "barry@tribecajets.com", "mark@tribecajets.com", "tom@tribecajets.com",
    "newhire@tribecajets.com",
)


def reset_env() -> None:
    """
    Restore a known database and drop rate-limit counters.

    Purges accounts left behind by earlier capture or newman runs. Without this
    the second run fails on a 409 from an invite whose address already exists —
    which is a dirty fixture, not an API defect, and wastes time looking like one.
    """
    root = pathlib.Path(__file__).parent.parent
    quoted = ", ".join(f"'{e}'" for e in SEEDED_EMAILS)
    subprocess.run(
        [
            "docker", "exec", "tribeca_postgres", "psql",
            "-U", "tribeca", "-d", "tribeca_jets", "-q", "-c",
            f"DELETE FROM users WHERE email NOT IN ({quoted});",
        ],
        capture_output=True,
    )
    subprocess.run(
        ["npx", "prisma", "db", "seed"], cwd=root, capture_output=True, check=True
    )
    clear_rate_limits()


def clear_rate_limits() -> None:
    """
    Drop per-IP rate-limit counters.

    Login allows 5 attempts per 15 minutes per IP, which is correct for
    production and far too few for a capture run that signs in as four
    different accounts. Called before every login here rather than once up
    front, so the limiter stays fully enabled for everything except this
    development-only script.
    """
    subprocess.run(
        [
            "docker", "exec", "tribeca_redis", "sh", "-c",
            "redis-cli --scan --pattern 'ratelimit:*' | xargs -r redis-cli DEL",
        ],
        capture_output=True,
    )


def example(name, status, body, *, method="GET", url="", req_body=None, headers=None):
    """
    A Postman saved-response entry.

    The status code is parsed out of `name` and asserted against what the API
    actually returned. Without this an example can silently capture the wrong
    response — a broken session captured 401s under names promising 403s on the
    first run of this script, and the collection would have shipped saying so.
    """
    expected = int(name.split(" ", 1)[0])
    if expected != status:
        raise SystemExit(
            f"example '{name}' expected HTTP {expected} but the API returned "
            f"{status}: {json.dumps(body)[:300]}"
        )
    header = [{"key": "Content-Type", "value": "application/json"}]
    return {
        "name": name,
        "originalRequest": {
            "method": method,
            "header": headers or ([] if req_body is None else header),
            **({"body": {"mode": "raw", "raw": json.dumps(req_body, indent=2)}} if req_body is not None else {}),
            "url": {"raw": "{{baseUrl}}" + url, "host": ["{{baseUrl}}"], "path": [p for p in url.strip("/").split("/") if p and "?" not in p]},
        },
        "status": {
            200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request",
            401: "Unauthorized", 403: "Forbidden", 404: "Not Found",
            409: "Conflict", 429: "Too Many Requests",
        }.get(status, "Unknown"),
        "code": status,
        "_postman_previewlanguage": "json",
        "header": [{"key": "Content-Type", "value": "application/json; charset=utf-8"}],
        "cookie": [],
        "body": "" if body is None else json.dumps(body, indent=2),
    }


def capture():
    print("  re-seeding + clearing rate limits...")
    reset_env()

    admin = Session()
    admin.login("admin@tribecajets.com")
    broker = Session()
    broker.login("broker@tribecajets.com")
    anon = Session()

    out: dict[str, list] = {k: [] for k in
                            ["signin", "list", "stats", "roles", "detail", "invite",
                             "update", "denied", "deny_login", "deny_list"]}

    # --- sign in ----------------------------------------------------------
    fresh = Session()
    clear_rate_limits()
    login_body = {"email": "admin@tribecajets.com", "password": PASSWORD, "rememberMe": False}
    s, b = fresh.call("/auth/login", "POST", login_body)
    out["signin"].append(
        example("200 · Signed in", s, b, method="POST", url="/auth/login", req_body=login_body)
    )
    bad_login = {"email": "admin@tribecajets.com", "password": "WrongPassword1!"}
    s, b = fresh.call("/auth/login", "POST", bad_login)
    out["signin"].append(
        example("401 · Bad credentials", s, b, method="POST", url="/auth/login", req_body=bad_login)
    )

    # --- list -------------------------------------------------------------
    q = "/users?page=1&limit=5&sortBy=createdAt&sortOrder=desc"
    s, b = admin.call(q)
    out["list"].append(example("200 · Page of team members", s, b, url=q))

    q2 = "/users?page=1&limit=20&role=BROKER&status=ACTIVE"
    s, b = admin.call(q2)
    out["list"].append(example("200 · Filtered by role and status", s, b, url=q2))

    q3 = "/users?search=walsh"
    s, b = admin.call(q3)
    out["list"].append(example("200 · Search by name or email", s, b, url=q3))

    q4 = "/users?limit=3"
    s, b = broker.call(q4)
    out["list"].append(
        example("200 · Reduced projection (caller without Manage Users)", s, b, url=q4)
    )

    q5 = "/users?sortBy=passwordHash"
    s, b = admin.call(q5)
    out["list"].append(example("400 · sortBy not in the allowed list", s, b, url=q5))

    q6 = "/users?page=0&limit=500"
    s, b = admin.call(q6)
    out["list"].append(example("400 · page/limit out of bounds", s, b, url=q6))

    s, b = anon.call("/users")
    out["list"].append(example("401 · Not signed in", s, b, url="/users"))

    # --- stats ------------------------------------------------------------
    s, b = admin.call("/users/stats")
    out["stats"].append(example("200 · Headcount tiles", s, b, url="/users/stats"))
    s, b = anon.call("/users/stats")
    out["stats"].append(example("401 · Not signed in", s, b, url="/users/stats"))

    # --- roles ------------------------------------------------------------
    s, b = admin.call("/users/roles")
    out["roles"].append(example("200 · Roles and permission matrix", s, b, url="/users/roles"))
    s, b = anon.call("/users/roles")
    out["roles"].append(example("401 · Not signed in", s, b, url="/users/roles"))

    # --- detail -----------------------------------------------------------
    s, listing = admin.call("/users?role=BROKER&status=ACTIVE&limit=1")
    target_id = listing["data"][0]["id"]
    s, b = admin.call(f"/users/{target_id}")
    out["detail"].append(example("200 · One team member", s, b, url="/users/:id"))

    s, suspended = admin.call("/users?status=SUSPENDED&limit=1")
    suspended_id = suspended["data"][0]["id"]
    s, b = broker.call(f"/users/{suspended_id}")
    out["detail"].append(
        example("404 · Outside the caller's visibility (never 403)", s, b, url="/users/:id")
    )

    s, b = admin.call("/users/00000000-0000-4000-8000-000000000000")
    out["detail"].append(example("404 · No such user", s, b, url="/users/:id"))

    s, b = admin.call("/users/not-a-uuid")
    out["detail"].append(example("400 · Malformed id", s, b, url="/users/:id"))

    # --- invite -----------------------------------------------------------
    # Unique per run, mirroring the collection's own pre-request script: a
    # fixed address would 409 on every run after the first.
    invite_body = {
        "email": f"avery.new+{int(time.time())}@tribecajets.com",
        "firstName": "Avery",
        "lastName": "Newman",
        "phone": "+1 555 0163",
        "role": "BROKER",
    }
    s, b = admin.call("/users/invite", "POST", invite_body)
    out["invite"].append(
        example("201 · Invitation created", s, b, method="POST", url="/users/invite", req_body=invite_body)
    )
    invited_id = b["data"]["user"]["id"]

    s, b = admin.call("/users/invite", "POST", invite_body)
    out["invite"].append(
        example("409 · Email already in use", s, b, method="POST", url="/users/invite", req_body=invite_body)
    )

    bad = {"email": "not-an-email", "firstName": "", "lastName": "X", "role": "BROKER"}
    s, b = admin.call("/users/invite", "POST", bad)
    out["invite"].append(
        example("400 · Validation failed", s, b, method="POST", url="/users/invite", req_body=bad)
    )

    super_try = {"email": "x@tribecajets.com", "firstName": "X", "lastName": "Y", "role": "SUPER_ADMIN"}
    s, b = admin.call("/users/invite", "POST", super_try)
    out["invite"].append(
        example("400 · SUPER_ADMIN is not assignable", s, b, method="POST", url="/users/invite", req_body=super_try)
    )

    s, b = broker.call("/users/invite", "POST", invite_body)
    out["invite"].append(
        example("403 · Role lacks Manage Users", s, b, method="POST", url="/users/invite", req_body=invite_body)
    )
    out["denied"].append(
        example("403 · Broker cannot invite", s, b, method="POST", url="/users/invite", req_body=invite_body)
    )

    s, b = admin.call("/users/invite", "POST", invite_body, headers={"X-CSRF-Token": ""})
    out["invite"].append(
        example("403 · Missing X-CSRF-Token", s, b, method="POST", url="/users/invite", req_body=invite_body)
    )

    # --- update -----------------------------------------------------------
    upd = {"role": "SENIOR_BROKER", "status": "ACTIVE", "phone": "+1 555 0199"}
    s, b = admin.call(f"/users/{invited_id}", "PATCH", upd)
    out["update"].append(
        example("200 · Updated", s, b, method="PATCH", url="/users/:id", req_body=upd)
    )

    s, b = admin.call(f"/users/{invited_id}", "PATCH", {})
    out["update"].append(
        example("400 · Empty patch", s, b, method="PATCH", url="/users/:id", req_body={})
    )

    lower = {"role": "senior_broker"}
    s, b = admin.call(f"/users/{invited_id}", "PATCH", lower)
    out["update"].append(
        example("400 · Enum is case-sensitive", s, b, method="PATCH", url="/users/:id", req_body=lower)
    )

    s, me = admin.call("/auth/me")
    self_id = me["data"]["id"]
    s, b = admin.call(f"/users/{self_id}", "PATCH", {"role": "BROKER"})
    out["update"].append(
        example("400 · Cannot change your own role", s, b, method="PATCH", url="/users/:id", req_body={"role": "BROKER"})
    )

    # security@ is ADMIN; admin@ is the SUPER_ADMIN owner.
    security = Session()
    security.login("security@tribecajets.com")
    s, b = security.call(f"/users/{self_id}", "PATCH", {"status": "SUSPENDED"})
    out["update"].append(
        example("403 · The owner account is immutable", s, b, method="PATCH", url="/users/:id", req_body={"status": "SUSPENDED"})
    )

    # --- authorization sub-folder ----------------------------------------
    deny = Session()
    clear_rate_limits()
    dl_body = {"email": "broker@tribecajets.com", "password": PASSWORD}
    s_, b = deny.call("/auth/login", "POST", dl_body)
    out["deny_login"].append(
        example("200 · Signed in as a broker", s_, b, method="POST", url="/auth/login", req_body=dl_body)
    )
    s_, b = deny.call("/users?limit=3")
    out["deny_list"].append(
        example("200 · Reduced projection", s_, b, url="/users?limit=3")
    )

    print("  re-seeding to leave the database clean...")
    reset_env()
    return out


# --------------------------------------------------------------------------
# Folder definition
# --------------------------------------------------------------------------

CSRF_HEADER = {
    "key": "X-CSRF-Token",
    "value": "{{csrfToken}}",
    "description": "Required on every write. Captured automatically after any login or refresh.",
}
JSON_HEADER = {"key": "Content-Type", "value": "application/json"}

ROLE_VALUES = "SUPER_ADMIN | ADMIN | SENIOR_BROKER | BROKER | ASSISTANT"
STATUS_VALUES = "ACTIVE | INVITED | SUSPENDED"
SORT_VALUES = "createdAt | updatedAt | firstName | lastName | email | role | status | lastLoginAt"


def build_folder(captured):
    return {
        "name": "04 · Users",
        "description": (
            "Team directory, invitations, role and status administration, and the "
            "permission matrix behind the Roles & Permissions tab.\n\n"
            "**Two layers of authorization apply.**\n\n"
            "1. *Capability* — `Manage Users` is held only by `SUPER_ADMIN` and "
            "`ADMIN`. Without it, every write here returns **403**.\n"
            "2. *Projection* — `GET /users` is open to any signed-in user, because "
            "every module needs a staff picker (the client form's Assigned Broker "
            "dropdown is the first). Callers without `Manage Users` get a reduced "
            "response: names and roles only, no status, no login history, and only "
            "`ACTIVE` accounts.\n\n"
            "**A row the caller may not see returns 404, never 403.** A 403 would "
            "confirm the account exists and turn any id into an existence oracle.\n\n"
            "Run `01 · Sign in` first — it captures `csrfToken` for every write below."
        ),
        "item": [
            {
                "name": "01 · Sign in (session setup)",
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "// Capture the CSRF token for every write in this folder.",
                                "const csrf = pm.cookies.get('tj_csrf');",
                                "if (csrf) pm.collectionVariables.set('csrfToken', csrf);",
                                "pm.test('signed in as an administrator', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                            ],
                        },
                    }
                ],
                "request": {
                    "method": "POST",
                    "header": [JSON_HEADER],
                    "url": {"raw": "{{baseUrl}}/auth/login", "host": ["{{baseUrl}}"], "path": ["auth", "login"]},
                    "description": (
                        "Signs in as the seeded owner account, which holds `Manage Users`.\n\n"
                        "Sets `tj_access`, `tj_refresh` and `tj_csrf` as cookies. The test "
                        "script lifts `tj_csrf` into the `csrfToken` collection variable, "
                        "which every write below sends as `X-CSRF-Token`.\n\n"
                        "To see the reduced-projection behaviour instead, sign in as "
                        "`broker@tribecajets.com` with the same password."
                    ),
                    "body": {
                        "mode": "raw",
                        "raw": (
                            "{\n"
                            '  // required · the seeded SUPER_ADMIN\n'
                            '  "email": "admin@tribecajets.com",\n\n'
                            '  // required · every seeded account shares this password\n'
                            '  "password": "ChangeMe123!",\n\n'
                            "  // optional · default false\n"
                            "  // true extends the refresh cookie from 7 days to 30\n"
                            '  "rememberMe": false\n'
                            "}"
                        ),
                    },
                },
                "response": captured["signin"],
            },
            {
                "name": "02 · List team members",
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "// Feed the detail request below. Picks a BROKER rather than the",
                                "// first row, so the id is never the signed-in administrator —",
                                "// self-targeted writes are refused by design and would look",
                                "// like a broken collection.",
                                "const rows = pm.response.json().data || [];",
                                "const target = rows.find(u => u.role === 'BROKER') || rows[0];",
                                "if (target) pm.collectionVariables.set('userId', target.id);",
                                "pm.test('returns a page with meta', function () {",
                                "    pm.response.to.have.status(200);",
                                "    pm.expect(pm.response.json()).to.have.property('meta');",
                                "});",
                            ],
                        },
                    }
                ],
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{baseUrl}}/users?page=1&limit=20&sortBy=createdAt&sortOrder=desc",
                        "host": ["{{baseUrl}}"],
                        "path": ["users"],
                        "query": [
                            {"key": "page", "value": "1",
                             "description": "Page number. Integer, min 1. Default 1. Out of range → 400."},
                            {"key": "limit", "value": "20",
                             "description": "Rows per page. Integer 1-100. Default 20. Capped so nobody can pull the whole table in one request; >100 → 400."},
                            {"key": "sortBy", "value": "createdAt",
                             "description": f"Allowed (case-sensitive): {SORT_VALUES}. Default createdAt. A closed list — anything else returns 400 rather than reaching the database."},
                            {"key": "sortOrder", "value": "desc",
                             "description": "Allowed (case-sensitive): asc | desc. Default desc."},
                            {"key": "search", "value": "walsh", "disabled": True,
                             "description": "Case-insensitive substring match on firstName, lastName or email. Omit for no search."},
                            {"key": "role", "value": "BROKER", "disabled": True,
                             "description": f"Allowed (case-sensitive): {ROLE_VALUES}. Omit for all roles."},
                            {"key": "status", "value": "ACTIVE", "disabled": True,
                             "description": f"Allowed (case-sensitive): {STATUS_VALUES}. Omit for all statuses. Callers without Manage Users always see ACTIVE only, whatever is passed here."},
                            {"key": "includeDeleted", "value": "false", "disabled": True,
                             "description": "Allowed (case-sensitive): true | false. Default false. Includes soft-deleted accounts — honoured only for callers holding Manage Users; silently ignored for everyone else, since a query param must never widen visibility."},
                        ],
                    },
                    "description": (
                        "Paginated staff directory.\n\n"
                        "**Response envelope**\n\n"
                        "```\n{ success, data: [...], meta }\n```\n\n"
                        "`meta` carries `page`, `limit`, `total`, `totalPages`, `hasNext`, "
                        "`hasPrevious`. Paging is entirely server-side — `total` counts what "
                        "this caller may actually see, not the table size.\n\n"
                        "**Two different response shapes**, depending on the caller:\n\n"
                        "- *With* `Manage Users`: full record including `status`, `lastLoginAt`, "
                        "`twoFactorEnabled`, `phone`, `invitedAt`, `permissionLevel`.\n"
                        "- *Without*: `id`, `email`, `firstName`, `lastName`, `role`, "
                        "`avatarKey` only — enough to populate a staff picker, nothing more. "
                        "Compare the two 200 examples.\n\n"
                        "See the Params tab for every filter and its exact case-sensitive values."
                    ),
                },
                "response": captured["list"],
            },
            {
                "name": "03 · Team stats",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {"raw": "{{baseUrl}}/users/stats", "host": ["{{baseUrl}}"], "path": ["users", "stats"]},
                    "description": (
                        "Counts for the tiles above the users table: `total`, `active`, "
                        "`invited`, `suspended`, plus a breakdown by role (`admins` folds "
                        "`SUPER_ADMIN` and `ADMIN` together, matching how the UI presents them).\n\n"
                        "Scoped like the list: a caller without `Manage Users` counts only "
                        "active accounts.\n\nNo parameters."
                    ),
                },
                "response": captured["stats"],
            },
            {
                "name": "04 · Roles & permission matrix",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {"raw": "{{baseUrl}}/users/roles", "host": ["{{baseUrl}}"], "path": ["users", "roles"]},
                    "description": (
                        "Everything the Roles & Permissions tab renders, generated from the "
                        "server-side matrix — so the table an administrator reads is the "
                        "ruleset the API actually enforces, not a frontend copy that drifts.\n\n"
                        "**`roles[]`** — one entry per role with `permissionLevel`, "
                        "`description`, live `userCount`, `assignable` (false for "
                        "`SUPER_ADMIN`, which is never offered in the UI), and the role's "
                        "full permission map.\n\n"
                        "**`matrix[]`** — one entry per permission with its display `label` "
                        "and a `scopes` object keyed by role.\n\n"
                        "**`scopes[]`** — the scope vocabulary, in increasing order of reach:\n\n"
                        "| Scope | Meaning |\n|---|---|\n"
                        "| `NONE` | No access. The guard rejects the request. |\n"
                        "| `READ` | May view, may not modify. |\n"
                        "| `ASSIGNED` | Only rows assigned to this user. |\n"
                        "| `OWN` | Only rows this user owns or originated. |\n"
                        "| `ALL` | Every row. |\n\n"
                        "Scopes rather than booleans, because the matrix has \"Own Only\", "
                        "\"Assigned\" and \"View\" cells that a boolean cannot express.\n\n"
                        "Available to every signed-in user: the frontend hides controls the "
                        "caller cannot use. That is a courtesy — the guard on each route is "
                        "the actual enforcement.\n\nNo parameters."
                    ),
                },
                "response": captured["roles"],
            },
            {
                "name": "05 · Get team member",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{baseUrl}}/users/:id",
                        "host": ["{{baseUrl}}"],
                        "path": ["users", ":id"],
                        "variable": [{
                            "key": "id",
                            "value": "{{userId}}",
                            "description": "UUID of the team member. Anything that is not a well-formed UUID returns 400 before any lookup happens.",
                        }],
                    },
                    "description": (
                        "One team member, with `invitedBy` and a `_count` of the clients "
                        "assigned to and originated by them.\n\n"
                        "Subject to the same projection rule as the list: without "
                        "`Manage Users` you get the reduced shape.\n\n"
                        "**404, not 403**, for an account outside your visibility — see the "
                        "captured example. A 403 would confirm the row exists."
                    ),
                },
                "response": captured["detail"],
            },
            {
                "name": "06 · Invite team member",
                "event": [
                    {
                        "listen": "prerequest",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "// A fresh address per run. A fixed one would 409 on every run",
                                "// after the first, making a working collection look broken.",
                                "pm.collectionVariables.set('inviteEmail',",
                                "    `avery.new+${Date.now()}@tribecajets.com`);",
                            ],
                        },
                    },
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "// The update request below operates on this throwaway",
                                "// account, so running the folder never mutates a seeded one.",
                                "if (pm.response.code === 201) {",
                                "    pm.collectionVariables.set('invitedUserId',",
                                "        pm.response.json().data.user.id);",
                                "}",
                                "pm.test('invitation created', function () {",
                                "    pm.response.to.have.status(201);",
                                "});",
                            ],
                        },
                    }
                ],
                "request": {
                    "method": "POST",
                    "header": [JSON_HEADER, CSRF_HEADER],
                    "url": {"raw": "{{baseUrl}}/users/invite", "host": ["{{baseUrl}}"], "path": ["users", "invite"]},
                    "description": (
                        "Creates an account in `INVITED` status.\n\n"
                        "**No password is accepted here, by design.** The account is created "
                        "with a random, discarded password that is never usable, and the "
                        "invitee sets a real one through the normal password-reset flow. So a "
                        "credential is never chosen by, transmitted to, or known by the person "
                        "doing the inviting.\n\n"
                        "**Email delivery follows the SMTP config.** With SMTP configured an "
                        "invitation goes out and `invitation.emailSent` is `true`. Without it, "
                        "`emailSent` is `false` and `invitation.notice` explains what to tell "
                        "the invitee instead — rather than failing silently and leaving them "
                        "waiting for mail that never sent.\n\n"
                        "The address must be free: any existing account with that email is a "
                        "409, archived rows included, so an address is never handed out twice.\n\n"
                        "Requires `Manage Users`."
                    ),
                    "body": {
                        "mode": "raw",
                        "raw": (
                            "{\n"
                            '  // required · valid email, stored lowercase.\n'
                            "  // This is the login identity and cannot be changed later.\n"
                            "  // Already in use by a live account → 409.\n"
                            '  "email": "{{inviteEmail}}",\n\n'
                            "  // required · 1-100 chars\n"
                            '  "firstName": "Avery",\n\n'
                            "  // required · 1-100 chars\n"
                            '  "lastName": "Newman",\n\n'
                            "  // optional · max 40 chars, free-form\n"
                            '  "phone": "+1 555 0163",\n\n'
                            "  // optional · default \"BROKER\"\n"
                            '  // Allowed (case-sensitive): "ADMIN" | "SENIOR_BROKER" | "BROKER" | "ASSISTANT"\n'
                            '  // "SUPER_ADMIN" is deliberately NOT assignable: it would let an\n'
                            "  // admin mint an account immune to their own administration.\n"
                            '  "role": "BROKER"\n'
                            "}"
                        ),
                    },
                },
                "response": captured["invite"],
            },
            {
                "name": "07 · Update team member",
                "request": {
                    "method": "PATCH",
                    "header": [JSON_HEADER, CSRF_HEADER],
                    "url": {
                        "raw": "{{baseUrl}}/users/:id",
                        "host": ["{{baseUrl}}"],
                        "path": ["users", ":id"],
                        "variable": [{"key": "id", "value": "{{invitedUserId}}", "description": "UUID of the team member to update. Populated by `06 · Invite team member`, so running this folder in order never mutates a seeded account."}],
                    },
                    "description": (
                        "Partial update. Send only the fields you are changing; at least one "
                        "is required (an empty body returns 400).\n\n"
                        "**Deliberately absent:** `email` (the login identity and the anchor "
                        "of the audit trail) and `password` (never set by an administrator).\n\n"
                        "**Refusals that protect the system from its own administrators:**\n\n"
                        "| Attempt | Result |\n|---|---|\n"
                        "| Change your own role | 400 |\n"
                        "| Set your own status to anything but `ACTIVE` | 400 |\n"
                        "| Modify the `SUPER_ADMIN` owner (unless you are it) | 403 |\n"
                        "| Demote or suspend the last active administrator | 400 |\n\n"
                        "The last-administrator check counts against the live database rather "
                        "than the request, because two admins demoting each other concurrently "
                        "would each individually look safe.\n\n"
                        "Role and status changes are written to the audit log as "
                        "`user.access_changed` with before/after values.\n\n"
                        "Requires `Manage Users`."
                    ),
                    "body": {
                        "mode": "raw",
                        "raw": (
                            "{\n"
                            "  // all fields optional · send at least one, or 400\n\n"
                            "  // 1-100 chars\n"
                            '  "firstName": "Avery",\n\n'
                            "  // 1-100 chars\n"
                            '  "lastName": "Newman",\n\n'
                            "  // max 40 chars · send null to clear it\n"
                            '  "phone": "+1 555 0199",\n\n'
                            '  // Allowed (case-sensitive): "ADMIN" | "SENIOR_BROKER" | "BROKER" | "ASSISTANT"\n'
                            '  // "SUPER_ADMIN" is not assignable. Cannot be your own role.\n'
                            '  "role": "SENIOR_BROKER",\n\n'
                            '  // Allowed (case-sensitive): "ACTIVE" | "INVITED" | "SUSPENDED"\n'
                            "  // SUSPENDED revokes access; the row and its history are kept.\n"
                            "  // Cannot be used on your own account.\n"
                            '  "status": "ACTIVE",\n\n'
                            "  // boolean · turns the two-factor sign-in challenge on or off\n"
                            "  // for this account. This is the toggle behind the security\n"
                            "  // setting; two-factor is not mandatory system-wide.\n"
                            '  "twoFactorEnabled": false\n'
                            "}"
                        ),
                    },
                },
                "response": captured["update"],
            },
            {
                "name": "09 · Authorization checks",
                "description": (
                    "Proves the permission layer actually refuses, rather than asserting "
                    "it in prose.\n\n"
                    "These run as a `BROKER`, who holds no `Manage Users`. The sign-in "
                    "steps either side swap the session and swap it back, so the folder "
                    "leaves you signed in as an administrator and can be re-run in place.\n\n"
                    "The refusal names the missing *capability*, never the roles that "
                    "would have worked — telling a caller which roles succeed maps out "
                    "the privilege model for them."
                ),
                "item": [
                    {
                        "name": "01 · Sign in as a broker",
                        "event": [{
                            "listen": "test",
                            "script": {
                                "type": "text/javascript",
                                "exec": [
                                    "const csrf = pm.cookies.get('tj_csrf');",
                                    "if (csrf) pm.collectionVariables.set('csrfToken', csrf);",
                                    "pm.test('signed in as a broker', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                ],
                            },
                        }],
                        "request": {
                            "method": "POST",
                            "header": [JSON_HEADER],
                            "url": {"raw": "{{baseUrl}}/auth/login", "host": ["{{baseUrl}}"], "path": ["auth", "login"]},
                            "description": "Swaps the session to an account without `Manage Users`.",
                            "body": {"mode": "raw", "raw": (
                                "{\n"
                                '  // a seeded BROKER — no Manage Users permission\n'
                                '  "email": "broker@tribecajets.com",\n'
                                '  "password": "ChangeMe123!"\n'
                                "}"
                            )},
                        },
                        "response": captured["deny_login"],
                    },
                    {
                        "name": "02 · Invite as a broker → 403",
                        "event": [{
                            "listen": "test",
                            "script": {
                                "type": "text/javascript",
                                "exec": [
                                    "pm.test('refused with 403', function () {",
                                    "    pm.response.to.have.status(403);",
                                    "});",
                                    "pm.test('names the capability, not the roles', function () {",
                                    "    pm.expect(pm.response.json().message)",
                                    "      .to.include('Manage Users');",
                                    "});",
                                ],
                            },
                        }],
                        "request": {
                            "method": "POST",
                            "header": [JSON_HEADER, CSRF_HEADER],
                            "url": {"raw": "{{baseUrl}}/users/invite", "host": ["{{baseUrl}}"], "path": ["users", "invite"]},
                            "description": (
                                "A write the caller's role does not permit. Returns **403** "
                                "and creates nothing."
                            ),
                            "body": {"mode": "raw", "raw": (
                                "{\n"
                                '  "email": "should-not-exist@tribecajets.com",\n'
                                '  "firstName": "Should",\n'
                                '  "lastName": "Fail",\n'
                                '  "role": "BROKER"\n'
                                "}"
                            )},
                        },
                        "response": captured["denied"],
                    },
                    {
                        "name": "03 · List as a broker → reduced projection",
                        "event": [{
                            "listen": "test",
                            "script": {
                                "type": "text/javascript",
                                "exec": [
                                    "pm.test('no administrative fields leak', function () {",
                                    "    const row = pm.response.json().data[0];",
                                    "    pm.expect(row).to.not.have.property('status');",
                                    "    pm.expect(row).to.not.have.property('lastLoginAt');",
                                    "    pm.expect(row).to.not.have.property('twoFactorEnabled');",
                                    "});",
                                ],
                            },
                        }],
                        "request": {
                            "method": "GET",
                            "header": [],
                            "url": {"raw": "{{baseUrl}}/users?limit=3", "host": ["{{baseUrl}}"], "path": ["users"],
                                    "query": [{"key": "limit", "value": "3", "description": "Rows per page, 1-100."}]},
                            "description": (
                                "The same route an administrator uses, returning a different "
                                "shape. A reader without `Manage Users` gets `id`, `email`, "
                                "`firstName`, `lastName`, `role`, `avatarKey` — and nothing "
                                "administrative. Compare with the 200 example on "
                                "`02 · List team members`."
                            ),
                        },
                        "response": captured["deny_list"],
                    },
                    {
                        "name": "04 · Sign back in as administrator",
                        "event": [{
                            "listen": "test",
                            "script": {
                                "type": "text/javascript",
                                "exec": [
                                    "const csrf = pm.cookies.get('tj_csrf');",
                                    "if (csrf) pm.collectionVariables.set('csrfToken', csrf);",
                                    "pm.test('session restored', function () {",
                                    "    pm.response.to.have.status(200);",
                                    "});",
                                ],
                            },
                        }],
                        "request": {
                            "method": "POST",
                            "header": [JSON_HEADER],
                            "url": {"raw": "{{baseUrl}}/auth/login", "host": ["{{baseUrl}}"], "path": ["auth", "login"]},
                            "description": (
                                "Restores the administrator session so the folder can be "
                                "re-run, and so a later folder does not inherit a broker."
                            ),
                            "body": {"mode": "raw", "raw": (
                                "{\n"
                                '  "email": "admin@tribecajets.com",\n'
                                '  "password": "ChangeMe123!"\n'
                                "}"
                            )},
                        },
                        "response": captured["signin"][:1],
                    },
                ],
            },
        ],
    }


def main() -> None:
    if not COLLECTION.exists():
        raise SystemExit(f"collection not found: {COLLECTION}")

    print("Capturing live examples...")
    captured = capture()
    total = sum(len(v) for v in captured.values())
    print(f"  captured {total} examples")

    collection = json.loads(COLLECTION.read_text())
    folder = build_folder(captured)

    items = [i for i in collection["item"] if i.get("name") != folder["name"]]
    # Folders are serial-numbered, so place this one by its own number rather
    # than appending — otherwise a rebuild reorders the collection.
    number = folder["name"].split(" ", 1)[0]
    index = next(
        (n for n, i in enumerate(items) if i.get("name", "").split(" ", 1)[0] > number),
        len(items),
    )
    items.insert(index, folder)
    collection["item"] = items

    names = {v["key"] for v in collection.get("variable", [])}
    for key in ("userId", "invitedUserId", "inviteEmail"):
        if key not in names:
            collection.setdefault("variable", []).append(
                {"key": key, "value": "", "type": "string"}
            )

    COLLECTION.write_text(json.dumps(collection, indent=2) + "\n")
    print(f"Wrote {COLLECTION}")


if __name__ == "__main__":
    sys.exit(main())
