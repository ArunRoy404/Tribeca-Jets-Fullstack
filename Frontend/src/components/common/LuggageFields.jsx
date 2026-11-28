"use client";

import CommonInput from "@/components/common/CommonInput";
import FormField from "@/components/trips/FormField";

/** The same staff-only measurements on an enquiry and a booked trip. */
export default function LuggageFields({ luggageCount, luggageWeightLb, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
      <FormField label="Bag count" optional>
        <CommonInput type="number" min={0} max={100} step={1} value={luggageCount ?? ""} onChange={(e) => onChange("luggageCount", e.target.value)} />
      </FormField>
      <FormField label="Total luggage weight (lb)" optional>
        <CommonInput type="number" min={1} max={10000} step={1} value={luggageWeightLb ?? ""} onChange={(e) => onChange("luggageWeightLb", e.target.value)} />
      </FormField>
    </div>
  );
}
