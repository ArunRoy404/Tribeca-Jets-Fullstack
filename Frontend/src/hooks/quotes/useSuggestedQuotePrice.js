"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";

/**
 * Client adjustment #6's suggested-price selector: the base price at each
 * markup over the operator's cost.
 *
 * A mutation for the same reason as `useQuotePricePreview` — the inputs move
 * with every keystroke and the caller debounces it; nothing is cached by key
 * and nothing is saved. No toast: a suggestion that fails to load simply
 * does not appear, and the broker can still type a price.
 */
export function useSuggestedQuotePrice() {
  return useMutation({
    mutationFn: (payload) => quotesService.suggestedPrice(payload),
  });
}
