"use client";

import {
  filterField,
  paginationFields,
  searchField,
  useTableQueryParams,
} from "@/hooks/common/useTableQueryParams";
import { DOCUMENT_CATEGORIES, DOCUMENT_OWNERS, EXPIRY_STATES } from "@/lib/document";
import { ARCHIVE_TABS } from "@/lib/archive";

/** Mirrors `DOCUMENT_SORTABLE_FIELDS` on the API exactly. */
const SORTABLE = ["createdAt", "updatedAt", "title", "category", "expiresOn"];

const SCHEMA = {
  archived: {
    default: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : undefined),
    serialise: (value) => (value ? "true" : ""),
    resetsPage: true,
  },
  ...paginationFields(SORTABLE),
  search: searchField(),
  category: filterField(DOCUMENT_CATEGORIES),
  owner: filterField(DOCUMENT_OWNERS),
  expiry: filterField(EXPIRY_STATES),
};

/** URL state for the Document Vault screen. */
export function useDocumentsTableParams() {
  const { values, setValues, reset, queryParams, setters, goToPage } = useTableQueryParams(SCHEMA);

  return {
    ...values,
    ...setters,
    queryParams,
    goToPage,
    setValues,
    tab: values.archived ? ARCHIVE_TABS.ARCHIVED : ARCHIVE_TABS.LIVE,
    setTab: (tab) => setters.setArchived(tab === ARCHIVE_TABS.ARCHIVED),
    hasFilters: Boolean(values.search || values.category || values.owner || values.expiry),
    clearFilters: reset,
  };
}
