"""
Moves JSON-body comments to the right of the field they describe.

Bodies were written with the comment above its field:

    {
      // required · 1-200 chars
      "name": "Solairus Aviation",

…which reads fine in a text editor and badly in Postman's body pane, where a
ten-field request became forty lines of mostly commentary and the actual JSON
had to be hunted for. Trailing comments keep the shape of the object visible:

    {
      "name": "Solairus Aviation",   // required · 1-200 chars

A multi-line comment block is joined onto one line with a plain space, since
it is almost always one sentence wrapped for width — joining with a separator
would cut it in half ("most countries outside · the US do not use one"). Comments
that introduce a *group* of fields rather than a single one — a block followed
by a blank line, or by another comment with no field between — are left where
they are, because they do not belong to any one field.

Run after the folder builders; it rewrites the collection in place and is safe
to run repeatedly (a body that already has trailing comments is left alone).
"""

import collections
import json
import pathlib
import re

COLLECTION = pathlib.Path("Tribeca-Jets-API.postman_collection.json")

FIELD = re.compile(r'^\s*"[^"]+"\s*:')
COMMENT = re.compile(r"^\s*//\s?(.*)$")
# A commented-out example field ("// \"assignedBrokerId\": \"…\"") is sample
# JSON, not prose about the line below it.
COMMENTED_FIELD = re.compile(r'^\s*//\s*"[^"]+"\s*:')


# Roughly where the original comments were hand-wrapped. A line at least this
# long ran out of room; a shorter one ended because the author was done.
WRAP_WIDTH = 48


def join_comment(parts: list[str]) -> str:
    """Folds a wrapped comment block back into one line.

    Two cases have to be told apart, because the source drops a line break for
    both. A sentence broken for width needs a plain space, or it reads as
    "most countries outside · the US do not use one". Two separate clauses need
    a separator, or they run together as "default false true extends...".

    The tell is why the previous line ended: terminal punctuation or a long
    line means it was wrapped, anything shorter means the thought finished.
    """
    parts = [p for p in parts if p]
    if not parts:
        return ""

    joined = parts[0]
    for previous, part in zip(parts, parts[1:]):
        # Measured against the ORIGINAL line, not the joined string: the source
        # lines already contain " · " separators of their own, and splitting on
        # those would measure a fragment rather than the line that got wrapped.
        wrapped = previous.endswith((".", ",", ":", ";")) or len(previous) >= WRAP_WIDTH
        joined += (" " if wrapped else " · ") + part
    return joined


def rewrite(raw: str) -> str:
    lines = raw.split("\n")
    out: list[tuple[str, str]] = []   # (code, comment)
    pending: list[str] = []

    for line in lines:
        comment = COMMENT.match(line)

        if comment and not COMMENTED_FIELD.match(line):
            pending.append(comment.group(1).strip())
            continue

        if FIELD.match(line):
            out.append((line.rstrip(), join_comment(pending)))
            pending = []
            continue

        # Anything else — a brace, a blank line, a commented-out example —
        # ends the run and keeps whatever was collected where it stood.
        for text in pending:
            out.append((f"  // {text}".rstrip(), ""))
        pending = []
        out.append((line.rstrip(), ""))

    for text in pending:
        out.append((f"  // {text}".rstrip(), ""))

    # Align the comment column across the body so the eye can follow it down
    # the right-hand side, but only over fields that actually carry one.
    width = max(
        (len(code) for code, note in out if note),
        default=0,
    )
    return "\n".join(
        f"{code.ljust(width)}  // {note}" if note else code for code, note in out
    )


def walk(items, changed):
    for item in items:
        if "item" in item:
            walk(item["item"], changed)
            continue

        request = item.get("request", {})
        body = request.get("body") or {}
        if body.get("mode") == "raw" and "//" in (body.get("raw") or ""):
            body["raw"] = rewrite(body["raw"])
            changed.append(item["name"])

        for example in item.get("response", []) or []:
            original = example.get("originalRequest", {}) or {}
            ex_body = original.get("body") or {}
            if ex_body.get("mode") == "raw" and "//" in (ex_body.get("raw") or ""):
                ex_body["raw"] = rewrite(ex_body["raw"])


if __name__ == "__main__":
    collection = json.loads(COLLECTION.read_text(), object_pairs_hook=collections.OrderedDict)
    changed: list[str] = []
    walk(collection["item"], changed)
    COLLECTION.write_text(json.dumps(collection, indent=2, ensure_ascii=True) + "\n")
    print(f"rewrote {len(changed)} request bodies:")
    for name in changed:
        print(" ", name)
