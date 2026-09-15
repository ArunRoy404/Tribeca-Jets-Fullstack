"use client";

import { useMemo } from "react";
import FilterDropdown from "./FilterDropdown";
import { PAGE_SIZE_OPTIONS } from "@/hooks/common/useTableQueryParams";

/**
 * Rows-per-page control for a server-paginated table.
 *
 * Built on `FilterDropdown` rather than a new menu: it is the same control —
 * a fixed set of options, one active — and the toolbar's filters already look
 * exactly like this, so a second implementation would only drift from it.
 *
 * The value belongs in the URL like every other table param, so a link carries
 * the page size the sender was looking at.
 */
export default function PageSizeSelect({ value, onChange, options = PAGE_SIZE_OPTIONS }) {
  const labels = useMemo(() => options.map((size) => `${size} / page`), [options]);

  // The trigger renders its value directly, so a missing one would read
  // "undefined / page" for the first frame of a load.
  const active = options.includes(Number(value)) ? Number(value) : options[0];

  const sizeByLabel = useMemo(
    () => Object.fromEntries(options.map((size) => [`${size} / page`, size])),
    [options],
  );

  return (
    <FilterDropdown
      label="Rows"
      value={`${active} / page`}
      options={labels}
      onChange={(label) => onChange?.(sizeByLabel[label] ?? options[0])}
    />
  );
}
