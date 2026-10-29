"use client";

import { useMutation } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

const IMPORT_QUERY_KEYS = {
  CLIENTS: queryKeys.clients.all,
  OPERATORS: queryKeys.operators.all,
  AIRCRAFT: queryKeys.aircraft.all,
  AIRPORTS: queryKeys.airports.all,
};

export function useValidateImport() {
  return useMutation({
    mutationFn: settingsService.validateImport,
    onError: (error) => toastApiError(error, "Could not validate the import file"),
  });
}

export function useCommitImport() {
  return useMutation({
    mutationFn: settingsService.commitImport,
    onSuccess: (data) => {
      const key = IMPORT_QUERY_KEYS[data?.type];
      if (key) invalidate(key);
      invalidate(queryKeys.dashboard.all);
      const count = data?.importedCount ?? 0;
      toastSuccess(
        `Imported ${count} ${count === 1 ? "record" : "records"}`,
        data?.duplicateCount || data?.errorCount
          ? `${data.duplicateCount ?? 0} duplicate(s) and ${data.errorCount ?? 0} invalid row(s) skipped.`
          : undefined,
      );
    },
    onError: (error) => toastApiError(error, "Could not import the file"),
  });
}

