"use client";

import { useMemo } from "react";

/**
 * Builds the label list and the label→enum lookup for one dropdown filter.
 *
 * Display labels live in the dropdown; **enum constants go in the URL and on
 * the wire**. That split is a contract rule, and this is the piece that keeps
 * the two from being written out by hand in every toolbar.
 *
 * Shared because a second module now needs it: it was written privately in the
 * aircraft toolbar, and the sourcing board has the same two filters. Lifted on
 * the second use rather than copied, and the first caller moved over in the
 * same pass.
 *
 * ```js
 * const status = useEnumFilter(
 *   FILTERABLE_AIRCRAFT_STATUSES, formatAircraftStatus, "All Status",
 * );
 * <FilterDropdown
 *   options={status.options}
 *   value={status.labelFor(current)}
 *   onChange={(label) => setStatus(status.valueByLabel[label] ?? "")}
 * />
 * ```
 */
export function useEnumFilter(values, format, allLabel) {
  const options = useMemo(
    () => [allLabel, ...values.map(format)],
    [values, format, allLabel],
  );

  const valueByLabel = useMemo(
    () => Object.fromEntries(values.map((value) => [format(value), value])),
    [values, format],
  );

  return {
    options,
    valueByLabel,
    /** The label to show for a stored enum value, or the "all" label when unset. */
    labelFor: (value) => (value ? format(value) : allLabel),
  };
}

/**
 * The same split as `useEnumFilter`, for a dropdown over *records* — brokers,
 * operators, aircraft — where the URL and the wire carry the id and the
 * dropdown shows a name.
 *
 * Several toolbars still build this lookup by hand (trips, quotes, sourcing,
 * referrals); each moves over when its own module is next worked on.
 *
 * ```js
 * const operator = useIdFilter(operators?.data, (o) => o?.name, "All Operators");
 * <FilterDropdown
 *   options={operator.options}
 *   value={operator.labelFor(operatorId)}
 *   onChange={(label) => setOperatorId(operator.idByLabel[label] ?? "")}
 * />
 * ```
 *
 * An id that is in the URL but not among `rows` (not loaded yet, or archived)
 * reads as the "all" label rather than as a raw uuid.
 */
export function useIdFilter(rows, labelOf, allLabel) {
  return useMemo(() => {
    const idByLabel = {};
    const labelById = {};
    for (const row of rows ?? []) {
      const label = labelOf(row);
      if (!row?.id || !label) continue;
      idByLabel[label] = row.id;
      labelById[row.id] = label;
    }
    return {
      options: [allLabel, ...Object.keys(idByLabel)],
      idByLabel,
      labelFor: (id) => (id ? (labelById[id] ?? allLabel) : allLabel),
    };
  }, [rows, labelOf, allLabel]);
}
