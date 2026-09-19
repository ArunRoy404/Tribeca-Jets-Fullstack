# Client adjustments — the client's own words, and what each one costs

Thirteen requests, sent by the client in two batches (24 August and 18
September 2026). This file replaces `docs/Client_Adjustments.txt`, which held
the raw messages and nothing else; **every message is reproduced verbatim
below** so the original is not needed.

---

## For the agent — read this before touching anything here

**This file is a live checklist, and keeping it current is part of doing the
work.** It is not a record of a conversation that happened once.

- **Tick the box in the same pass as the code**, exactly as
  `docs/MODULE_FEATURE_STATUS.md` is updated in the same pass as a module.
  A box ticked later is a box ticked from memory.
- **When an item is partly done, say which part.** Several of these split
  across a dependency that has not shipped — #5 covers Clients now and Trips
  when Trips exists, #9 needs Trips before a credit can be applied *to* a trip.
  Write the remainder down under the item rather than ticking it optimistically.
- **The client's words are the specification, and they are quoted, not
  paraphrased.** Where the analysis disagrees with him — #1 and #9 both do —
  the disagreement is stated in the item, not resolved silently. Do not edit
  a quote.
- **Do not reorder the build queue to suit a session.** The order at the bottom
  follows the dependency graph, which is the rule in `AGENTS.md`: if B
  references A, A ships first. An item moved up because it looked quick is how
  a foreign key becomes a string.
- **Two items are deliberately deferred** (§A) at the client's own request —
  Quotes and Itinerary have UI changes coming that these depend on. Leave them.
- **New requests append here.** When the client sends more, they come into this
  file with the same treatment: quoted in full, analysed, placed in the order.

---

## A. Deferred — Quotes / Itinerary

The client has UI changes coming for Quotes and Itinerary. These two depend on
that UI, so they wait for it. **Do not start them.**

### ☐ 3. Aircraft pictures and a stock image library

> And are you gonna add a section for aircraft pictures? It would be cool to
> have a stock image database for when you have to add pics to quote or
> itinerary / and to be able to upload pics from operator email to use for
> quote or itinerary

He names the consumers himself — quote and itinerary.

**This one splits, and the split matters.** The *foundation* is a file-upload
endpoint on top of the storage drivers already merged in `8dc46a1`
(`Backend/src/core/storage/` — local and S3 drivers behind one
`StorageDriver` interface). That is not a quotes feature, and **three other
requests are blocked on the same thing**: #7 (broker tax-form folders), #11's
Resources section, and #11's referral attachment.

✅ **The foundation shipped on 19 September 2026** — see **Done**.
`POST /api/files` with `category=AIRCRAFT_PHOTO` stores a photograph against a
real tail today.

**Still deferred:** the fleet-side uploader and gallery, and the picture-picker
on a quote or an itinerary. Those are the halves that need the pending Quotes
and Itinerary UI.

### ☐ 6. Instant quote calculator with a suggested-price selector

> Also, I want to add an instant quote calculator . I want to be able to put in
> size of plane, airports and such and it give is an estimate of what it could
> cost. I can help with the data or we can use AI, but I want it added- and
> then on this it can have a "suggested price" option where I can select
> different percentages that can make me determine price to client.
>
> We can go over all of this on phone

Pure Quotes. The percentage selector is a markup control over the pricing
engine that already exists in
[quotes.pricing.ts](../Backend/src/modules/quotes/quotes.pricing.ts).

The *estimate* half is a data question before it is a build question — he
offered to supply rates ("I can help with the data"), and scope §18 says AI
must not be the source of truth for financial calculations. **Get the rate
table from him on the call he asked for.** An AI-guessed charter price quoted
down a phone is the same class of mistake as the invented 4.9 safety rating.

---

## B. Already built — needs a demonstration, not code

### ☐ 1. A client stays visible to an admin even after a broker deletes it

> Hi for when a broker like mark for example adds a client in the CRM I wanna
> make sure I will always see that client - even if mark deletes the client .

**This already works, by design.** There is no hard delete anywhere in the
system and no endpoint that offers one. Removing a client stamps `deletedAt`
and `deletedById`; an admin with `ALL` scope sees it in the Archived tab,
together with who removed it and when, and can restore it.

