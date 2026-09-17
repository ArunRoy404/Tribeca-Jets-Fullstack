"use client";

import { use } from "react";
import QuoteDetailsView from "@/components/quotes/QuoteDetailsView";
import AddQuoteDialog from "@/components/quotes/AddQuoteDialog";
import DeleteQuoteDialog from "@/components/quotes/DeleteQuoteDialog";
import NotFoundState from "@/components/common/NotFoundState";
import { useQuotesStore } from "@/store/useQuotesStore";

export default function QuoteDetailPage({ params, quoteId }) {
  const unwrappedParams = params ? use(params) : null;
  const rawId = decodeURIComponent(quoteId || unwrappedParams?.quoteId || "");

  const getQuoteById = useQuotesStore((s) => s.getQuoteById);
  const openAddQuoteModal = useQuotesStore((s) => s.openAddQuoteModal);
  const duplicateQuote = useQuotesStore((s) => s.duplicateQuote);
  const updateQuoteStatus = useQuotesStore((s) => s.updateQuoteStatus);

  const quote = getQuoteById(rawId);

  if (!quote) {
    return <NotFoundState itemType="Quote" backUrl="/dashboard/quotes" backLabel="Back to Quotes" />;
  }

  const handleDuplicate = () => {
    duplicateQuote(quote?.id);
    alert(`Quote ${quote?.id} duplicated successfully.`);
  };

  const handleDownloadPDF = () => {
    alert(`Downloading PDF for quote ${quote?.id}...`);
  };

  const handleSendToClient = () => {
    updateQuoteStatus(quote?.id, "Sent");
    alert(`Quote ${quote?.id} has been sent to ${quote?.client}.`);
  };

  return (
    <>
      <QuoteDetailsView
        quote={quote}
        onEdit={() => openAddQuoteModal(quote)}
        onDuplicate={handleDuplicate}
        onDownloadPDF={handleDownloadPDF}
        onSendToClient={handleSendToClient}
      />

      {/* Modals */}
      <AddQuoteDialog />
      <DeleteQuoteDialog />
    </>
  );
}
