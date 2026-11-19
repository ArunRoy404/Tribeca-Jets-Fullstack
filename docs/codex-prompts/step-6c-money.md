# Codex prompt — WhatsApp assistant, step 6c: money

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste this short launcher:

```
Read docs/codex-prompts/step-6c-money.md and carry out everything below
the "---" line in it. That file is your full brief.

Before starting, read AGENTS.md (parts one and two),
docs/WHATSAPP_AI_INTEGRATION.md, and every file in
Backend/src/modules/whatsapp/.

Non-negotiable:
- Never run git commit, push, stash, reset, or anything else that changes git
  history or the index. Leave all changes uncommitted.
- No live calls to Meta, OpenAI or any external service. Do not open, print
  or copy Backend/.env. Tests stub every service.
- No npm install. No database, no migration — this step changes no schema.
- If anything in the brief doesn't match the code, stop and report it rather
  than guessing or inventing a value.

Run the §7 commands exactly as written and finish with the §7 report.
```

---

You are implementing **step 6c** of the Super Admin's WhatsApp assistant in
the Tribeca Jets Command Center. Steps 1–5, 6a (sales desk) and 6b
(operations) are built, reviewed and live. 6c adds the money reads. Another
engineer will review your work line by line against `AGENTS.md`.

## 0. Ground rules

1. **Read first, in full:** `AGENTS.md` parts one and two — especially "The
   WhatsApp assistant is one phone…", "A balance is summed, never stored —
   and money is counted in cents" and "A computed state is filtered by
   computing it" — `docs/WHATSAPP_AI_INTEGRATION.md`, every file in
   `Backend/src/modules/whatsapp/`. Then the services and DTOs §2 names.
   **6a and 6b's tools are the pattern** — match their style, comment
   density and naming exactly.
2. **Never run** anything that changes git history or the index.
3. **Stop and report instead of guessing** when the code differs from this
   brief.
4. **Do not open `Backend/.env`.** `npm test` runs `prisma generate`, which
   loads it through `dotenv`; that is the tool reading its config, not you.
5. NestJS 12, TypeScript, ESM (every relative import ends in `.js`), vitest,
   oxlint, Zod 4. Never edit `src/generated/`. No new package.
6. **Read tools only. No frontend, no Postman, no schema, no migration, no
   new HTTP route, no change to any service outside `whatsapp/`** — except
   exporting an existing service from its module for injection, as 6b did
   for `FlightTrackingService`. If a tool needs anything more, or a
   service's `where` looks like a search could widen a caller's reach, stop
   and report it.

## 1. The rules every tool follows (as 6a and 6b)

- **An explicit permission** on the definition; a second module read inside
  `run` is checked too with `canDo`.
- **Through the owning service**, with its own query schema's `.parse(...)`.
  Never Prisma from the bot. Never sum, subtract or derive a figure in the
  bot — **every total, balance and state comes from the service**.
- **An explicit field allowlist** — a small Zod row schema per tool, only
  the fields listed below. No ids except where the table says.
- **At most ten rows** plus `total`; the summary tools return one object.
- **Money:** every amount formatted with `formatDollars(toCents(...))`
  (lift the `formatPrice` helper 6b wrote if it fits). A `null` figure stays
  `null` — "not on file", never `$0.00`. A figure the service left
  `undefined` for this caller is absent from the result.
- **Dates:** a calendar day as `YYYY-MM-DD` (`isoDay`); a moment through
  `formatMomentIn(value, context.timeZone)`. A window the model gives is
  `YYYY-MM-DD` dates it works out from the Now line.
- **States are the service's** (`InvoiceState`, `PayableState` — DUE,
  OVERDUE, PARTIALLY_PAID…), computed from the payments and today. Pass the
  state the service returned; never work out "overdue" in the bot.

## 2. The six tools

