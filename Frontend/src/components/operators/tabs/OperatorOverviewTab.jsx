"use client";

import DetailCard from "@/components/operators/DetailCard";

function RatingRow({ label, score, rating, max = 5, isLast = false }) {
  const numFilled = rating !== null && rating !== undefined ? Math.round(rating) : 0;
  return (
    <div className={`flex flex-col gap-1.5 w-full ${!isLast ? "pb-4 border-b border-border/60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground">
          {score}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }).map((_, idx) => (
          <span
            key={idx}
            className={`text-[16px] leading-none select-none ${
              rating !== null && rating !== undefined && idx < numFilled
                ? "text-amber-400"
                : "text-muted-foreground/25"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

/** One labelled value in a card; "Not on file" when the API sent nothing. */
function Field({ label, value }) {
  const shown = value && value !== "—" ? value : "Not on file";
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">{label}</span>
      <span
        className={`font-montserrat font-bold text-[13px] sm:text-[14px] truncate ${
          shown === "Not on file" ? "text-muted-foreground font-medium" : "text-foreground"
        }`}
        title={shown}
      >
        {shown}
      </span>
    </div>
  );
}

function Chips({ items, empty }) {
  if (!items?.length) return <p className="font-montserrat text-[13px] text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2 w-full">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1.5 rounded-sm bg-secondary border border-border font-montserrat text-[13px] font-bold text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** A labelled row in the ratings card for something that is not a score. */
function RatingText({ label, children, isLast = false }) {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${!isLast ? "pb-4 border-b border-border/60" : ""}`}>
      <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * OperatorOverviewTab
 *
 * Contacts, fleet and coverage, terms, notes and ratings — every field the
 * form stores, as the API sent it ("Not on file" when it sent nothing).
 * Stars are for the two scores (reliability and safety, 0–5 — the desk's
 * own ratings); response speed is the desk's word for it, so it is not drawn
 * as stars (Operators review, 8 Oct 2026).
 */
export default function OperatorOverviewTab({ operator }) {
  if (!operator) return null;

  const cancellationPolicy = operator.cancellationPolicy && operator.cancellationPolicy !== "—" ? operator.cancellationPolicy : "No cancellation policy on file.";
  const notes = operator.sourcingNotes ? operator.sourcingNotes : "No notes on file.";
  const hasReliability = operator.rawReliability !== null && operator.rawReliability !== undefined;
  const hasSafety = operator.rawSafety !== null && operator.rawSafety !== undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start w-full">
      <div className="flex flex-col gap-6 min-w-0 w-full">
        <DetailCard title="CONTACT INFORMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full">
            <Field label="Primary Contact" value={operator.primaryContact} />
            <Field label="Contact Email" value={operator.contactEmail} />
            <Field label="Contact Phone" value={operator.contactPhone} />
            <Field label="Home Base" value={operator.homeBase} />
            <Field label="General Email" value={operator.generalEmail} />
            <Field label="General Phone" value={operator.generalPhone} />
            <Field label="Website" value={operator.website} />
          </div>
        </DetailCard>

        <DetailCard title="FLEET & COVERAGE">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">Aircraft Types</span>
              <Chips items={operator.aircraftTypes} empty="No aircraft types on file" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">Service Routes</span>
              <Chips items={operator.serviceRoutes} empty="No service routes on file" />
            </div>
          </div>
        </DetailCard>

        <DetailCard title="TERMS">
          <div className="flex flex-col gap-4 w-full">
            <Field label="Payment Terms" value={operator.paymentTerms} />
            <div className="flex flex-col gap-1">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">Cancellation Policy</span>
              {/* `whitespace-pre-line` because this is pasted from the
                  operator's own terms, a tier per line. Collapsing it into one
                  paragraph is how a 50% band gets read as a 25% one over the
                  phone. */}
              <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
                {cancellationPolicy}
              </p>
            </div>
          </div>
        </DetailCard>

        <DetailCard title="NOTES">
          <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {notes}
          </p>
        </DetailCard>
      </div>

      <div className="flex flex-col gap-6 min-w-0 w-full">
        <DetailCard title="RATINGS">
          <div className="flex flex-col gap-4 w-full">
            <RatingRow
              label="RELIABILITY"
              score={hasReliability ? `${Number(operator.rawReliability).toFixed(1)}/5` : "Not rated"}
              rating={hasReliability ? Number(operator.rawReliability) : null}
            />
            <RatingRow
              label="SAFETY"
              score={hasSafety ? `${Number(operator.rawSafety).toFixed(1)}/5` : "Not rated"}
              rating={hasSafety ? Number(operator.rawSafety) : null}
            />
            <RatingText label="RESPONSE SPEED" isLast>
              <span className="font-montserrat font-bold text-[14px] text-foreground">
                {operator.rawResponseSpeed ? operator.responseSpeed : "Not rated"}
              </span>
            </RatingText>
          </div>
        </DetailCard>
      </div>
    </div>
  );
}