His word "deletes" suggests he expects the record to be gone and is asking for
a safety net that is already under him. **Walk him through the Archived tab
rather than building anything.** The item is ticked when he has seen it, not
when someone has read this paragraph.

### ✅ 8 / 10a. "Active trip request" — a page for trip requests

> If you can pls add a section to CRM called "active trip request"
>
> Just a section where we can mark down anytime someone gives us a trip request

and, from 18 September:

> Trip request page:
> I want there to be a whole page for just trip requests. We get a lot of trip
> requests. But most never get booked. We still want to have access to those
> trip request data just in case in future when we have empty legs that can
> match a previous trip request, we can still contact that client to let them
> know.

**The backend is finished.** The Trip Requests module ships ten endpoints,
the status ladder `OPEN → SOURCING → QUOTED → CONVERTED / LOST`, archive and
restore, bulk actions, and a full Postman folder.

✅ **Done 19 September 2026.** The page exists at `/dashboard/trip-requests`,
with Active / All Requests / Archived tabs. See **Done**.

His "most never get booked, but we still want the data" is precisely why the
module archives rather than deletes, and why `LOST` is a status rather than a
removal. That part is already right.

**The empty-leg matching half is a separate item — see #10b.**

---

## C. Both sides, small

### ✅ 2. Operator cancellation policies

> For operator section, can we add a section for cancellation policies? I want
> to be able to copy and paste each operators cancellation policy to their
> profile

"Copy and paste" is the whole specification: free text, not a structured
penalty schedule.

✅ **Done 19 September 2026** — and it turned out the column, the DTO, the
selects, the form field and the profile card all already existed. The gap was
the two words he emphasised: the field was single-line, so a pasted policy lost
its line breaks. See **Done**.

### ✅ 4. Automatic logout after ten idle minutes

> Can we also make this CRM automatically logout within 10 minutes if it's not
> being touched? For security purposes

Backend: the access-token TTL, and a refresh policy that does not silently
extend a session nobody is using — a refresh token that renews on a timer
rather than on activity defeats the whole request.

Frontend is the larger half: an activity timer, a warning before the session
drops so nobody loses a half-written quote, and a clean teardown through the
existing session logic.

**"Not being touched" means user activity, not network activity.** A dashboard
polling in a forgotten tab must still log out.

### ☐ 9. Client credit / money on account

> For clients - I want a section on their profile that says "credit/money on
> account". So let's say they cancel a trip and they want to keep the money
> they paid on account with us, we can enter how much that is and can always
> edit that number or select if it was used towards another trip.

**Build this as a ledger, not a number** — and this is a place where the build
should not do literally what was asked. He says "edit that number", but he also
says "select if it was used towards another trip", and those two together are
credits and applications: rows, with a balance derived from them.

A single editable balance field loses *why* it changed. On a charter desk,
a client's credit dropping from $18,000 to $6,000 with nothing saying which
trip consumed it is an argument waiting to happen. It is also the exact shape
`AGENTS.md` already forbids: a stored figure beside the parts it is computed
from. The balance is a `SUM` over the ledger, computed on read.

⚠️ **"Used towards another trip" needs Trips to point at.** Ship the
client-scoped credit ledger now; the trip link is the second pass, the day
Trips lands.

---

## D. Both sides, large — new modules

### ☐ 5. Notes on a timeline, for trips and clients

> Also, in the trip section and client CRM section, I want to make sure there
> is a section where I can write notes and add it to a "timeline"
> Do u know what I mean?
>
> I have it on my old CRM

Clients has a single `notes` string today. That is a field, not a timeline —
editing it destroys what it said before.

This needs a polymorphic Note model, and it should **read alongside the
`AuditLog` rows that already exist**: status changes, reassignments and
archives are timeline entries nobody has to type. A timeline that shows only
hand-written notes is half a timeline when the other half is already in the
database.

⚠️ **Trips does not exist.** Ship it for Clients; extend to Trips on its turn.

Design it together with #11's **Agent Update** field — that is the same
feature with a visibility flag, and discovering that after building both is
how two note systems end up in one codebase.

### ◐ 7. A document folder per user, for tax forms

