"use client";

import { useMutation } from "@tanstack/react-query";
import { charterRatesService } from "@/services/charterRates.service";
import { invalidate } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { toastApiError, toastSuccess } from "@/lib/toast";
import { formatAircraftCategory } from "@/lib/aircraft";

/** Saves one category's rates. The API refuses anyone but an administrator. */
export function useSetCharterRate() {
  return useMutation({
    mutationFn: charterRatesService.set,
    onSuccess: (data) => {
      invalidate(queryKeys.charterRates.all);
      toastSuccess("Rates saved", formatAircraftCategory(data?.category));
    },
    onError: (error) => toastApiError(error, "Could not save those rates"),
  });
}
