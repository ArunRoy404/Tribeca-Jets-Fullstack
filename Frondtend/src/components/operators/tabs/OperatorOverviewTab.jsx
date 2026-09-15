"use client";

import { Star } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import DetailField from "@/components/common/DetailField";

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

export default function OperatorOverviewTab({ operator }) {
  if (!operator) return null;

  const reliabilityVal = parseFloat(operator.reliability) || 4.8;
  const safetyVal = parseFloat(operator.safety) || 4.9;
  const responseSpeedVal = operator.responseSpeed === "Fast" ? 4.2 : 4.5;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Left Column: Contact, Routes, Cancellation, Notes */}
      <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
        {/* Contact Information */}
        <SectionCard title="CONTACT INFORMATION">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <DetailField label="Primary Contact" value={operator.primaryContact || "-"} />
            <DetailField label="Dispatch Phone" value={operator.phone || operator.generalPhone || "-"} />
            <DetailField label="Email" value={operator.email || operator.generalEmail || "-"} />
            <DetailField label="Website" value={operator.website || "-"} />
          </div>
        </SectionCard>

        {/* Service Routes */}
        <SectionCard title="SERVICE ROUTES">
          {operator.serviceRoutes && operator.serviceRoutes.length > 0 ? (
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
            <p className="font-montserrat text-[14px] text-muted-foreground">No service routes on file</p>
          )}
        </SectionCard>

        {/* Cancellation Policy */}
        <SectionCard title="CANCELLATION POLICY">
          <p className="font-montserrat font-medium text-[14px] text-foreground leading-relaxed">
            {operator.cancellationPolicy || "---"}
          </p>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="NOTES">
          <p className="font-montserrat font-medium text-[14px] text-foreground leading-relaxed">
            {operator.sourcingNotes || "----"}
          </p>
        </SectionCard>
      </div>

      {/* Right Column: Ratings (Figma node 452:39140) */}
      <div className="w-full lg:w-96 shrink-0 flex flex-col gap-6">
        <SectionCard title="RATINGS">
          <div className="flex flex-col gap-5 w-full">
            {/* Reliability Rating */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex flex-col gap-1.5">
                <span className="font-montserrat text-[12px] text-muted-foreground uppercase font-medium">
                  Reliability
                </span>
                <StarRating value={reliabilityVal} />
              </div>
              <span className="font-montserrat font-bold text-[16px] text-foreground">
                {reliabilityVal}/5
              </span>
            </div>

            {/* Safety Rating */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex flex-col gap-1.5">
                <span className="font-montserrat text-[12px] text-muted-foreground uppercase font-medium">
                  Safety
                </span>
                <StarRating value={safetyVal} />
              </div>
              <span className="font-montserrat font-bold text-[16px] text-foreground">
                {safetyVal}/5
              </span>
            </div>

            {/* Response Speed Rating */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="font-montserrat text-[12px] text-muted-foreground uppercase font-medium">
                  Response Speed
                </span>
                <StarRating value={responseSpeedVal} />
              </div>
              <span className="font-montserrat font-bold text-[16px] text-foreground">
                {responseSpeedVal}/5
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
