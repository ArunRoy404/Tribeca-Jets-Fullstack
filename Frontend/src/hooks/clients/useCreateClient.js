"use client";

import { useMutation } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Creates a client or travel agent. */
export function useCreateClient() {
  return useMutation({
    mutationFn: (payload) => clientsService.create(payload),
    onSuccess: (client) => {
      // The whole prefix: a new client moves the tiles as well as the list.
      invalidate(queryKeys.clients.all);
      toastSuccess(`${client?.firstName ?? "Client"} ${client?.lastName ?? ""} added`.trim());
    },
    onError: (error) => toastApiError(error, "Could not add this client"),
  });
}
