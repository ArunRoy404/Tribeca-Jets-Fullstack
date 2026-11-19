# Codex prompt — WhatsApp assistant, step 5: PDFs in the chat

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-5-pdfs-in-the-chat.md and carry out
everything below the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (parts one and two),
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env. Tests stub fetch.
- No npm install. No database, no migration — this step changes no schema.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §8 commands exactly as written and finish with the §8 report.
```

---

You are implementing **step 5 of 7** of the Super Admin's WhatsApp assistant
in the Tribeca Jets Command Center. Steps 1–4 and the time-zone pass are
built, reviewed and live. Another engineer will review your work line by
line against `AGENTS.md`, so precision matters more than speed.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two,
   `docs/WHATSAPP_AI_INTEGRATION.md`, every file in
   `Backend/src/modules/whatsapp/`, and `src/scripts/whatsapp-ask.ts`.
   Match their style, comment density and naming exactly.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, and
   `prisma7.config.ts` loads `.env` through `dotenv`: that is fine — the
   tool reading its config, not you. Run §8's commands as written; no
   workarounds.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`. Node 22's global `fetch`,
   `FormData` and `Blob` — no new package.
6. **No frontend, no Postman, no schema, no migration, no new HTTP route.**
   The one change outside the WhatsApp module is §2 (quote search).

## 1. What step 5 is

"Send me the itinerary for TJ-1048", "the quote Q-1042", "invoice
INV-2026-0042" → the bot replies with a short text **and the PDF as a
WhatsApp document**, the same file the web app's Download button gives.

- **The PDFs already exist.** Each owning service has
  `renderPdf(user, id) → { body: Buffer, contentType, filename }`:
  `ItinerariesService.renderPdf` (and `renderPdfForTrip(user, tripId)`,
  `null` when the trip has no live itinerary), `QuotesService.renderPdf`,
  `ReceivablesService.renderPdf`. Call them; never build a PDF here.
- **Sending a document is a read, not an action** — no CONFIRM. Like any
  other message, a document request still cancels a pending action (step 4).
- **The bytes never go to OpenAI.** The tool returns only a short marker to
  the model (`{ attached: "Itinerary-TJ-1048.pdf" }`); the PDF travels in the
  agent's own context to the sender.
- **No tool sends.** As today, only `WhatsappService` sends, and only to the
  number that passed the gates. The agent returns the documents with the
  reply; the service sends them.

## 2. Quote numbers in the Quotes module

`QuotesService.findAll`'s `search` does not match a quote's reference, so
"Q-1042" finds nothing. **The scope bug you found is fixed already** (19
Nov, by the reviewer): visibility and search used to be spread side by side
as two `OR`s, so the search replaced the visibility and a limited broker saw
every quote. They are now `AND: [this.visibilityScope(user),
this.searchWhere(query.search)]`, with the search in its own private
`searchWhere`, pinned by `quotes.scope.spec.ts`. Do not undo that.

Add the reference **inside `searchWhere`'s `OR`**, as Trips and Tasks do:
`...(reference !== null ? [{ reference }] : [])` with
`referenceFromSearch(search, 'Q')` from `common/database/document-number.ts`.
Because the search is ANDed with visibility, a quote number only ever finds
a quote the caller may already see. Read how `Quote.reference` and the `Q-`
label are formed first (the PDF is named `Quote-Q-<reference>.pdf`) and
report if they differ. Add a quotes test that `Q-1042`, `q1042` and `1042`
match reference 1042, and that the visibility clause is still the first
`AND` member when searching by number.

## 3. The sender — `whatsapp.sender.ts`

Add `sendDocument(to, file: { body: Buffer; filename: string; contentType:
string }, caption?: string, replyTo?: string): Promise<boolean>`:

1. **Upload** — `POST https://graph.facebook.com/<v>/<phoneNumberId>/media`,
   `multipart/form-data` with `messaging_product=whatsapp`,
   `type=<contentType>`, and `file` (a `Blob` of the body, with the
   filename). Read `id` from the JSON answer. Build the URL beside
   `messagesUrl` (same style).
2. **Send** — `POST …/messages` with
   `{ messaging_product: 'whatsapp', recipient_type: 'individual', to,
   type: 'document', document: { id, filename, caption? }, context? }`.
3. Same rules as `sendText`: 10 s timeout per request (an upload may take
   longer — use 30 s for the upload only, as a named constant), one retry
   only on network error / timeout / 429 / 5xx, **never throws**, `false`
   on failure, code 190 logged with the renew-token line.
