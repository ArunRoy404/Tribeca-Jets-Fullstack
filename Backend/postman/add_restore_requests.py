"""
Adds the restore endpoints to the Users and Clients folders.

Those two folders predate the reference-data builder and live in the committed
collection rather than being generated, so they are patched in place. Run after
`build_reference_folders.py` and before `rewrite_body_comments.py`.
"""

import collections
import json
import pathlib

CAP = pathlib.Path("/tmp/claude-1000/-home-roy-Desktop-works-Tribeca-Jets/1033c6ba-031f-4ecc-9c6c-5cd3ee550a1f/scratchpad/cap")
COLLECTION = pathlib.Path("Tribeca-Jets-API.postman_collection.json")

ARCHIVED_PARAM = {
    "key": "archived",
    "value": "false",
    "disabled": True,
    "description": (
        "Allowed (case-sensitive): true | false. Default false — only live rows. "
        "`true` returns ONLY archived ones, which is what the Archived tab reads. "
        "Replaces the old `includeDeleted`, which used a coercion where the string "
        "\"false\" evaluated to true — so asking to exclude removed rows included them."
    ),
}


def example(name, code, capture, path):
    ex = collections.OrderedDict()
    ex["name"] = name
    ex["originalRequest"] = collections.OrderedDict([
        ("method", "POST"), ("header", []),
        ("url", {"raw": "{{baseUrl}}/" + path, "host": ["{{baseUrl}}"], "path": path.split("/")}),
    ])
    ex["status"] = {200: "OK", 404: "Not Found"}[code]
    ex["code"] = code
    ex["_postman_previewlanguage"] = "json"
    ex["header"] = [{"key": "Content-Type", "value": "application/json; charset=utf-8"}]
    ex["cookie"] = []
    ex["body"] = json.dumps(json.loads((CAP / f"{capture}.json").read_text()), indent=2)
    return ex


def restore_request(name, resource, variable, description, capture):
    req = collections.OrderedDict()
    req["name"] = name
    inner = collections.OrderedDict()
    inner["method"] = "POST"
    inner["header"] = [{
        "key": "X-CSRF-Token", "value": "{{csrfToken}}",
        "description": "Required on every write. Captured automatically after any login or refresh.",
    }]
    inner["url"] = collections.OrderedDict([
        ("raw", "{{baseUrl}}/" + resource + "/:id/restore"),
        ("host", ["{{baseUrl}}"]),
        ("path", resource.split("/") + [":id", "restore"]),
        ("variable", [{"key": "id", "value": "{{" + variable + "}}",
                       "description": "UUID of the archived record."}]),
    ])
    inner["description"] = description
    req["request"] = inner
    req["response"] = [example("200 · Restored", 200, capture, f"{resource}/:id/restore")]
    return req


collection = json.loads(COLLECTION.read_text(), object_pairs_hook=collections.OrderedDict)


def folder(prefix):
    return [f for f in collection["item"] if f["name"].startswith(prefix)][0]


USERS_DESC = (
    "Brings an archived team member back.\n\n"
    "**They return `SUSPENDED`, never `ACTIVE`.** Removing someone revoked every session "
    "they had; un-archiving the row must not quietly hand sign-in back. Reactivating is a "
    "separate, visible decision — the same rule that stops a password reset from clearing "
    "a suspension.\n\n"
    "Clears `deletedAt`/`deletedById` and stamps `restoredAt`/`restoredById`. Every other "
    "field comes back untouched. A row that is not archived returns 404.\n\n"
    "There is **no permanent delete** anywhere in this API."
)
CLIENTS_DESC = (
    "Brings an archived client back, exactly as it was — clears the deletion stamp and "
    "touches nothing else.\n\n"
    "Scoped like every other client read: a broker may restore only a client that was "
    "theirs, and anything outside their scope is a 404 rather than a 403, so an id cannot "
    "be used to probe for records.\n\n"
    "There is **no permanent delete** anywhere in this API."
)

# Users are absent on purpose: staff accounts are never removed — suspending is
# the way out — so there is no archived half of that list and nothing to restore.
for prefix, resource, variable, desc, capture, name in [
    ("03", "clients", "clientId", CLIENTS_DESC, "clients_restore_200", "06 · Restore client"),
]:
    f = folder(prefix)
    f["item"] = [r for r in f["item"] if "Restore" not in r["name"]]
    f["item"].append(restore_request(name, resource, variable, desc, capture))

    # `archived` on the list request, replacing includeDeleted.
    listing = f["item"][0]
    query = listing["request"]["url"].setdefault("query", [])
    query[:] = [q for q in query if q.get("key") not in ("includeDeleted", "archived")]
    query.append(ARCHIVED_PARAM)
    raw = listing["request"]["url"]["raw"]
    listing["request"]["url"]["raw"] = raw.replace("includeDeleted=false", "archived=false")

COLLECTION.write_text(json.dumps(collection, indent=2, ensure_ascii=True) + "\n")
print("added restore to Clients, and the archived param")
