"use client";

import { useMutation } from "@tanstack/react-query";
import { tripRequestsService } from "@/services/tripRequests.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";

/**
 * Files an enquiry.
 *
 * Usually called straight after `useCreateClient` by the Add Lead form, which
 * writes a person and what they asked for as two records. Silent on success
 * when `silent` is passed, so that flow raises one toast rather than two.
 */
export function useCreateTripRequest() {
  return useMutation({
    mutationFn: ({ silent, ...payload }) =>
      tripRequestsService.create(payload).then((data) => ({ data, silent })),
    onSuccess: ({ data, silent }) => {
      invalidate(queryKeys.tripRequests.all);
      // The client's own detail page lists its enquiries.
      invalidate(queryKeys.clients.all);
      if (!silent) toastSuccess(`Request TR-${data?.reference} filed`);
    },
    onError: (error) => toastApiError(error, "Could not file this request"),
  });
}
