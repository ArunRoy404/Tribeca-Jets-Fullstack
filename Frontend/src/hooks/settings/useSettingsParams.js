"use client";

import { useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import { DEFAULT_SETTINGS_SECTION, SETTINGS_SECTION_IDS } from "@/lib/settings";

const SCHEMA = {
  /** The open section. In the URL so a reload or a pasted link lands on it. */
  section: {
    default: DEFAULT_SETTINGS_SECTION,
    parse: (raw) => (SETTINGS_SECTION_IDS.includes(raw) ? raw : undefined),
    local: true,
  },
};

/** URL state for the Settings page. */
export function useSettingsParams() {
  const { values, setters } = useTableQueryParams(SCHEMA);
  return { section: values.section, setSection: setters.setSection };
}
