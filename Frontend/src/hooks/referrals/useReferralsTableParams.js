"use client";

import {
  filterField,
  paginationFields,
  searchField,
  stringParam,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { REFERRAL_STATUSES } from "@/lib/referral";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `REFERRAL_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "reference", "departureDate", "status"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  status: filterField(REFERRAL_STATUSES),
  agentId: { default: "", parse: stringParam(36), resetsPage: true },
  /** The referral whose sheet is open — view state, never sent to the API. */
  referral: { default: "", parse: stringParam(36), local: true },
};

/** URL state for the desk's Referrals board. */
export function useReferralsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.status || values.agentId),
    clearFilters: reset,
  };
}