> I want there to be a folder for each broker that I can attach tax forms to
> For example, a broker (mark) makes a commission with us, we need to give him
> a 1099 tax form. I want to be able to add that form into his own personal
> folder.
>
> So each user has a folder that we can add documents to

◐ **The server half is done** — see **Done**. `USER_DOCUMENT` is
exactly this: an administrator files a document against a user, the owner and an
administrator can read it, and another broker gets a 404 rather than a 403, so
they cannot even learn it exists. Verified live.

**What is left is the screen:** a Documents tab on the user profile with an
uploader, the list, and Remove. `GET /api/files?category=USER_DOCUMENT&ownerUserId=<id>`
is the whole data call.

### ☐ 10b. Empty-leg matching against past trip requests

> ...just in case in future when we have empty legs that can match a previous
> trip request, we can still contact that client to let them know.

⚠️ **Blocked on Empty Legs**, which has a frontend folder and no backend at
all. The matching itself is a route-and-date query against archived and lost
trip requests — cheap, once there is something to match against.

### ☐ 11. Referral Agent role and partner portal

> Please create a new CRM user type called Referral Agent. This role should
> have very limited access and function more like a simple partner portal than
> access to the full Tribeca Jets CRM.

**The largest item on this list by a distance — effectively a second product**,
and it should be built last of these, not first.

His full specification, verbatim:

#### Dashboard

> Referral agents should only see information related to their own referrals:
>
> * Total referrals submitted
> * Active referrals
> * Trips booked
> * Completed trips
> * Pending commission
> * Total commission earned
> * Total commission paid

#### Submit Referral

> Create a simple referral submission form with:
>
> * Client name
> * Phone
> * Email
> * Departure airport
> * Arrival airport
> * Departure/return dates
> * Departure time
> * Passenger count
> * Aircraft preference
> * Approximate budget
> * Notes
> * Attachment/upload option
>
> Every referral should automatically be tagged internally with:
>
> Referral Source: [Referral Agent Name]

#### My Referrals

> Referral agents should only be able to view clients/referrals that they
> personally submitted.
>
> Show a simple trip/referral status:
>
> Submitted → Contacted → Quoting → Booked → Completed
>
> Additional statuses:
>
> Lost / Cancelled
>
> Referral agents should NOT see internal CRM notes.
>
> Add a separate Agent Update field that Tribeca brokers/admins can
> intentionally share with the referral agent, for example:
>
> "Client has been contacted and we are currently sourcing aircraft."

#### Commission Center

> Referral agents should be able to view commissions associated only with their
> referrals.
>
> Display:
>
> * Client/trip
> * Trip date
> * Commission structure
> * Estimated commission
> * Final commission
> * Status: Pending / Earned / Paid
> * Payment date
>
> Admin should be able to assign a different commission structure to each
> referral agent, including:
>
> * Percentage of Tribeca profit
> * Flat fee
> * Custom commission amount
>
> Ad admin should be able to go in an set a commission on this as well.

#### Resources

> Create a simple Resources section containing documents/materials uploaded by
> Tribeca Jets, such as:
>
> * Tribeca Jets brochure
> * Aircraft category guide
> * Referral program terms
> * Marketing materials
> * Contact information

#### What a referral agent must never see

> Referral agents should have no access to:
>
> * Other Tribeca clients
> * Other referral agents
> * Operator database
> * Operator contact information
> * Wholesale/operator pricing
> * Tribeca markup
> * Tribeca profit
> * Broker commissions
> * Accounting
> * FET reporting
> * Quote inbox
> * Internal CRM notes
> * Operator sourcing information
> * Operator reliability information
> * Full trip calendar
> * Company revenue/reporting
> * Any trips or clients not associated with their referrals

#### Navigation

> The referral agent portal should only display:
>
> Dashboard | Submit Referral | My Referrals | Commissions | Resources
>
> This user role should be completely separated through permissions from the
> existing Admin and Broker CRM roles.

#### What this actually costs

- **A new `REFERRAL_AGENT` role** in `UserRole`, and a full row in the matrix
  at `Backend/src/common/authorization/permissions.ts`. The seventeen-item
  deny list above maps cleanly onto the three authorization layers already
  built — `VIEW_FINANCIALS` already gates markup, operator cost and margin, and
  the `OWN` scope already means "rows I created". This is the part that is
  cheap *because* the groundwork exists.
