# Replies to the tester

What we tell the tester about each issue they raised, ready to send once
the round is implemented. Written for the tester: issue numbers as in
their report, what changed, and exactly how to retest.

**How this file is kept:** one section per round, matching
`docs/FEEDBACK_TRACKER.md`. Every reply is drafted when the item is
agreed and **finalised when the item is implemented and verified** —
the wording must describe what the build actually does, never the plan.
Status per reply: `draft` (agreed, not built) → `final` (built and
verified, ready to send) → `sent`.

---

## Round 1 — QA Test Report v2.0 (tested 11–13 Oct 2026)

### Already fixed — please confirm on screen

| # | Reply | Status |
|---|---|---|
| 3 | Schedule Follow-up now saves, with or without a broker. Retest: client page → Schedule Follow-up → pick a date → Save; it appears under Upcoming Follow-ups on the Dashboard. | final |
| 4 | FET is no longer counted as income. Retest your example: $11,400 charter, $9,500 cost, FET on → total $12,255, profit $1,900, margin 16.7%, 10% commission $190.00. Check the quote, the trip, Reports, the Dashboard and Commissions. | final |
| 5 | Old prototype data is cleared from the browser on every load and on sign-out. Retest: DevTools → Application → Local Storage → no `tjcc_*` keys after loading the app. | final |
| 6 | Only PDF, Word (.docx), Excel (.xlsx), text, CSV and photos (JPG, PNG, WebP, GIF, AVIF) are accepted, checked by the file's real contents, with a clear message otherwise. Retest: upload `test_bad.exe`, a renamed `.exe` → `.pdf`, and a real PDF, at the vault and at one other upload point. | final |
| 7 | Withdrawing a credit that has already been used is refused, with the amount explained. Retest: add $1,000, apply $300, withdraw the $1,000 entry → refused. | final |
| 13 | Add Client and Add Lead now offer the same stages: New, Contacted, Qualified, Proposal, Quoted, Won, Lost. | final |
| 16 | "Active Agents" counts only active users, not pending invitations. | final |
| 17 | Invite phone "abc" is refused; aircraft year after this year is refused; empty weight must be below max takeoff weight. | final |
| 22 (time) | Itineraries have a departure time field, and show the passenger count when names aren't entered. | final |
| 23 | Invoices can no longer exceed the trip total. Retest: 50% deposit invoice → the button now reads "Bill remaining balance" and fills only the rest; an invoice above the remainder is refused with the maximum stated. | final |
| 24 | Edit Quote → Save Changes works, including on a copied draft. | final |
| 25 | A flight can't be set to In Flight or Landed before its departure date; landing every leg completes the trip. | final |
| 27 | An approved operator quote has "Build Client Quote", which brings in the operator, aircraft and cost. | final |
| 28 | "Source in Operators" finds the request; searching "TR-3" or "3" works. | final |
| 34 (users) | Super Admin and Admin are offered as brokers in every picker and filter. | final |
| 37 | Money in emails shows as $12,255.00. | final |

### Being fixed in this round

| # | Reply (describe the build once done) | Status |
|---|---|---|
| 33 | New quotes take the default markup, validity, FET switch, FET rate and terms from Settings, applied by the server too. New leads and clients take the default stage and follow-up interval. | draft |
| 11 | A deposit above the quote total is refused. | draft |
| 32 | The client's requirements are kept in an internal field and no longer appear under Terms on the client's quote; the preview title reads "QUOTE". | draft |
| 36 | Ask an Operator now sends a real email, which appears under Email Templates → Sent. | draft |
| 22 (failed send) | If an email fails, the quote or itinerary goes back from Sent and the broker is told. | draft |
| 30 | Mark Paid asks for the payment method and reference and confirms first; a commission becomes Earned automatically when its trip completes. | draft |
| 9 | Mark Confirmed requires the operator-confirmed tick and a departure time, as well as an operator, a date and passengers. | draft |
| 26 | Completing a trip warns when the operator is unpaid or part of the trip isn't invoiced. (Departed/Completed before the departure date is already refused.) | draft |
| 12 | The same From and To airport is refused on leads, clients and trip requests. | draft |
| 29 | Booking moves the client to Active / Won and records it on their timeline; sending a quote moves them to Quoted; the summary strip shows their latest trip. | draft |
| 38 | Start a quote from the estimate now brings the chosen size, the estimate as operator cost, and a base price with the default markup. | draft — min-hours rule waits on the client |
| 4 (reports) | Reports and the Dashboard show the uninvoiced balance next to Outstanding AR. | draft |
| 31 | Empty-leg counters, the Dashboard and the cards use the same match count. | draft |
| 35 (figures) | The invented sign-in figures are removed. | draft |
| 21 | Book Trip is in the quote list's row menu. | draft |
| 15 | The timeline describes changes in plain words, and client payments appear on it. | draft |
| 34 (referrals) | Staff can log a phoned-in referral; clients and leads have a "Referred by" that shows in Referrals (merged with the client's 19 Nov request). | draft |
| 18 | Latitude 200 now says "must be between -90 and 90". | draft |

### Not changing — and why

| # | Reply | Status |
|---|---|---|
| 25 (feed) | Flight status stays manual: a live feed needs a paid provider the client hasn't chosen. Impossible statuses are refused (see #25 above). | final |
| 18 (ICAO) | Airport details from the ICAO code is a possible later feature, not part of this round. | final |
| 33 (alerts) | Notifications & alerts are now being built (the client asked for them on 19 Nov): an in-app bell plus email, starting with booking alerts and FET reminders. Reply to be finalised when they ship. | draft |
| 22 (bounces) | A bounce that happens later inside the recipient's mail server can't be seen by the app; every failure the server sees is reported (see #22 above). | final |
| 5 (passwords) | The passwords you found were the prototype's dummy accounts, not real logins; nothing to reset. | final |
| 35 (invite) | The invitation's starting password is the owner's decision. Waiting on the client — reply to be written after their answer. | draft |

### Please retest — built after your test window

| Area | What to check |
|---|---|
| Import / Export | Import was built on 29 Oct: upload, validation preview, then import. |
| PDF Generator | Quote, itinerary, invoice and report PDFs download. |
| Client Portal | Beyond sign-in: the client's view of trips, quotes and documents. |
| AI Assistant | Ask a question; report if the tab still freezes. |
| Permissions | One login per role (Admin, Broker, Assistant, Referral Agent) will be provided — check each sees and can do only what it should. |
| Report exports | XLSX, CSV and PDF downloads open with the right figures. |
