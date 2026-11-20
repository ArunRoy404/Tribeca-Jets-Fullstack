"use client";

import { toastError, toastSuccess } from "@/lib/toast";

export function useCopyToClipboard({ success = "Copied", failure = "Could not copy" } = {}) {
  return async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toastSuccess(success);
    } catch {
      toastError(failure);
    }
  };
}
