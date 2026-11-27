"use client";

import { useMutation } from "@tanstack/react-query";
import { tripsService } from "@/services/trips.service";
import { toastApiError } from "@/lib/toast";

/** Explicit preflight read on every Complete click; never reuse a cached balance. */
export function useTripOpenItems() {
  return useMutation({ mutationFn: tripsService.openItems,
    onError: (error) => toastApiError(error, "Could not check this trip's open items"),
  });
}
