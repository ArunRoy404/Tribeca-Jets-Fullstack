# Replies to the client (Ari)

The update we send Ari once every round of feedback has been reviewed and
implemented. Written for Ari: plain business language, what it means for
the desk.

**How this file is kept** (same pass as every status change in
`docs/FEEDBACK_TRACKER.md`):

- **Part A — Updates:** what we did, by area. A line moves in here only
  when its item is **built and verified**, and says what the system does,
  never what we plan.
- **Part B — Not doing, and why:** everything Ari asked for (or the
  tester reported) that we are deliberately not building, with the reason
  in a sentence.
- **Part C — Questions for Ari, and their answers:** each question with
  the date it was sent and Ari's answer once it arrives. An answer that
  changes the build goes into the tracker the same day.
- **Part D — Already there:** things Ari asked for that the system already
  does, so they know where to find them.

Feedback that overlaps across rounds is merged here as in the tracker, so
Ari reads one answer per request, not one per round.

**Status of this update:** draft — nothing below Part A is sent yet;
Part A fills in as items ship.

---

## Part A — Updates (fills in as items are built and verified)

*The running update for Ari — every item, its status, kept current per
batch — is `PROGRESS_FOR_ARI.md` (since 27 Nov 2026). Do not keep a second
copy here. The draft message for the QA review (Round 1) is kept in Part E
as wording to reuse when its items ship.*

---

## Part B — Not doing, and why

