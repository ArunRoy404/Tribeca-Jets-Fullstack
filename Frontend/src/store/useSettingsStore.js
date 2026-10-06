import { create } from "zustand";
import {
  activeSessions,
  companySettings,
  dataSettings,
  notificationSettings,
  quoteDefaults,
  securitySettings,
} from "@/dummyData/settings";

/**
 * Settings form state, one slice per section, seeded from dummy data until
 * the Settings API (#26) lands. The active section is not here: it lives in
 * the URL (`useSettingsParams`).
 */
export const useSettingsStore = create((set) => ({
  company: { ...companySettings },
  defaults: { ...quoteDefaults },
  security: { ...securitySettings },
  notifications: { ...notificationSettings },
  data: { ...dataSettings },
  sessions: [...activeSessions],

  /** `setField("company", "phone")` returns the change handler for one field. */
  setField: (section, key) => (value) =>
    set((state) => ({ [section]: { ...state[section], [key]: value } })),

  revokeSession: (id) =>
    set((state) => ({ sessions: state.sessions?.filter((session) => session?.id !== id) })),
}));
