"use client";

import { useCallback, useMemo } from "react";
import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useOperator, useOperators } from "@/hooks/operators";
import { formatOperatorStatus } from "@/lib/operator";

/** Alphabetical; live operators only (the API's default). */
const PARAMS = { sortBy: "name", sortOrder: "asc" };

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
 *
 * `disabledIds` marks specific operators as unselectable (e.g. operators already
 * asked for an enquiry).
 */
export default function OperatorPicker({
  value,
  onChange,
  params,
  disabledIds,
  placeholder = "Select an operator",
  ...props
}) {
  const disabledSet = useMemo(
    () => (disabledIds?.length ? new Set(disabledIds) : null),
    [disabledIds],
  );

  const getOption = useCallback(
    (operator) => {
      const isDisabled = Boolean(disabledSet?.has(operator?.id));
      return {
        value: operator?.id,
        label: operator?.name,
        disabled: isDisabled,
        description: isDisabled
          ? "Already asked for this enquiry"
          : [operator?.homeBase, formatOperatorStatus(operator?.status)]
              .filter(Boolean)
              .join(" · "),
      };
    },
    [disabledSet],
  );

  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useOperators}
      useOne={useOperator}
      params={params ? { ...PARAMS, ...params } : PARAMS}
      getOption={getOption}
      placeholder={placeholder}
      searchPlaceholder="Search name, base or contact…"
      itemLabel="operators"
      {...props}
    />
  );
}