| Request | Round | Why we are not building it |
|---|---|---|
| Live flight-status feed | 1 (QA #25) | Needs a paid tracking provider (e.g. FlightAware); flight status stays manual until you choose one. Impossible statuses (landed before departure) are already blocked. |
| Fill airport details from the ICAO code | 1 (QA #18) | A new feature rather than a fix; possible later from a free public airport list. |
| Detect emails that bounce later inside the recipient's mail system | 1 (QA #22) | The app can only see what its own mail server reports; every failure it sees is reported and the record is not marked Sent. Catching later bounces needs the mail provider's bounce service. |
| Reset the passwords found in the browser | 1 (QA #5) | They belonged to the early prototype's sample accounts, not real logins. The old data is now wiped automatically. |
| Allow any file type as a document | 1 (QA #6) | Kept to documents and photos only — the vault holds passports and IDs, so program files are refused. |
| A separate saved-passengers list | 2 (Trips 4) | You still get one-click passengers: they come from the client's past trips, so there is one record per person and nothing to keep in step. |
| Sending FET reports to the accountant automatically | 2 (FET 13) | As you asked — an admin always clicks Send. It is built so a daily automatic report can be switched on later. |
| Tribeca's font in every inbox | 2 (Bugs 5) | Gmail and Outlook ignore custom fonts; emails use the font where the inbox allows it and a close match elsewhere. |

---

## Part C — Questions for Ari, and their answers

| ID | Round | Question | Sent | Answer |
|---|---|---|---|---|
| R1 Q1 | 1 | Minimum billable hours are applied to *each leg*, so a round trip is charged the minimum twice (a 1-hour hop each way with a 2-hour minimum is billed as 4 hours, not 2). Is that how you price, or should the minimum apply once per trip? | 25 Nov 2026 | — |
| R1 Q2 | 1 | When you invite a team member, you set their first password and the email includes it. Keep that, or send a link so each person sets their own and nobody else knows it? | 25 Nov 2026 | — |
| R2 Q1 | 2 | When a client pays part of an invoice, how much of that payment is FET — a proportional share (half the money = half the FET), or the FET first? | 25 Nov 2026 | — |
| R2 Q2 | 2 | When the price already includes FET, is that decided per trip, or always for certain clients? | 25 Nov 2026 | — |
| R2 Q3 | 2 | If a client's credit is used towards an invoice, should that count as a payment for FET (with its own 14-day reminder)? | 25 Nov 2026 | — |
| R2 Q5 | 2 | Who marks FET as "paid to the IRS", and should it record the date and amount paid? | 25 Nov 2026 | — |
| R2 Q6 | 2 | Should trip expenses (catering, transport) reduce the trip's profit — and so the broker's commission? | 25 Nov 2026 | — |
| R2 Q7 | 2 | For receipts: what should we record besides the photo (amount, date, vendor, the trip it belongs to?), and who may upload and see them? | 25 Nov 2026 | — |
| R2 Q8 | 2 | When a trip is transferred to another broker, should the client move to them too, and does the commission follow the trip? | 25 Nov 2026 | — |
| R2 Q9 | 2 | "Referred by": should it be one of your referral agents picked from a list, a name typed in, or either? | 25 Nov 2026 | — |
| R2 Q10 | 2 | When you said Referrals isn't working, what did you see — an empty page, an error, or no way to add one? | 25 Nov 2026 | — |
| R2 Q11 | 2 | Airports not showing in the itinerary builder: which trip was it, and were you expecting to choose the airports there? (Today they come from the trip you pick.) | 25 Nov 2026 | — |
| R2 Q12 | 2 | On a multi-leg trip, should the itinerary have one departure/arrival FBO, or one per leg? | 25 Nov 2026 | — |
| R2 Q13 | 2 | Could you send the private-jet image you'd like? Should it replace the background on every screen that uses the plane picture, or only Email Templates? | 25 Nov 2026 | — |
| R2 Q14 | 2 | Which font is Tribeca's font? | 25 Nov 2026 | — |
| R2 Q15 | 2 | Notification emails being optional — should each person choose, or one switch for the whole company? | 25 Nov 2026 | — |
| R2 Q16 | 2 | Contracts: rename the existing "Charter Agreement" category to "Contract", or keep both? | 25 Nov 2026 | — |
| R2 Q17 | 2 | An invoice without a trip — what would you use it for (a cancellation fee, a membership…)? Can it include FET? | 25 Nov 2026 | — |

---

## Part D — Already there

| You asked for | Where it is |
|---|---|
| Client credit on the profile (Round 2) | Client page → **Credit** tab. |
| All invoices in one place (Round 2) | Finance → today called **Receivables**; it will be renamed **Invoices**. |
| Wire details hidden from brokers (Round 2) | Brokers cannot open Settings at all, so they can't see or change them. Wire details still appear on the invoices you send clients, as they should. |
| Broker bookings approved by an admin (Round 2) | Already live: a broker's trip waits for Approve or Decline; we're adding a quicker "Edit financials" button to the approval banner. |
| Contract category in the Document Vault (Round 2) | "Charter Agreement" exists today — see question R2 Q16. |
| Your logo on emails (Round 2) | Emails use the logo uploaded in Settings → Company. Upload it there and every email carries it. |

---

## Part E — Draft text kept for Part A

Round 1's message, to be moved into Part A line by line as its items ship:

> **Money is now right everywhere.** FET is no longer counted as profit:
> the $11,400 charter example now shows $1,900 profit at 16.7%, and the
> broker's 10% commission is $190, not $275.50. A trip can no longer be
> invoiced for more than its price, a used credit can't be withdrawn, and a
> deposit can't exceed the quote total.
>
> **Your Settings now do their job.** New quotes take your default
> markup, validity, FET and terms; new leads take your default stage and
> follow-up interval.
>
> **Quotes and operators.** The client's requirements stay internal and
> no longer show on the client's quote. "Ask an Operator" now really
> emails the operator, and if any email fails, the quote or itinerary is
> no longer marked Sent and the broker is told.
>
> **Trips can't run ahead of reality.** A trip can't be confirmed until
> the operator has confirmed and a departure time is set, can't be marked
> departed or completed before its date, and completing one warns you
> about money still open. Commissions become Earned when the trip
> completes, and paying one records how it was paid.
>
> **Clients move through the pipeline on their own.** Sending a quote
> moves a client to Quoted; booking moves them to Active, and both show on
> their timeline.
>
> **Smaller fixes:** follow-ups save, uploads accept only documents and
> photos, Super Admin and Admin can be assigned as brokers, staff can log
> a phoned-in referral, email amounts show commas, and the made-up figures
> on the sign-in page are gone.
>
> Since the review, Import, PDF downloads, the Client Portal and per-role
> permissions have all been built — our tester is checking them now.