| Tool | Args (Zod, `.strict()`) | Calls | Permission | Returns |
|---|---|---|---|---|
| `list_invoices` | `state?` (`InvoiceState`), `open?` (boolean — still owed), `search?` (2–100) | `ReceivablesService.findAll`; with neither `state` nor `open`, `open: true`; `limit: 10` | `RECEIVABLES · VIEW` | invoice number, client, trip reference, state, total, paid, balance, due date |
| `list_operator_bills` | `state?` (`PayableState`), `open?` (boolean), `search?` (2–100) | `OperatorPaymentsService.findAll`, same defaults, `limit: 10` | `OPERATOR_PAYMENTS · VIEW` | bill reference (`OP-…`), operator, trip reference, state, amount, paid, balance, due date |
| `client_credit` | `clientId` (uuid — from `find_client`) | `ClientCreditsService.summary(user, clientId)` | `CLIENTS · VIEW` (the service also refuses roles that may not see a balance — let its error through) | the balance, total credited, total applied (whatever `summary` returns, formatted), entry count, last movement day |
| `list_commissions` | `status?` (`CommissionStatus`, default `EARNED` — owed and not paid), `search?` (2–100) | `CommissionsService.findAll`, `limit: 10` | `COMMISSIONS · VIEW` | recipient (name / company), recipient type, trip reference, status, amount, paid date if any |
| `recent_transactions` | `from?`, `to?` (`YYYY-MM-DD`, at most 31 days apart; default the last 7 days in the asker's zone), `direction?` (`MovementDirection`), `kind?` (`MovementKind`) | `TransactionsService.findAll`, newest first, `limit: 10` | `TRANSACTIONS · VIEW` | date, kind, direction, amount, counterparty, reference(s) as the ledger row names them |
| `financial_summary` | `from`, `to` (`YYYY-MM-DD`, required, at most 366 days apart) | `ReportsService.summary(user, { from, to })` | `REPORTS · VIEW` | the window, revenue, profit, margin, FET charged, trip count, averages, collected in the window, outstanding receivables and payables today — as the service names them, formatted |

Notes for each:

- **`list_invoices` / `list_operator_bills`** — check how `state` and
  `open` combine in each service (the DTO says both must hold) and what
  `open` means exactly; describe it in the tool description in the
  service's own words. The invoice and bill numbers are the formatted
  `INV-2026-0042` / `OP-2026-0045` the services already produce — use
  their helper, never rebuild the string.
- **`client_credit`** — `summary` resolves the client through
  `ClientsService.subjectRef` (reach and 404). An unknown or unreachable
  client is `{ error }` through the dispatcher. Read `CreditSummary` for
  the real field names. Its description says to get the id from
  `find_client` first.
- **`list_commissions`** — read the row's real fields for the recipient
  (`recipientName`, `recipientCompany`, a user or a client); return a name,
  not ids. Never return the trip's pricing (the service does not, and the
  tool must not add it).
- **`recent_transactions`** — the ledger's movement shape is
  `common/money/movements.ts`; read it for the real field names. A window
  wider than 31 days is refused by the args schema.
- **`financial_summary`** — revenue and profit count by **departure day**,
  collected by **payment day**, outstanding **as of today** (AGENTS.md,
  "Which date a money figure counts by"). The description says so, so the
  model words it right. "This month", "Q3", "last year" are worked out by
  the model from the Now line into `from`/`to`.

## 3. The agent's instructions

One line in `whatsapp.agent.ts`'s instructions: money figures come only
from the tools; never add, subtract or estimate one, and say which dates a
figure counts by when the tool says so. **Do not say they arrive
formatted** — `dashboard_kpis` still returns plain numbers, and the
existing line ("money as the tool gives it, with thousands separators")
covers both. `dashboard_kpis` and its tests stay exactly as they are.
Nothing else changes there.

## 4. What must not change

- The gates, CONFIRM, the pending rules, PDFs and every existing tool.
- Nothing logs message text, arguments or results.
- No tool returns a field the table does not list.

## 5. Tests — `whatsapp.tools.spec.ts`

Every case must exist and pass (stub the services, as 6a/6b do):

- **each tool** calls its service with exactly the query described (assert
  the parsed object, including the `open: true` default and the default
  7-day window in the context's zone — use a clock where the zone's day
  differs from the UTC day);
- **each tool** returns only allowlisted fields — feed an extra field
  carrying `secretMarker` and assert the JSON lacks it;
- **without its permission** each tool returns not permitted and never calls
  the service;
- money formatted (`$35,935.10`); a `null` figure stays `null`; a figure
  the service left `undefined` is absent;
- the service's state is passed through unchanged (feed `OVERDUE`, get
  `OVERDUE`) — the bot computes nothing;
- `recent_transactions` refuses a 32-day window; `financial_summary`
  refuses a 367-day window and a `from` after `to` — no service call;
- `client_credit`: a service 404 comes back as `{ error }`.

## 6. Docs (same pass)

- `docs/WHATSAPP_AI_INTEGRATION.md` §6: mark 6c `🔍 <date> — built by
  Codex, awaiting review` with the test counts.
- `docs/MODULE_FEATURE_STATUS.md`, "WhatsApp assistant": a Working line for
  the six money reads; the "More tools" waiting row now says 6d.
- Do **not** edit `HANDOFF.md` or `AGENTS.md`.

## 7. Done

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
