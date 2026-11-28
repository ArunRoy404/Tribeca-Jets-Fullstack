# Codex prompt — Feedback B4: trip data

Start a **new** Codex chat (GPT-6.1 Sol, high effort, "Ask for approval"),
opened on the repository root, and paste the launcher from the reply that
pointed you here.

---

## What this batch is

Five items that put the data the desk actually works with on quotes, trips
and requests. **One migration** (five nullable columns). Items are mostly
independent: if one does not match the code, report it and carry on with the
rest. The tracker and the plan are `docs/FEEDBACK_TRACKER.md` (Round 3 table,
§2.2, decisions D15–D17) and `docs/FEEDBACK_IMPLEMENTATION_PLAN.md` (B4).

| ID | Item |
|---|---|
| R3-04 | Quote interior photo beside the exterior one, both on the preview and PDF; a trip booked from the quote offers both to its itinerary |
| R3-05 | Passenger weight (lb), optional, per passenger |
| R3-06 | Luggage (bag count, total weight in lb) on the trip and the trip request |
| R2-T1 | Convert to Trip on a trip request, through the existing new-trip form |
| R2-T4 | Saved passengers: the client's past trips' passengers, offered again (no new table) |

Read AGENTS.md in full first. The rules most in play:
- "Never store a figure beside the parts it is computed from", including the
  relational-identity paragraph (read a trip's facts through the relation;
  never copy them).
- "Never build an update schema with `.partial()`".
- "A field the DTO accepts must be in the select".
- "Uploads are one global surface" (`uploadUrl`).
- "A photo field that feeds a document offers the photo library".
- "Read every generated migration".
- The create-omits / edit-clears rule for nullable fields.
- "A write re-checks what was picked, on the server".

## Migration

One hand-checked migration, `20261128120000_feedback_b4`:
- `quotes."interiorImageUrl"` TEXT NULL
- `trip_passengers."weightLb"` INTEGER NULL
- `trips."luggageCount"` INTEGER NULL, `trips."luggageWeightLb"` INTEGER NULL
- `trip_requests."luggageCount"` INTEGER NULL,
  `trip_requests."luggageWeightLb"` INTEGER NULL

(That is six columns across four tables. The plan's "five" counted luggage
once.) Use the real table names from the schema's `@@map`. No defaults, no
backfill, no `DROP`. Generate with Prisma, read the SQL, and confirm it is
only `ADD COLUMN`s. **Do not run it.** Claude applies it after review.

## 1. R3-04 — Quote photos

