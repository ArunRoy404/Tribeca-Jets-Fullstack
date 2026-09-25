"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";

/**
 * Live pricing for the create/edit form's preview pane.
 *
 * A mutation, not a query: the inputs change on every keystroke, there is
 * nothing to cache by key, and the caller drives it with a debounce rather
 * than React Query's own staleness rules. Persists nothing server-side — see
 * `POST /quotes/price-preview` — so it is safe to call as often as the form
 * changes.
 *
 * No toast, no cache invalidation: this never touches a saved record.
 */
export function useQuotePricePreview() {
  return useMutation({
    mutationFn: (payload) => quotesService.pricePreview(payload),
  });
}