- **A new Referral model** with its own status ladder. `Submitted → Contacted
  → Quoting → Booked → Completed` is **not** the Trip Request ladder and must
  not be forced into it — a referral's "Contacted" has no equivalent in
  `OPEN / SOURCING / QUOTED`, and merging them would make one screen lie about
  the other.
- **The Agent Update field** — a deliberately shareable note, beside internal
  notes the agent must never see. Design it with #5.
- **Commission Center** — the Commissions module has a frontend folder and no
  backend. Per-agent structures (percentage of profit / flat fee / custom).
  Note that "percentage of Tribeca profit" reads `grossProfit`, which is the
  figure `VIEW_FINANCIALS` hides from this very role: the agent sees their
  commission, never the profit it was derived from.
- **Resources** — file upload again.
- **A separate navigation shell**, since the portal shows five items and none
  of the CRM's.

⚠️ **Depends on: Trips, Commissions, and file upload.**

---

---

## Done

### ✅ Trip requests page — 19 September 2026

Order item 3, and the request he sent twice.

> If you can pls add a section to CRM called "active trip request"

> I want there to be a whole page for just trip requests. We get a lot of trip
> requests. But most never get booked. We still want to have access to those
> trip request data...

**The API was already finished** — ten endpoints, the
`OPEN → SOURCING → QUOTED → CONVERTED / LOST` ladder, archive and restore, bulk
actions, broker scoping — and so was the frontend's data layer. What did not
exist was the screen. Trip requests were only reachable *inside* Leads & Agents,
which is why he kept asking for them to have a place of their own.

**Three tabs, which is his sentence turned into a control**

| Tab | Sends | Why |
|---|---|---|
| **Active** (default) | `openOnly=true` | "active trip request" — the enquiries still in play |
| **All Requests** | `openOnly=false` | "most never get booked... we still want the data" |
| **Archived** | `archived=true` | rows that should not have been filed at all |

One URL field drives all three, because a request cannot be both the live
working list and the archive — two fields would let a link express a state the
tab strip cannot show.

