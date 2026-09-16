"""
Adds `05 · Airports` and `06 · Operators` to the collection.

Every example body here is a real response captured from a run against the
seeded database (see the session's capture script) rather than hand-written —
a hand-written example drifts from the API the first time a field changes and
nobody notices, because nothing ever compares them.
"""

import collections
import json
import pathlib

CAP = pathlib.Path("/tmp/claude-1000/-home-roy-Desktop-works-Tribeca-Jets/1033c6ba-031f-4ecc-9c6c-5cd3ee550a1f/scratchpad/cap")
COLLECTION = pathlib.Path("Tribeca-Jets-API.postman_collection.json")

JSON_HEADER = [{"key": "Content-Type", "value": "application/json"}]
CSRF_HEADER = {
    "key": "X-CSRF-Token",
    "value": "{{csrfToken}}",
    "description": "Required on every write. Captured automatically after any login or refresh.",
}
RESPONSE_HEADER = [{"key": "Content-Type", "value": "application/json; charset=utf-8"}]

STATUS_TEXT = {200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request",
               401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict"}


def body(name):
    """A captured response, re-indented so it reads in the Postman pane."""
    return json.dumps(json.loads((CAP / f"{name}.json").read_text()), indent=2)


def url(path, query=None, variables=None):
    raw = "{{baseUrl}}/" + path
    if query:
        raw += "?" + "&".join(f"{q['key']}={q['value']}" for q in query)
    out = collections.OrderedDict()
    out["raw"] = raw
    out["host"] = ["{{baseUrl}}"]
    out["path"] = path.split("/")
    if query:
        out["query"] = query
    if variables:
        out["variable"] = variables
    return out


def example(name, code, capture, method="GET", sent=None, path="", query=None):
    ex = collections.OrderedDict()
    ex["name"] = name
    orig = collections.OrderedDict()
    orig["method"] = method
    orig["header"] = JSON_HEADER if sent else []
    if sent is not None:
        orig["body"] = {"mode": "raw", "raw": sent, "options": {"raw": {"language": "json"}}}
    orig["url"] = url(path, query)
    ex["originalRequest"] = orig
    ex["status"] = STATUS_TEXT[code]
    ex["code"] = code
    ex["_postman_previewlanguage"] = "json"
    ex["header"] = RESPONSE_HEADER
    ex["cookie"] = []
    ex["body"] = "" if capture is None else body(capture)
    return ex


MUTATING = {"POST", "PATCH", "PUT", "DELETE"}


def request(name, method, path, description, *, query=None, variables=None,
            raw=None, responses=(), events=None):
    req = collections.OrderedDict()
    req["name"] = name
    inner = collections.OrderedDict()
    inner["method"] = method
    # CSRF is required by the method, not by the presence of a body: a DELETE
    # carries no payload and still needs the header.
    header = list(JSON_HEADER) if raw is not None else []
    if method in MUTATING:
        header.append(CSRF_HEADER)
    inner["header"] = header
    if raw is not None:
        inner["body"] = {"mode": "raw", "raw": raw, "options": {"raw": {"language": "json"}}}
    inner["url"] = url(path, query, variables)
    inner["description"] = description
    req["request"] = inner
    req["response"] = list(responses)
    if events:
        req["event"] = events
    return req


def fresh_icao_script():
    """Generates an unused ICAO before the create request.

    The collection used to hard-code KBED, which worked only while creating an
    archived code silently revived it. Now that create refuses — correctly —
    a fixed code means the second run of the collection fails against its own
    leftovers. Q-prefixed codes are unassigned in reality, so this can never
    collide with a real airport either.
    """
    return [{
        "listen": "prerequest",
        "script": {"type": "text/javascript", "exec": [
            "// A code this run has not used before. See 05 · Add airport:",
            "// an archived ICAO stays reserved, so a fixed one would 409 on",
            "// the second run rather than exercising the endpoint.",
            "const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';",
            "let code = 'Q';",
            "for (let i = 0; i < 3; i++) {",
            "    code += letters[Math.floor(Math.random() * letters.length)];",
            "}",
            "pm.collectionVariables.set('newAirportIcao', code);",
        ]},
    }]


def capture_created_id(variable, label):
    """Stores the id of the row this folder just created.

    Update and delete must act on that row, not on the first row of the list:
    the list is seeded reference data, and a folder run that quietly soft-deletes
    a real airport is a destructive test dressed as documentation.
    """
    return [{
        "listen": "test",
        "script": {"type": "text/javascript", "exec": [
            f"// The update and delete requests below operate on this new {label},",
            "// so running the folder never touches seeded reference data.",
            "pm.test('created', function () {",
            "    pm.response.to.have.status(201);",
            f"    pm.collectionVariables.set('{variable}', pm.response.json().data.id);",
            "});",
        ]},
    }]


def capture_first_id(variable, label):
    """Stores the first row's id so the detail/update/delete requests have a target."""
    return [{
        "listen": "test",
        "script": {"type": "text/javascript", "exec": [
            "// The detail, update and delete requests below need a real id.",
            "// Taking it from this list keeps the folder runnable end to end",
            f"// without anyone pasting a {label} id by hand.",
            "pm.test('list returned rows', function () {",
            "    pm.response.to.have.status(200);",
            "    const rows = pm.response.json().data;",
            "    pm.expect(rows).to.be.an('array').that.is.not.empty;",
            f"    pm.collectionVariables.set('{variable}', rows[0].id);",
            "});",
        ]},
    }]


BULK_BODY = """{
  // required · 1-100 UUIDs, at least one.
  // Capped at the page size: the checkboxes select within one page, so a
  // longer list did not come from the UI, and an uncapped IN (...) is a way
  // to lock the table from a single request.
  // Duplicates are collapsed rather than rejected.
  "ids": ["{{%s}}"]
}"""

BULK_RESTORE_BODY = """{
  // required · 1-100 UUIDs of archived rows.
  // Ids that are not archived come back in `skipped` rather than failing
  // the batch, so two people restoring the same selection both succeed.
  "ids": ["{{%s}}"]
}"""

PAGINATION_QUERY = [
    {"key": "page", "value": "1",
     "description": "Page number, 1-based. Integer ≥1. Default 1. Out of range returns an empty `data` with a truthful `meta`."},
    {"key": "limit", "value": "10",
     "description": "Rows per page. Integer 1-100. Default 10, matching the rows-per-page dropdown in the UI. >100 or <1 → 400."},
    {"key": "search", "value": "", "disabled": True,
     "description": "Case-insensitive substring. Trimmed, max 200 chars."},
    {"key": "sortOrder", "value": "desc",
     "description": "Allowed (case-sensitive): asc | desc. Default desc — tables open newest-first."},
]

# --------------------------------------------------------------------- airports

AIRPORT_BODY = """{
  // required · 4 letters or digits, stored upper-case.
  // Unique across live AND removed rows → duplicate returns 409.
  "icao": "{{newAirportIcao}}",

  // optional · 3 letters or digits, stored upper-case.
  // Many airports have none, so it is not required and not unique.
  "iata": "BED",

  // required · 1-200 chars
  "name": "Laurence G Hanscom Field",

  // required · 1-120 chars
  "city": "Bedford",

  // optional · max 60 chars. State or region; most countries outside
  // the US do not use one.
  "state": "MA",

  // required · 1-100 chars. Exact string the country filter matches on.
  "country": "USA",

  // optional · signed decimal degrees. latitude -90..90, longitude -180..180.
  // Stored as DECIMAL(9,6) and returned as a JSON number.
  "latitude": 42.4700,
  "longitude": -71.2890,

  // optional · integer feet, 0-30000. Decides which aircraft can operate here.
  "longestRunwayFt": 7011,

  // optional · max 200 chars. The FBO the desk defaults to here.
  "assignedFbo": "Signature Flight Support",

  // optional · max 2000 chars. Curfews, slots, customs hours.
  "notes": "Boston-area business aviation gateway."
}"""

AIRPORT_PATCH_BODY = """{
  // All fields optional · send at least one, or 400.
  // Every field from Create is accepted, including "icao": it is a
  // correctable data-entry mistake, not an identity, and nothing
  // references the code as a foreign key yet. A new code still has to
  // be unique.
  //
  // Nullable fields accept null to clear them: iata, state, latitude,
  // longitude, longestRunwayFt, assignedFbo, notes.

  "longestRunwayFt": 7011,
  "assignedFbo": "Jet Aviation Bedford"
}"""

airports = collections.OrderedDict()
airports["name"] = "05 · Airports"
airports["description"] = (
    "Airports are **shared reference data**: every signed-in caller sees the same rows, "
    "because unlike a client, nobody owns an airport. There is no row-level scoping here — "
    "only whether you may edit the master list.\n\n"
    "### Who may write\n\n"
    "| Role | Read | Create / Edit / Remove |\n|---|---|---|\n"
    "| SUPER_ADMIN, ADMIN, SENIOR_BROKER | ✓ | ✓ |\n"
    "| BROKER, ASSISTANT | ✓ | 403 |\n\n"
    "Brokers and assistants hold `MANAGE_AIRPORTS` at **READ** scope. They must be able to read "
    "the table — a broker cannot build a trip without picking an airport — but an airport is an "
    "objective fact about the world, not desk opinion, and a wrong runway length silently makes a "
    "trip unbookable.\n\n"
    "This folder runs as the seeded owner."
)
airports["item"] = [
    request(
        "01 · List airports", "GET", "airports",
        "Paginated list. Search covers **ICAO, IATA, name, city and country** in one term.\n\n"
        "`latitude` and `longitude` come back as JSON numbers, not the `{s,e,d}` shape a raw "
        "Prisma Decimal would serialise to.\n\n"
        "See the Params tab for every filter, its default and its bounds.",
        query=PAGINATION_QUERY + [
            {"key": "country", "value": "", "disabled": True,
             "description": "Exact match on the stored country string, case-sensitive (`USA`, not `usa`). Options come from `03 · Countries`. Omit for all countries."},
            {"key": "sortBy", "value": "createdAt",
             "description": "Allowed (case-sensitive): createdAt | updatedAt | icao | iata | name | city | country | longestRunwayFt. Default createdAt, paired with sortOrder desc, so a newly added airport is the first row. A closed list — anything else returns 400 rather than reaching the database."},
            {"key": "archived", "value": "false", "disabled": True,
             "description": "Allowed (case-sensitive): true | false. Default false — only live rows. `true` returns ONLY archived ones, which is what the Archived tab reads. One endpoint serves both halves of the table; a separate /archived route would duplicate every filter and sort param and the two would drift."},
        ],
        responses=[
            example("200 · Page of airports", 200, "airports_list", path="airports"),
            example("400 · Unsortable column", 400, "airports_400_sort", path="airports"),
            example("400 · Limit above the cap", 400, "airports_400_limit", path="airports"),
            example("401 · Not signed in", 401, "airports_401", path="airports"),
        ],
        events=capture_first_id("airportId", "airport"),
    ),
    request(
        "02 · Airport stats", "GET", "airports/stats",
        "The four tiles above the table.\n\n"
        "`domestic` counts rows whose country equals `homeCountry`, and `international` is the "
        "remainder. `homeCountry` is returned explicitly rather than assumed by the UI, because "
        "\"domestic\" is meaningless without saying relative to where.\n\n"
        "`withAssignedFbo` ignores rows saved with a blank FBO, not only null ones.",
        responses=[example("200 · Stats", 200, "airports_stats", path="airports/stats")],
    ),
    request(
        "03 · Countries", "GET", "airports/countries",
        "Distinct countries across live airports, alphabetical — the option list for the "
        "`country` filter.\n\n"
        "Served from the data rather than hardcoded in the UI, which previously offered five "
        "countries chosen at design time: wrong the moment anyone adds a sixth, and offering "
        "dead options if one is removed.",
        responses=[example("200 · Countries", 200, "airports_countries", path="airports/countries")],
    ),
    request(
        "04 · Get airport", "GET", "airports/:id",
        "Full record including the `createdBy` / `updatedBy` audit trail.\n\n"
        "A removed airport returns **404**, not a tombstone.",
        variables=[{"key": "id", "value": "{{airportId}}",
                    "description": "UUID. Populated by `01 · List airports`, so this folder runs end to end unattended."}],
        responses=[
            example("200 · Airport", 200, "airports_detail", path="airports/:id"),
            example("404 · Not found", 404, "airports_404", path="airports/:id"),
        ],
    ),
    request(
        "05 · Add airport", "POST", "airports",
        "Creates an airport. Requires `Manage Airports` at write scope — brokers and assistants "
        "receive 403.\n\n"
        "**ICAO is normalised and unique.** It is upper-cased on the way in, so `kteb` and `KTEB` "
        "are the same airport and cannot both exist.\n\n"
        "**Adding a removed airport restores it** rather than returning 409. A soft delete keeps "
        "the code occupied, so refusing would strand the caller: they can see no KBED in the list "
        "and cannot create one either. The revived row keeps its original audit history instead of "
        "starting a second record for the same physical airport, and the audit entry reads "
        "`airport.restored`. The 409 below is for a code held by a **live** airport.",
        raw=AIRPORT_BODY,
        responses=[
            example("201 · Created", 201, "airports_create", method="POST", sent=AIRPORT_BODY, path="airports"),
            example("409 · ICAO already in use", 409, "airports_409", method="POST",
                    sent='{\n  "icao": "KTEB",\n  "name": "Dup",\n  "city": "X",\n  "country": "USA"\n}', path="airports"),
            example("400 · Validation failed", 400, "airports_422", method="POST",
                    sent='{\n  "icao": "TOOLONG",\n  "name": "",\n  "city": "X",\n  "country": "USA"\n}', path="airports"),
            example("403 · Role may read but not write", 403, "airports_403", method="POST",
                    sent=AIRPORT_BODY, path="airports"),
        ],
        events=fresh_icao_script() + capture_created_id("newAirportId", "airport"),
    ),
    request(
        "06 · Update airport", "PATCH", "airports/:id",
        "Partial update. Send only what changes; an empty body returns 400.",
        variables=[{"key": "id", "value": "{{newAirportId}}",
                    "description": "UUID of the airport to update. Populated by `05 · Add airport`, so a folder run never edits a seeded airport."}],
        raw=AIRPORT_PATCH_BODY,
        responses=[
            example("200 · Updated", 200, "airports_update", method="PATCH", sent=AIRPORT_PATCH_BODY, path="airports/:id"),
            example("400 · Empty patch", 400, "airports_400_empty", method="PATCH", sent="{}", path="airports/:id"),
        ],
    ),
    request(
        "07 · Remove airport (soft)", "DELETE", "airports/:id",
        "Soft delete — `deletedAt` is stamped and the row stays.\n\n"
        "Trips and itineraries will reference airports, so destroying one would orphan the "
        "history of every flight through it. The ICAO stays taken; see `05 · Add airport`.",
        variables=[{"key": "id", "value": "{{newAirportId}}",
                    "description": "UUID of the airport to remove — the one `05 · Add airport` just created, so the folder cleans up after itself instead of deleting seeded reference data."}],
        responses=[example("204 · Removed", 204, None, method="DELETE", path="airports/:id")],
    ),
    request(
        "08 · Restore airport", "POST", "airports/:id/restore",
        "Brings an archived airport back **exactly as it was** — clears the deletion "
        "stamp and touches nothing else.\n\n"
        "This is the only way to restore. `05 · Add airport` refuses an archived ICAO "
        "rather than reviving it, because re-running a create form would overwrite "
        "eleven stored fields with whatever was typed into it.\n\n"
        "No conflict check is needed: ICAO is unique across live *and* archived rows, "
        "so nothing can have taken the code while this row held it.\n\n"
        "A row that is not archived returns 404 — restoring something that was never "
        "removed is meaningless, and a 403 would confirm the id exists.",
        variables=[{"key": "id", "value": "{{newAirportId}}",
                    "description": "UUID of the archived airport, from `05 · Add airport`."}],
        responses=[
            example("200 · Restored", 200, "airports_restore_200", method="POST",
                    path="airports/:id/restore"),
            example("404 · Not archived", 404, "airports_restore_404", method="POST",
                    path="airports/:id/restore"),
        ],
    ),
    request(
        "09 · Remove several airports (soft)", "POST", "airports/bulk-delete",
        "Removes every id in one statement, for the table's checkbox column.\n\n"
        "**POST, not DELETE.** Request bodies on DELETE are unevenly supported by "
        "proxies and HTTP clients; a silently dropped body would remove nothing and "
        "still answer 200.\n\n"
        "**Partial success is success.** Ids matching nothing — already removed, or "
        "never there — come back in `skipped` rather than failing the batch. Two "
        "people clearing the same rows is ordinary, and refusing the second one would "
        "make their click do nothing at all.\n\n"
        "Soft delete, like `07`: the rows move to the Archived tab and come back\n"
        "with `10 · Restore several airports`.",
        raw=BULK_BODY % "newAirportId",
        responses=[
            example("200 · Removed", 200, "airports_bulk_200", method="POST",
                    sent=BULK_BODY % "newAirportId", path="airports/bulk-delete"),
            example("200 · Already removed (partial)", 200, "airports_bulk_partial", method="POST",
                    sent=BULK_BODY % "newAirportId", path="airports/bulk-delete"),
            example("400 · Nothing selected", 400, "airports_bulk_400", method="POST",
                    sent='{\n  "ids": []\n}', path="airports/bulk-delete"),
            example("403 · Role may read but not write", 403, "airports_bulk_403", method="POST",
                    sent=BULK_BODY % "newAirportId", path="airports/bulk-delete"),
        ],
    ),
    request(
        "10 \u00b7 Restore several airports", "POST", "airports/bulk-restore",
        "Brings every id in the list back in one statement, for the Archived tab's "
        "checkbox column. The mirror of the bulk remove above.\n\n"
        "**POST, not DELETE**, and **partial success is success** \u2014 the same two "
        "rules. Ids that are not archived come back in `skipped` rather than failing "
        "the batch, so two people restoring the same selection both succeed.\n\n"
        "Restore clears the deletion stamp and touches nothing else, so each row "
        "returns exactly as it was.",
        raw=BULK_RESTORE_BODY % "newAirportId",
        responses=[
            example("200 \u00b7 Restored", 200, "airports_bulk_restore_200", method="POST",
                    sent=BULK_RESTORE_BODY % "newAirportId", path="airports/bulk-restore"),
            example("200 \u00b7 Already live (partial)", 200, "airports_bulk_restore_partial", method="POST",
                    sent=BULK_RESTORE_BODY % "newAirportId", path="airports/bulk-restore"),
            example("400 \u00b7 Nothing selected", 400, "airports_bulk_restore_400", method="POST",
                    sent='{\n  "ids": []\n}', path="airports/bulk-restore"),
            example("403 \u00b7 Role may read but not write", 403, "airports_bulk_restore_403", method="POST",
                    sent=BULK_RESTORE_BODY % "newAirportId", path="airports/bulk-restore"),
        ],
    ),
]

# -------------------------------------------------------------------- operators

OPERATOR_BODY = """{
  // required · 1-200 chars
  "name": "Solairus Aviation",

  // optional · default "ACTIVE"
  // Allowed (case-sensitive): "ACTIVE" | "PREFERRED" | "INACTIVE"
  "status": "ACTIVE",

  // optional · max 120 chars. Free text city, not an airport code —
  // several operators list a city with no single airport.
  "homeBase": "Petaluma, CA",

  // optional · max 200 chars
  "website": "www.solairus.com",

  // optional · the company switchboard, valid when staff change
  "generalEmail": "charter@solairus.com",
  "generalPhone": "+1 (707) 762-8000",

  // optional · the named account manager and their direct line
  "primaryContact": "Dana Ruiz",
  "contactEmail": "druiz@solairus.com",
  "contactPhone": "+1 (707) 762-8011",

  // optional · arrays of strings, max 40 items, each 1-80 chars.
  // Rendered as chips on the operator card.
  "aircraftTypes": ["Gulfstream G450", "Citation X"],
  "serviceRoutes": ["KSFO \\u2194 KTEB", "KVNY \\u2194 KLAS"],

  // optional · number 0-5, one decimal as the card renders it
  "reliabilityRating": 4.5,

  // optional · max 120 chars. A CERTIFICATION, not a number:
  // "ARG/US Platinum", "Wyvern Wingman", "IS-BAO Stage 3".
  "safetyRating": "ARG/US Gold",

  // optional · max 60 chars. Typical quote turnaround, as the desk says it.
  "responseSpeed": "< 25 min",

  // optional · max 120 chars. "Net 30", "Due upon receipt".
  "paymentTerms": "Net 30",

  // optional · max 2000 chars
  "cancellationPolicy": "50% fee within 48 hours of departure.",
  "sourcingNotes": "Strong West Coast coverage; quick to quote on short notice."
}"""

OPERATOR_PATCH_BODY = """{
  // All fields optional · send at least one, or 400.
  // Every field from Create is accepted; nullable ones accept null to clear.
  //
  // Arrays are REPLACED, not merged: the UI edits them as one
  // comma-separated field, so what the user typed is the complete
  // list and a merge would make removing a chip impossible.

  // Allowed (case-sensitive): "ACTIVE" | "PREFERRED" | "INACTIVE"
  "status": "PREFERRED",

  // number 0-5
  "reliabilityRating": 4.7
}"""

operators = collections.OrderedDict()
operators["name"] = "06 · Operators"
operators["description"] = (
    "Charter operators — the companies that actually fly the aircraft. **Shared master data**, "
    "the same rows for every signed-in caller, with no row-level scoping.\n\n"
    "### Who may write\n\n"
    "| Role | Read | Create / Edit / Remove |\n|---|---|---|\n"
    "| SUPER_ADMIN, ADMIN, SENIOR_BROKER, BROKER | ✓ | ✓ |\n"
    "| ASSISTANT | ✓ | 403 |\n\n"
    "Brokers may write here but not in `05 · Airports`: a broker who sources a new operator adds "
    "it themselves, which matches the `Operator Sourcing` permission they already hold at full "
    "scope. Assistants hold `MANAGE_OPERATORS` at **READ**.\n\n"
    "### Fields the UI shows that nothing can supply yet\n\n"
    "`totalTrips`, `totalPaid` and `totalFleet` are aggregates over trips, operator payments and "
    "aircraft — none of which exist. They return **null**, not 0, so the UI can render an honest "
    "em dash: a confident \"0 trips\" against an operator the desk has flown twice is a wrong "
    "answer. Same reason `fleet`, `tripHistory` and `payments` come back as empty arrays on the "
    "detail response.\n\n"
    "This folder runs as the seeded owner."
)
operators["item"] = [
    request(
        "01 · List operators", "GET", "operators",
        "Paginated list. Search covers **name, home base, primary contact and both email "
        "addresses** in one term.\n\n"
        "See the Params tab for every filter, its default and its bounds.",
        query=PAGINATION_QUERY + [
            {"key": "status", "value": "", "disabled": True,
             "description": "Allowed (case-sensitive): ACTIVE | PREFERRED | INACTIVE. Omit for all statuses. Lower-case returns 400 rather than being silently corrected."},
            {"key": "sortBy", "value": "createdAt",
             "description": "Allowed (case-sensitive): createdAt | updatedAt | name | status | reliabilityRating. Default createdAt, paired with sortOrder desc, so a newly added operator is the first row. A closed list — anything else returns 400 rather than reaching the database."},
            {"key": "archived", "value": "false", "disabled": True,
             "description": "Allowed (case-sensitive): true | false. Default false — only live rows. `true` returns ONLY archived ones, for the Archived tab."},
        ],
        responses=[
            example("200 · Page of operators", 200, "operators_list", path="operators"),
            example("400 · Enum is case-sensitive", 400, "operators_400_enum", path="operators"),
        ],
        events=capture_first_id("operatorId", "operator"),
    ),
    request(
        "02 · Operator stats", "GET", "operators/stats",
        "The four tiles above the table. `totalFleet` is null until the Aircraft module exists — "
        "see this folder's description.",
        responses=[example("200 · Stats", 200, "operators_stats", path="operators/stats")],
    ),
    request(
        "03 · Get operator", "GET", "operators/:id",
        "Full record plus the audit trail, and the three empty arrays the detail page's Fleet, "
        "Trips and Payments tabs bind to.\n\n"
        "They are empty arrays rather than omitted keys so those tabs render their own empty "
        "state instead of crashing on undefined.",
        variables=[{"key": "id", "value": "{{operatorId}}",
                    "description": "UUID. Populated by `01 · List operators`, so this folder runs end to end unattended."}],
        responses=[
            example("200 · Operator", 200, "operators_detail", path="operators/:id"),
            example("404 · Not found", 404, "operators_404", path="operators/:id"),
        ],
    ),
    request(
        "04 · Add operator", "POST", "operators",
        "Creates an operator. Requires `Manage Operators` at write scope — assistants receive 403.\n\n"
        "Name is deliberately **not** unique: two genuinely different operators can share a "
        "trading name, and refusing the second would be wrong. Duplicates are a data-quality "
        "question for the desk, not a constraint.",
        raw=OPERATOR_BODY,
        responses=[
            example("201 · Created", 201, "operators_create", method="POST", sent=OPERATOR_BODY, path="operators"),
            example("400 · Validation failed", 400, "operators_422", method="POST",
                    sent='{\n  "name": "",\n  "status": "Active",\n  "contactEmail": "not-an-email",\n  "reliabilityRating": 9\n}',
                    path="operators"),
            example("403 · Role may read but not write", 403, "operators_403", method="POST",
                    sent='{\n  "name": "Nope Air"\n}', path="operators"),
        ],
        events=capture_created_id("newOperatorId", "operator"),
    ),
    request(
        "05 · Update operator", "PATCH", "operators/:id",
        "Partial update. Send only what changes; an empty body returns 400.\n\n"
        "A status change is written to the audit log with its before and after values.",
        variables=[{"key": "id", "value": "{{newOperatorId}}",
                    "description": "UUID of the operator to update. Populated by `04 · Add operator`, so a folder run never edits a seeded operator."}],
        raw=OPERATOR_PATCH_BODY,
        responses=[
            example("200 · Updated", 200, "operators_update", method="PATCH", sent=OPERATOR_PATCH_BODY, path="operators/:id"),
        ],
    ),
    request(
        "06 · Remove operator (soft)", "DELETE", "operators/:id",
        "Soft delete — `deletedAt` is stamped and the row stays.\n\n"
        "Trips, quotes and operator payments will all reference operators, so destroying one "
        "would orphan the history of every flight it operated.",
        variables=[{"key": "id", "value": "{{newOperatorId}}",
                    "description": "UUID of the operator to remove — the one `04 · Add operator` just created, so the folder cleans up after itself instead of deleting seeded master data."}],
        responses=[example("204 · Removed", 204, None, method="DELETE", path="operators/:id")],
    ),
    request(
        "07 · Restore operator", "POST", "operators/:id/restore",
        "Brings an archived operator back exactly as it was. Same contract as "
        "`05 · Airports / 08` — see there for why create never restores.",
        variables=[{"key": "id", "value": "{{newOperatorId}}",
                    "description": "UUID of the archived operator, from `04 · Add operator`."}],
        responses=[
            example("200 · Restored", 200, "operators_restore_200", method="POST",
                    path="operators/:id/restore"),
        ],
    ),
    request(
        "08 · Remove several operators (soft)", "POST", "operators/bulk-delete",
        "Removes every id in one statement, for the table's checkbox column.\n\n"
        "POST rather than DELETE-with-body, and partial success reported rather than "
        "failing the batch — see `05 · Airports / 08` for why on both counts.",
        raw=BULK_BODY % "newOperatorId",
        responses=[
            example("200 · Removed", 200, "operators_bulk_200", method="POST",
                    sent=BULK_BODY % "newOperatorId", path="operators/bulk-delete"),
            example("403 · Role may read but not write", 403, "operators_bulk_403", method="POST",
                    sent=BULK_BODY % "newOperatorId", path="operators/bulk-delete"),
        ],
    ),
    request(
        "09 \u00b7 Restore several operators", "POST", "operators/bulk-restore",
        "Brings every id in the list back in one statement, for the Archived tab's "
        "checkbox column. The mirror of the bulk remove above.\n\n"
        "**POST, not DELETE**, and **partial success is success** \u2014 the same two "
        "rules. Ids that are not archived come back in `skipped` rather than failing "
        "the batch, so two people restoring the same selection both succeed.\n\n"
        "Restore clears the deletion stamp and touches nothing else, so each row "
        "returns exactly as it was.",
        raw=BULK_RESTORE_BODY % "newOperatorId",
        responses=[
            example("200 \u00b7 Restored", 200, "operators_bulk_restore_200", method="POST",
                    sent=BULK_RESTORE_BODY % "newOperatorId", path="operators/bulk-restore"),
            example("200 \u00b7 Already live (partial)", 200, "operators_bulk_restore_partial", method="POST",
                    sent=BULK_RESTORE_BODY % "newOperatorId", path="operators/bulk-restore"),
            example("400 \u00b7 Nothing selected", 400, "operators_bulk_restore_400", method="POST",
                    sent='{\n  "ids": []\n}', path="operators/bulk-restore"),
            example("403 \u00b7 Role may read but not write", 403, "operators_bulk_restore_403", method="POST",
                    sent=BULK_RESTORE_BODY % "newOperatorId", path="operators/bulk-restore"),
        ],
    ),
]

# ------------------------------------------------------------------------ write

collection = json.loads(COLLECTION.read_text(), object_pairs_hook=collections.OrderedDict)

import sys
sys.path.insert(0, ".")
from session_setup import with_session

collection["item"] = [f for f in collection["item"] if f["name"] not in ("05 · Airports", "06 · Operators")]
collection["item"].append(with_session(airports, "owner"))
collection["item"].append(with_session(operators, "owner"))

existing = {v["key"] for v in collection.get("variable", [])}
for key, description in (
    ("airportId", "First airport id from `05 · Airports / 01 · List airports`. Set by that request's test script."),
    ("operatorId", "First operator id from `06 · Operators / 01 · List operators`. Set by that request's test script."),
    ("newAirportId", "The airport created by `05 · Airports / 05 · Add airport`. Update and remove act on this, never on a seeded row."),
    ("newOperatorId", "The operator created by `06 · Operators / 04 · Add operator`. Update and remove act on this, never on a seeded row."),
):
    if key not in existing:
        collection.setdefault("variable", []).append(
            {"key": key, "value": "", "description": description}
        )

COLLECTION.write_text(json.dumps(collection, indent=2, ensure_ascii=True) + "\n")
print("added 05 · Airports (7 requests) and 06 · Operators (6 requests)")
