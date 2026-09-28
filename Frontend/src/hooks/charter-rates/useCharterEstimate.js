"use client";

import { useMutation } from "@tanstack/react-query";
import { charterRatesService } from "@/services/charterRates.service";
import { toastApiError } from "@/lib/toast";

/**
 * Client adjustment #6's instant estimate. A mutation, like the price
 * preview: the inputs change as the broker picks, nothing is cached by key,
 * and nothing is saved. The error toast matters here — "no coordinates on
 * file for KXYZ" is the one failure the broker can act on.
 */
export function useCharterEstimate() {
  return useMutation({
    mutationFn: charterRatesService.estimate,
    onError: (error) => toastApiError(error, "Could not estimate that route"),
  });
}