**The action the page leads with is Mark as Lost, not Remove.** A lost enquiry
leaves the Active tab and stays in the log, which is exactly what makes it
findable when an empty leg matches it later (#10b). Archiving is offered too,
and both the row menu and the bulk dialog say to prefer Lost.

Also: stats tiles (total, open, sourcing, quoted, converted, pipeline value),
search, five filters, a mobile card view below `lg`, bulk archive and restore,
and a sidebar entry between Leads & Agents and Quotes — the order of the
pipeline.

**Permissions**: an enquiry is a stage of a trip, so it borrows the trips
permissions as the API does. A broker files and edits their own; only an
administrator archives. The checkbox column follows `DELETE_TRIPS`, so a role
that cannot act on a selection does not get one.

**Two bugs found and fixed on the way**, both pre-existing:

1. **`CommonDatePicker` emitted `"Aug 12, 2026"`** — a string every date field
   on the API rejects with "Use a YYYY-MM-DD date". Quotes, leads, aircraft
   maintenance and sourcing requests all pass that value straight to the
   server, so **none of their dates could be saved at all**. It now speaks
   `YYYY-MM-DD` in and out and formats the label for reading only, the same
   split as enums. It also opened on a hardcoded August 2026, offered a
   hardcoded "Today (Aug 12)", and highlighted the 1st, 10th and every teens
   date together because it matched by substring. All four fixed in one place.
2. **The sourcing dialog and this page were about to be two copies of the same
   twelve-field form.** Extracted `TripRequestForm` and moved sourcing onto it
   in the same pass.

**Verified:** 18 live assertions — every tab, every filter, dates round-tripping
through create/edit/clear, and Mark as Lost leaving Active while staying in the
log. `next build` clean, oxlint clean, Newman 127 / 56 / 0.

**Still open:** #10b, matching those kept requests against empty legs. The
Empty Legs module has a frontend folder and no backend.

---

### ✅ Ten-minute idle logout — 19 September 2026

Order item 4.

> Can we also make this CRM automatically logout within 10 minutes if it's not
> being touched? For security purposes

**Both halves, because either alone is a half-measure.**

**The browser keeps the precise timer** (`useIdleLogout`), and four things
about it are deliberate:

- **"Touched" means a person, not the network.** Only real input counts, so a
  dashboard polling in a forgotten tab still signs out. `mousemove` is
  excluded — a trackpad nudged by a sleeve is not someone working.
- **A sleeping laptop fires no timers.** Nothing is scheduled for the deadline;
  a one-second tick compares the clock against a stored stamp, so waking after
  three hours signs out immediately rather than eventually.
- **Tabs share a session.** The stamp lives in `localStorage`, so working in
  one tab keeps the others alive instead of an idle one signing everybody out.
- **A minute's warning**, with a countdown and "I'm still here". Signing out
  silently loses a half-written quote.

**The server refuses to refresh a session that has been idle past the limit**,
so switching the timer off in the browser does not buy an endless one. The
signal is the age of the refresh-token row: a rotation only happens once the
access token has expired, so a session in continuous use presents a row at most
one access-token lifetime old, while an abandoned one keeps ageing. Deliberately
approximate and always in the user's favour — it never signs out someone who was
active.

`JWT_ACCESS_TTL` dropped from 15m to 10m to match, and `AUTH_IDLE_TIMEOUT_MINUTES`
is configurable.

**The limit is shipped from `/auth/me`**, not from the frontend's own env — the
same reasoning as the permission matrix. A second copy of the number would
drift from the server's, silently.

The sign-in screen says *why*, from a closed set of reasons. Without it, being
signed out for inactivity is indistinguishable from being signed out by a bug,
and the second reading is the one people reach for.

**Verified:** a 19-minute-old session still refreshes; a 25-minute-old one is
refused with "Signed out after a period of inactivity", and the refusal kills
the session rather than declining one request. `/auth/me` ships
`session.idleTimeoutMinutes`, captured into the Postman examples. 34 tests,
Newman 127 / 56 / 0.

### ✅ Operator cancellation policies — 19 September 2026

Order item 2.

**Most of it was already built** — the `cancellationPolicy` column, the DTO on
create and update, both selects, the mapper, the form field and a CANCELLATION
POLICY card on the operator profile. What was missing was the two words he
emphasised: *copy and paste*.

The field was a **single-line `<input>`** placeholdered "48 hours Notice". A
real policy is pasted out of an operator's email as a tier per line:

```
More than 30 days prior to departure: 10% of the charter price.
14-30 days prior: 25%.
72 hours to 14 days: 50%.
Less than 72 hours: 100%, non-refundable.
```

Pasting that into a one-line input loses the line breaks on the way in, and the
profile card rendered whatever survived as one run-on paragraph. **A 50% band
read as a 25% one over the phone is what this prevents.**

**What changed**

- The form field is a full-width, resizable textarea with a realistic
  multi-line placeholder, so pasting is the obvious thing to do with it
- The profile card renders `whitespace-pre-line`, so tiers stay tiers — and the
  Notes card beside it, which had the same bug, with it
- The cap went from 2,000 to 5,000 characters. A tiered policy plus a
  force-majeure clause exceeds 2,000; it is now sized like a quote's `terms`
  rather than like `paymentTerms`, which really is "Net 30"
- The dialog's two hand-styled `<textarea>` blocks became one `DialogTextarea`,
  extracted on the second copy rather than pasted a third time

**Verified:** 9 live assertions — a pasted policy survives create, detail read,
list read (which is what the edit form prefills from) and clearing; 3,000
characters is accepted where it used to be refused; 5,001 is still refused.
Newman 127 requests / 56 assertions / 0 failures, and the Operators folder
passes alone.

### ✅ File upload — 19 September 2026

Order item 1. Not a request of the client's in its own right; the single piece
of infrastructure four of his requests were queued behind.

**What exists now**

- `POST /api/files` — multipart upload, and **the content type is read from the
  bytes, never from the upload header.** A PNG announced as `application/pdf`
  is stored as a PNG; an HTML file named `.pdf` is stored as `text/plain` and
  served as an attachment with `nosniff`, so a browser downloads it instead of
  running it on the API's own origin. SVG, archives and legacy `.doc`/`.xls`
  are refused outright — the first executes script, the second hides its
  contents from any check, and the third two are byte-identical at the header,
  so nothing can tell them apart.
- **Three categories, and the category is the whole authorization model.** A
  1099 and a marketing brochure are both rows in one table and are not remotely
  the same secret, so the permission that governs a file is a property of the
  file rather than of the route:

  | Category | Who may read | Who may write |
  |---|---|---|
  | `USER_DOCUMENT` | the owner, or `MANAGE_USERS` | `MANAGE_USERS` |
  | `RESOURCE` | everyone signed in | `MANAGE_RESOURCES` (new) |
  | `AIRCRAFT_PHOTO` | `MANAGE_AIRCRAFT` | `MANAGE_AIRCRAFT` |

- **A broker cannot see another broker's tax form, and cannot learn that one
  exists.** Reads that fail answer **404, not 403** — a 403 would confirm the
  row is there and turn a list of user ids into a register of who has been paid.
  Verified live: Mark downloads his own 1099, Barry gets 404 on the detail, 404
  on the download, and it is absent from both his list and his filtered list.
- Archive, restore, bulk archive, bulk restore, rename — and **archiving leaves
  the bytes in storage untouched**, because a restore that could not hand back
  the same file would not be a restore.
- `GET /files/objects/:key` serves driver-managed objects, which is what finally
  makes the existing `avatarKey` column reachable. Permission is re-checked on
  every fetch rather than frozen into a presigned link, and because sessions are
  httpOnly cookies the URL works directly in an `<img src>`.

**Verified:** 34 unit tests · 34 live authorization assertions · Newman 127
requests / 56 assertions / 0 failures, passing alone and twice in a row · 106
OpenAPI operations, none missing a summary, a description or a success schema.

**One thing fixed on the way.** The Files routes hand-write their 403s, because
a permission that depends on the row's category cannot be derived from a guard
decorator. That exposed a bug in the OpenAPI derivation added last week: Nest
only injects a default success response when a controller declares *no*
`@ApiResponse` of its own, so those five routes were published as operations
that could only fail. `describe-responses.ts` now reconstructs the success code
the same way Nest picks it. The fix is general — it protects every future route
that documents a response by hand.

**What this does *not* include:** any screen. No frontend consumes the API yet,
so #7's folder tab, #3's gallery and #11's Resources section each still need
their UI. Thumbnails and image resizing are deliberately deferred until
something renders a gallery.


## The order

Dependency-first, as `AGENTS.md` requires. Cheapest unblocker at the top.

| # | Item | Why here |
|---|---|---|
| 1 | ~~**File upload endpoint**~~ ✅ **API done 19 Sep 2026** | Unblocks #7, #11 Resources, #11 attachments, and #3's foundation. One piece of infrastructure, four dependants. See **Done**, above. |
| 2 | ~~**#2 Operator cancellation policy**~~ ✅ **19 Sep 2026** | Took a textarea, not a column — see **Done**. |
| 3 | ~~**#8 / #10a Trip requests page**~~ ✅ **19 Sep 2026** | Frontend only — the API was already finished. |
| 4 | ~~**#4 Ten-minute idle logout**~~ ✅ **19 Sep 2026** | Enforced on both sides — see **Done**. |
| 5 | **#1 Demonstrate the Archived tab** | No code. Do it on the next call. |
| 6 | **#5 Notes timeline** | Clients now, Trips on its turn. |
| 7 | **#9 Client credit ledger** | Client-scoped now, trip link when Trips lands. |
| 8 | **#7 User document folders** | ◐ API done — the Documents tab on the user profile is what remains. |
| 9 | **Trips** | Not a client request — but it still unblocks nine modules, and both #5 and #9 are waiting on it. |
| 10 | **#10b Empty-leg matching** | After Empty Legs has a backend. |
| 11 | **#11 Referral Agent portal** | Last. Needs Trips, Commissions and upload all in place. |
| — | **#3, #6** | Deferred at the client's request until the Quotes and Itinerary UI changes land. |

---

## Two things to raise with him

1. **#1 may already be closed.** He is describing a data-loss risk that cannot
   happen here. Five minutes on the Archived tab may settle it outright.
2. **#6 needs his rate data**, and he offered it — "I can help with the data".
   He also asked for a call. Take it, and come back with the numbers rather
   than an AI estimate.