4. **Logging:** status and Meta's error code fields only, plus the size in
   KB. **Never** the filename, the caption, the body, the token, Meta's
   `error.message`, or more than the last four digits of the number. (A
   filename carries a client's trip or invoice number.)
5. Refuse without calling `fetch` when `config.whatsapp` is null, or when
   the body is over `MAX_DOCUMENT_BYTES` (10 MB — well under Meta's
   document limit; log the size only).

Refactor the retry loop into one private helper both methods use rather
than writing it twice.

## 4. Tools — `whatsapp.tools.ts`

Three read tools, each with an explicit permission like every read tool:

| Tool | Args | Resolves through | Permission |
|---|---|---|---|
| `send_itinerary` | `{ trip }` — `TJ-1048` or `1048` | step 4's `resolveTrip`, then `ItinerariesService.renderPdfForTrip(user, trip.id)`; `null` → `{ error: 'No itinerary on file for TJ-1048' }` | `ITINERARIES · VIEW` (the trip lookup also needs `TRIPS · VIEW`: check both) |
| `send_quote` | `{ quote }` — `Q-1042` or `1042` | `QuotesService.findAll({ search })` with §2, exactly one row whose reference matches (reuse `exactMatches`) | `QUOTES · VIEW` |
| `send_invoice` | `{ invoice }` — `INV-2026-0042` | step 4's invoice resolution (reuse it — lift it into a helper both `record_payment` and this use) | `RECEIVABLES · VIEW` |

Each tool, on success:

- puts `{ body, filename, contentType }` into a new `ToolContext.documents`
  array (created by the agent), and
- returns to the model only `{ attached: filename }`.

At most **three documents per reply**: a fourth returns
`{ error: 'Three documents per message — ask for the rest next' }` and
renders nothing. Asking for the same document twice in one reply attaches
it once.

Descriptions say the tool sends the PDF to the Super Admin's WhatsApp, and
that the model should say in one short line what it attached — never
repeat the document's contents.

## 5. The agent and the service

- `WhatsappAgent.reply` returns `{ text: string; documents: Document[] }`
  instead of a string. Every path that returns text today returns
  `{ text, documents: [] }`, except the model's final answer, which carries
  `context.documents`. A proposal (step 4) or CONFIRM never carries
  documents.
- `WhatsappService.handle`: send the text first (as today), then each
  document with `sendDocument(message.from, doc, undefined, message.id)`.
  If one fails, send one short text: `I couldn't send <filename> — please
  ask again.` (the filename is fine in a message to the Super Admin; it is
  logs that must not carry it). A failed document never cancels anything
  and never throws.
- **Memory** keeps the text reply only, never a document or its bytes.
- `src/scripts/whatsapp-ask.ts`: print the text, then one line per
  document — `[document: Itinerary-TJ-1048.pdf, 84 KB]` — so the feature
  can be tried from the terminal without Meta. It does not write the file.

## 6. What must not change

- The gates, the CONFIRM flow, the pending rules and every existing tool.
- Nothing logs message text, document contents, filenames or captions.
- The model never receives PDF bytes or the document's contents.

## 7. Tests

Every case must exist and pass:

**Sender** (stub `fetch`)
- `sendDocument` uploads to exactly `…/v25.0/<phoneNumberId>/media` as
  multipart with `messaging_product`, `type` and the file, then posts the
  document message with the returned id, filename and `context` when
  `replyTo` is given; two calls; `true`.
- upload 500 then 200 → retried; upload 400 → `false`, no send call;
  send 429 then 200 → retried; network error twice → `false`.
- over 10 MB → `false`, `fetch` never called; no config → `false`.
- **no log line contains** the filename, the caption, the token, Meta's
  `error.message` or the full number (distinctive strings, all logger
  methods).
- `sendText` still behaves exactly as before (existing tests unchanged).

**Tools**
- each tool renders through its owning service with the resolved id and
  puts the file in `context.documents`; the model's result is only
  `{ attached }` — assert the result JSON contains no byte data;
- unknown reference / two matches → `{ error }`, nothing attached;
- no itinerary for the trip → the named error;
- without the permission (each tool; and `send_itinerary` without
  `TRIPS · VIEW`) → not permitted, no render call;
- a fourth document → error; the same document twice → attached once.

**Quotes** — §2's search test.

**Agent / service**
- a reply with documents returns them; text-only paths return `[]`;
- the service sends the text, then each document, all to `message.from`;
- a failed document → the "couldn't send" text, `handle` resolves;
- memory saves only the text;
- a document request while an action is pending cancels it (the existing
  prefix appears).

## 8. Docs (same pass) and done

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: step 5's state → `🔍 <date> —
  built by Codex, awaiting review` with the test counts.
- `AGENTS.md`, "The WhatsApp assistant is one phone…": **one** bullet — a
  document is rendered by its owning service, attached through the agent's
  context and sent by `WhatsappService` to the gated number; its bytes never
  reach OpenAI and its filename never reaches a log.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": move "PDFs in the
  chat" from Waiting to Working as built.
- Do **not** edit `HANDOFF.md`.

Run from `Backend/` and paste the output:

```
npm run lint          # oxlint, 0 errors
npx tsc --noEmit      # 0 errors
npm test              # all files pass; report file and test counts
```

Then a short report:

1. Files created / changed (one line each).
2. Anything in this brief that did not match the code, and what you did.
3. Any decision you made that the brief did not cover.
4. Confirmation that nothing was committed and `.env` was not opened
   (`git status`).