- `Quote.interiorImageUrl`: `uploadUrl.optional()` on create,
  `uploadUrl.nullable().optional()` on update, in the list and detail
  selects. This mirrors `exteriorImageUrl` exactly. Find every place the
  exterior photo is read for a quote (the quote preview, the quote PDF
  renderer, the client portal's quote view in `client-portal.service.ts`)
  and add the interior beside it, with the same fallback to the aircraft's
  `interiorImageUrl` when the quote has none.
- Quote form (`AddQuoteDialog.jsx`): a second photo field, "Interior
  photo", built the same way as the exterior one: `FileUpload` with
  `library` and `suggested` (the chosen aircraft's interior photo).
- **Booking carries them by relation, not by copy.** A trip does not get
  photo columns. When an itinerary is built for a trip that was booked from
  a quote, the itinerary's photos default to the quote's photos, then the
  aircraft's. Find how the trip links to its quote and read the photos
  through that link (in the itinerary service's photo fallback, and in the
  build dialog's prefill). An itinerary's own override, when set, still
  wins. Report the link you used.

## 2. R3-05 — Passenger weight

- `TripPassenger.weightLb`: optional positive integer (1–1,000), created
  and edited wherever passengers are written (the trip create/update
  passenger arrays and B2's passenger editor on the trip page). Use
  `optionalNumber` / `nullableNumber` from `common/dto/numbers.ts`, never
  `z.coerce.number()`.
- Shown on the trip's passenger card as "180 lb", or nothing when blank.

## 3. R3-06 — Luggage

- `luggageCount` (0–100) and `luggageWeightLb` (1–10,000), both optional
  integers, on `Trip` and `TripRequest`: create and update DTOs, the
  selects, and the forms. On the trip form, a "Luggage" section directly
  under Passengers. On the trip request form, beside its passenger count.
  On the trip page, "3 bags · 120 lb", with honest blanks.

**D15: weights and luggage never reach the client.** They must not appear on
the client's quote or itinerary preview/PDF, in the client portal's
responses, or in any merge field a client email can use. Check the portal
service's selects and the PDF renderers, and add a test that the portal
trip/itinerary payload carries no `weightLb`, `luggageCount` or
`luggageWeightLb`. They stay on staff screens. (The operator email that
will carry them is B6. Do not build it here.)

## 4. R2-T1 — Convert to Trip

- On a trip request's row menu, mobile card and detail, "Convert to Trip"
  for a caller with `TRIPS · CREATE`, on a request that is not converted,
  closed or archived. It opens the **existing** new-trip page with the
  request's facts prefilled (client, broker, route and date as the first
  leg, passenger count, luggage) and `tripRequestId` set. Pass the request
  id in the URL (`/dashboard/trips/new?fromRequest=<id>`), and have the page
  load the request through its hook. Never put the facts themselves in the
  URL.
- Saving uses the existing `POST /trips` with `tripRequestId`, which already
  checks the request (`assertTripRequest`) and marks it converted
  (`markConverted`). **No new endpoint.**
- A converted request shows a link to its trip ("Converted to TJ-123"). Read
  it through the trip's `tripRequestId` (via the owning service), not a new
  column on the request.

## 5. R2-T4 — Saved passengers

- `GET /clients/:id/passengers` (session plus the client's read scope; 404
  outside it): the passengers on the client's live trips **that the caller
  can see** (through `TripsService`, in the trip's reach). De-duplicate by
  trimmed, case-insensitive full name plus date of birth. For each person,
  keep the most recent trip's values: `fullName`, `dateOfBirth`, `weightLb`
  and the last trip's reference. **Do not return `passportNumber`.** A
  passport is sensitive, and offering it again is a decision for the owner,
  so say so in the report. Paginated like every list (`paginate`).
- On the trip's passenger editor and the trip form's passengers: "Add from
  past trips", a picker over that endpoint. Use `RecordPicker` with a thin
  wrapper. Picking one adds a passenger row prefilled with name, date of
  birth and the last weight (D17). Everything stays editable.
- No new table (tracker §2.3 explains why).

## Tests (vitest)

- `interiorImageUrl` refuses an absolute URL and round-trips through both
  DTOs and the selects.
- The itinerary photo fallback order: itinerary override, then the quote's
  photo, then the aircraft's.
- Weight and luggage bounds. A blank value is absent on create and null on
  edit, never 0.
- The portal payload carries no weight or luggage fields.
- Saved passengers: de-duplication (name case and whitespace, the same name
  with a different date of birth stays two people), most-recent values win,
  no passport, scope respected (a trip outside the caller's reach
  contributes nothing), 404 for a client outside scope.
- Convert prefill: `POST /trips` with a `tripRequestId` from another client
  is refused (the existing check, now pinned).

## Postman (written now, captured later)

- Quotes: `interiorImageUrl` in the create and update bodies.
- Trips: passenger `weightLb` and the luggage fields; a create carrying
  `tripRequestId` (Convert to Trip).
- Trip Requests: luggage fields.
- Clients: `GET /clients/:id/passengers` with 200 / 401 / 404.

Update the builders only. **Do not run builders or Newman**; Claude has that
run done after review.

## Docs (same pass)

- `docs/MODULE_FEATURE_STATUS.md` for every touched module.
- `AGENTS.md`: add any durable rule, and say which. At least D15, in part
  one or two: "Passenger weights and luggage are operator data: never on a
  client document, the portal or a client merge field."
- Do **not** edit `HANDOFF.md`, `docs/FEEDBACK_TRACKER.md`,
  `docs/DEVELOPER_TEST_CHECKLIST.md` or `docs/feedback-replies/`.

Then run and paste:

```
cd Backend
npx prisma generate
npm run lint
npx tsc --noEmit
npm test
cd ../Frontend
npm run lint
npm run build
```

Also check every screen you changed at about 375px, 768px and 1440px, with
no horizontal scroll, and grep the changed screens for AM/PM.

## Report

Write it to `docs/codex-reports/feedback-b04-trip-data.txt`, with a short
summary in chat:

1. Files changed, one line each, and the migration SQL in full.
2. Per item: done / partly / not done, and any mismatch with the code.
3. Decisions left to you: the quote link used for the itinerary photos, and
   where Convert to Trip appears.
4. Run output (counts).
5. Confirmation: nothing committed, migration not run, no database or
   `.env` touched (`git status`).
