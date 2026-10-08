"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useOperator, useOperators } from "@/hooks/operators";
import { formatOperatorStatus } from "@/lib/operator";

/** Alphabetical; live operators only (the API's default). */
const PARAMS = { sortBy: "name", sortOrder: "asc" };

/** `FlexJet`, with home base and status beneath — a suspended one says so. */
function operatorOption(operator) {
  return {
    value: operator?.id,
    label: operator?.name,
    description: [operator?.homeBase, formatOperatorStatus(operator?.status)].filter(Boolean).join(" · "),
  };
}

/**
 * The operator picker every form uses — `RecordPicker` over the operators
 * list: search by name, base or contact, 10 a page by default, paged by the
 * server. Built with Operators' review (8 Oct 2026); each form that picks an
 * operator (Aircraft, Sourcing, Quotes, Trips, Empty Legs, Operator Payments)
 * switches to it on its own review.
 *
 * `params` narrows the list for a form that must not offer some operators —
 * a booking form passing `{ status: "PREFERRED" }`, say. The server still
 * checks whatever is picked.
 */
export default function OperatorPicker({ value, onChange, params, placeholder = "Select an operator", ...props }) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useOperators}
      useOne={useOperator}
      params={params ? { ...PARAMS, ...params } : PARAMS}
      getOption={operatorOption}
      placeholder={placeholder}
      searchPlaceholder="Search name, base or contact…"
      itemLabel="operators"
      {...props}
    />
  );
}
