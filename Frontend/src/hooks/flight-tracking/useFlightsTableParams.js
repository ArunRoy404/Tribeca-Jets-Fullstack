"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { FLIGHT_STATUS_FILTERS, FLIGHT_WINDOWS } from "@/lib/flight";

// The board has one order — nearest flight first — and the API refuses a
// sort it would ignore, so only the paging half of the shared fields is used.
const { page, limit } = paginationFields(["createdAt"]);

const SCHEMA = {
  page,
  limit,
  search: searchField(),
  /** ACTIVE by default: today onward, plus anything reported in the air or delayed. */
  window: { ...filterField([...FLIGHT_WINDOWS, "ALL"]), default: "ACTIVE" },
  flightStatus: filterField(FLIGHT_STATUS_FILTERS),
  /** The flight whose panel is open — in the URL so a link reopens it; `local`, never sent. */
  flight: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the Flight Tracking board. */
export function useFlightsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  // "All" is a real choice beside the ACTIVE default, sent as no window at all.
  const { window: range, ...rest } = queryParams;
  const apiParams = range === "ALL" ? rest : queryParams;

  return {
    ...values,
    ...setters,
    queryParams: apiParams,
    goToPage,
    setValues,
    hasFilters: Boolean(values.search || values.flightStatus || values.window !== "ACTIVE"),
    clearFilters: reset,
  };
}
