"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import QuoteDetailsView from "@/components/quotes/QuoteDetailsView";
import AddQuoteDialog from "@/components/quotes/AddQuoteDialog";
import DeleteQuoteDialog from "@/components/quotes/DeleteQuoteDialog";
import NotFoundState from "@/components/common/NotFoundState";
import TableStatus from "@/components/table/common/TableStatus";
import { useQuotesStore } from "@/store/useQuotesStore";
import { useDuplicateQuote, useQuote } from "@/hooks/quotes";
import { toQuoteRow } from "@/lib/quote";

/**
 * One quote.
 *
 * Archived quotes open here too — the Archived tab links straight to this
 * page, and a detail view that 404s a row the list just showed is worse than
 * one that says "archived" and offers Restore.
 */
export default function QuoteDetailPage({ params, quoteId }) {
  const router = useRouter();
  const unwrapped = params ? use(params) : null;
  const id = decodeURIComponent(quoteId || unwrapped?.quoteId || "");

  const openAddQuoteModal = useQuotesStore((s) => s.openAddQuoteModal);
  const openDeleteQuoteModal = useQuotesStore((s) => s.openDeleteQuoteModal);

  const { data, isPending, error, refetch } = useQuote(id);
  const { mutate: duplicate } = useDuplicateQuote();

  if (isPending) {
    return (
      <div className="p-4 sm:p-6">
        <TableStatus isLoading onRetry={refetch} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <NotFoundState
        itemType="Quote"
        backUrl="/dashboard/quotes"
        backLabel="Back to Quotes"
      />
    );
  }

  const quote = toQuoteRow(data);

  return (
    <>
      <QuoteDetailsView
        quote={quote}
        onEdit={() => openAddQuoteModal(quote)}
        onDuplicate={() =>
          duplicate(quote.id, {
            // Land on the copy, not the original — otherwise the toast says a
            // draft was made and the screen still shows the quote it came from.
            onSuccess: (created) =>
              router.push(`/dashboard/quotes/${created?.id}`),
          })
        }
        onRemove={() => openDeleteQuoteModal(quote)}
      />

      <AddQuoteDialog />
      <DeleteQuoteDialog />
    </>
  );
}
