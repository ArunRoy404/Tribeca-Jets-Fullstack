"use client";

import { useMutation } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Archives a client. Soft delete — trips, quotes and payments will reference
 * it, and the record can be brought back from the Archived tab.
 *
 * Administrators only: a broker holds MANAGE_CLIENTS at assigned scope, which
 * covers creating and editing their own book but not removing from it.
 */
export function useRemoveClient() {
  return useMutation({
    mutationFn: (client) => clientsService.remove(client?.id ?? client),
    onSuccess: (_data, client) => {
      invalidate(queryKeys.clients.all);
      toastSuccess(`${client?.name ?? "Client"} removed`);
    },
    onError: (error) => toastApiError(error, "Could not remove this client"),
  });
}
