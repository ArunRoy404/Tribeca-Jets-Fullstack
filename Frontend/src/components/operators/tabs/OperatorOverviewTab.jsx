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

/**
 * OperatorOverviewTab
 *
 * Displays operator contact info, service routes, policies, notes, and ratings.
 * Follows the CRM rule: "Never display a number the data did not supply".
 * All fields bind to genuine server attributes from `operator` (`toOperatorRow(data)`).
 */
export default function OperatorOverviewTab({ operator }) {
  if (!operator) return null;

  const primaryContact = operator.primaryContact && operator.primaryContact !== "—" ? operator.primaryContact : "Not on file";
  const phone = operator.phone && operator.phone !== "—" ? operator.phone : "Not on file";
  const email = operator.email && operator.email !== "—" ? operator.email : "Not on file";
  const website = operator.website && operator.website !== "—" ? operator.website : "Not on file";
  const cancellationPolicy = operator.cancellationPolicy && operator.cancellationPolicy !== "—" ? operator.cancellationPolicy : "No cancellation policy on file.";
  const notes = operator.sourcingNotes ? operator.sourcingNotes : "No sourcing notes on file.";

  const hasReliability = operator.rawReliability !== null && operator.rawReliability !== undefined;
  const hasSafety = operator.safety && operator.safety !== "—";
  const hasSpeed = operator.responseSpeed && operator.responseSpeed !== "—";
  const hasAnyRating = hasReliability || hasSafety || hasSpeed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start w-full">
      {/* Left Column: Contact Information, Service Routes, Cancellation Policy, Notes */}
      <div className="flex flex-col gap-6 min-w-0 w-full">
        {/* Contact Information */}
        <DetailCard title="CONTACT INFORMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">
                Primary Contact
              </span>
              <span className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
                {primaryContact}
              </span>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">
                Dispatch Phone
              </span>
              <span className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
                {phone}
              </span>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">
                Email
              </span>
              <span className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
                {email}
              </span>
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground">
                Website
              </span>
              <span className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
                {website}
              </span>
            </div>
          </div>
        </DetailCard>

        {/* Service Routes */}
        <DetailCard title="SERVICE ROUTES">
          {operator.serviceRoutes?.length > 0 ? (
            <div className="flex flex-wrap gap-2 w-full">
              {operator.serviceRoutes.map((route) => (
                <span
                  key={route}
                  className="px-3 py-1.5 rounded-sm bg-secondary border border-border font-montserrat text-[13px] font-bold text-foreground"
                >
                  {route}
                </span>
              ))}
            </div>
          ) : (
            <p className="font-montserrat text-[13px] text-muted-foreground">
              No service routes on file
            </p>
          )}
        </DetailCard>

        {/* Cancellation Policy */}
        <DetailCard title="CANCELLATION POLICY">
          {/* `whitespace-pre-line` because this is pasted from the operator's
              own terms, a tier per line. Collapsing it into one paragraph is
              how a 50% band gets read as a 25% one over the phone. */}
          <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {cancellationPolicy}
          </p>
        </DetailCard>

        {/* Notes */}
        <DetailCard title="NOTES">
          {/* Same reason as the policy above: sourcing notes are typed in a
              textarea, so they arrive with the line breaks whoever wrote them
              intended. */}
          <p className="font-montserrat text-[13px] text-muted-foreground leading-relaxed whitespace-pre-line">
            {notes}
          </p>
        </DetailCard>
      </div>

      {/* Right Column: Ratings */}
      <div className="flex flex-col gap-6 min-w-0 w-full">
        <DetailCard title="RATINGS">
          {hasAnyRating ? (
            <div className="flex flex-col gap-4 w-full">
              <RatingRow
                label="RELIABILITY"
                score={hasReliability ? `${Number(operator.rawReliability).toFixed(1)}/5` : "Not rated"}
                rating={hasReliability ? Number(operator.rawReliability) : null}
              />
              <RatingRow
                label="SAFETY"
                score={hasSafety ? operator.safety : "Not rated"}
                rating={null}
              />
              <RatingRow
                label="RESPONSE SPEED"
                score={hasSpeed ? operator.responseSpeed : "Not rated"}
                rating={null}
                isLast
              />
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="font-montserrat font-semibold text-[14px] text-foreground">
                No Ratings on File
              </p>
              <p className="font-montserrat text-[12px] text-muted-foreground mt-1">
                Ratings will appear here once safety audits and broker reviews are logged.
              </p>
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
