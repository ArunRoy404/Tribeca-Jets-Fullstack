"use client";

import { useMutation } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Brings an archived client back, exactly as it was. */
export function useRestoreClient() {
  return useMutation({
    mutationFn: (client) => clientsService.restore(client?.id ?? client),
    onSuccess: (_data, client) => {
      invalidate(queryKeys.clients.all);
      toastSuccess(`${client?.name ?? "Client"} restored`);
    },
    onError: (error) => toastApiError(error, "Could not restore this client"),
  });
}
