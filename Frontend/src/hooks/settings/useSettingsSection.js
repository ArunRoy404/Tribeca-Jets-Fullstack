"use client";

import { useMemo, useState } from "react";
import { useSettings } from "./useSettings";
import { useUpdateSettings } from "./useUpdateSettings";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module } from "@/lib/access";
import { settingsPayload, settingsToForm } from "@/lib/settings";

/**
 * One Settings screen's form: the server's values with this person's edits
 * on top, and a save that sends only what changed.
 *
 * The edits are local and disposable — they belong to this screen until it
 * is saved — while the values themselves come from the API. After a save the
 * edits are dropped and the refetched values show, so the screen always ends
 * on what the server stored.
 *
 * `canEdit` is Settings · Edit. Without it the screen is read-only: no Save,
 * no upload, and every control disabled.
 */
export function useSettingsSection(section) {
  const { data, isPending, error, refetch } = useSettings();
  const { mutate, isPending: isSaving } = useUpdateSettings();
  const { canAccess } = usePermissions();
  const [edits, setEdits] = useState({});

  const saved = useMemo(() => settingsToForm(section, data?.[section]), [section, data]);
  const values = useMemo(() => ({ ...saved, ...edits }), [saved, edits]);
  const payload = settingsPayload(section, values, saved);

  return {
    values,
    isPending,
    error,
    refetch,
    isSaving,
    isDirty: Boolean(payload),
    canEdit: canAccess(Module.SETTINGS, Action.EDIT),
    /** `set("phone")` returns the change handler for one field. */
    set: (key) => (value) => setEdits((current) => ({ ...current, [key]: value })),
    save: () => {
      if (!payload) return;
      mutate(payload, { onSuccess: () => setEdits({}) });
    },
  };
}
