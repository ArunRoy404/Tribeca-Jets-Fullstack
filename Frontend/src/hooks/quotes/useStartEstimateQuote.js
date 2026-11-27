"use client";

import { useMutation } from "@tanstack/react-query";
import { quotesService } from "@/services/quotes.service";
import { useQuotesStore } from "@/store/useQuotesStore";

/** Carries an estimate into a draft, with the company markup decided by the server. */
export function useStartEstimateQuote() {
  return useMutation({
    mutationFn: async (draft) => {
      if (draft?.basePrice !== "" || draft?.operatorCost === undefined) return draft;
      try {
        const result = await quotesService.suggestedPrice({ operatorCost: Number(draft.operatorCost) });
        const price = result?.suggestions?.[0]?.basePrice;
        return { ...draft, basePrice: price == null ? "" : String(price) };
      } catch {
        return draft;
      }
    },
    onSuccess: (draft) => {
      const store = useQuotesStore.getState();
      if (!store?.estimateModalOpen) return;
      store?.openAddQuoteModal?.(null, draft);
      store?.closeEstimateModal?.();
    },
  });
}
