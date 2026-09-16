"use client";

import { Star } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

const NONE = "—";

/** True when the mapper had nothing to show for a field. */
function isBlank(value) {
  return value === null || value === undefined || value === "" || value === NONE;
}

/**
 * Stars for a real 0-5 score.
 *
 * Only `reliabilityRating` is one. `safetyRating` is a certification
 * ("ARG/US Platinum") and `responseSpeed` is turnaround text ("< 15 min") —
 * both were previously run through `parseFloat`, which is `NaN` for text, so
 * every operator rendered a fabricated 4.9 safety score and a 4.5 response
 * score. They are shown as what they are instead.
 */
function StarRating({ value = 0, max = 5 }) {
  const numStars = Math.round(Number(value) || 0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, idx) => (
        <Star
          key={idx}
          className={`size-4 ${
            idx < numStars
              ? "text-amber-400 fill-amber-400"
              : "text-muted-foreground/30 fill-muted-foreground/10"
          }`}
        />
      ))}
    </div>
  );
}

/** One row of the ratings card: a label above whatever the value actually is. */
function CredentialRow({ label, children, bordered = true }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        bordered ? "pb-3 border-b border-border" : ""
      }`}
    >
      <span className="font-montserrat text-[12px] text-muted-foreground uppercase font-medium">
        {label}
      </span>
      {children}
    </div>
  );
}

export default function OperatorOverviewTab({ operator }) {
  if (!operator) return null;

  // `rawReliability` is the number straight off the API — null when nobody has
  // rated this operator. An unrated operator shows "Not rated", never a score.
  const rated = operator.rawReliability !== null && operator.rawReliability !== undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Left Column: Contact, Routes, Terms, Notes */}
      <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
        {/* Contact Information */}
        <SectionCard title="CONTACT INFORMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <DetailField label="Primary Contact" value={operator.primaryContact} />
            <DetailField label="Dispatch Phone" value={operator.phone} />
            <DetailField label="Email" value={operator.email} />
            <DetailField label="Website" value={operator.website || NONE} />
          </div>
        </SectionCard>

        {/* Service Routes */}
        <SectionCard title="SERVICE ROUTES">
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
            <p className="font-montserrat text-[14px] text-muted-foreground">
              No service routes on file
            </p>
          )}
        </SectionCard>

        {/* What the desk is agreeing to when it books this operator. */}
        <SectionCard title="COMMERCIAL TERMS">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <DetailField label="Cancellation Policy" value={operator.cancellationPolicy} />
            <DetailField label="Payment Terms" value={operator.paymentTerms} />
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="NOTES">
          <p className="font-montserrat font-medium text-[14px] text-foreground leading-relaxed">
            {operator.sourcingNotes || "No notes on file"}
          </p>
        </SectionCard>
      </div>

      {/* Right Column: only one of these is a score. */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        <SectionCard title="RATINGS & CREDENTIALS">
          <div className="flex flex-col gap-5 w-full">
            <CredentialRow label="Reliability">
              {rated ? (
                <div className="flex items-center gap-2.5">
                  <StarRating value={operator.rawReliability} />
                  <span className="font-montserrat font-bold text-[16px] text-foreground">
                    {operator.reliability}/5
                  </span>
                </div>
              ) : (
                <span className="font-montserrat text-[14px] text-muted-foreground">
                  Not rated
                </span>
              )}
            </CredentialRow>

            {/* A certification, not a score — shown verbatim. */}
            <CredentialRow label="Safety">
              <span className="font-montserrat font-bold text-[14px] text-foreground text-right">
                {isBlank(operator.safety) ? (
                  <span className="font-medium text-muted-foreground">Not on file</span>
                ) : (
                  operator.safety
                )}
              </span>
            </CredentialRow>

            <CredentialRow label="Response Speed" bordered={false}>
              <span className="font-montserrat font-bold text-[14px] text-foreground text-right">
                {isBlank(operator.responseSpeed) ? (
                  <span className="font-medium text-muted-foreground">Not on file</span>
                ) : (
                  operator.responseSpeed
                )}
              </span>
            </CredentialRow>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
