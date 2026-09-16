"use client";

import { useMutation } from "@tanstack/react-query";
import { clientsService } from "@/services/clients.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/** Updates a client. Send only the fields that changed — this is a PATCH. */
export function useUpdateClient() {
  return useMutation({
    mutationFn: ({ id, ...payload }) => clientsService.update({ id, ...payload }),
    onSuccess: (client) => {
      invalidate(queryKeys.clients.all);
      toastSuccess(`${client?.firstName ?? "Client"} updated`);
    },
    onError: (error) => toastApiError(error, "Could not update this client"),
  });
}
