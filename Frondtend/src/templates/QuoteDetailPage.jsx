"use client";

import { use } from "react";
import QuoteDetailHeader from "@/components/quotes/QuoteDetailHeader";
import QuoteDetailStats from "@/components/quotes/QuoteDetailStats";
import QuoteBreakdownCard from "@/components/quotes/QuoteBreakdownCard";
import QuoteVersionsCard from "@/components/quotes/QuoteVersionsCard";
import FlightDetailsCard from "@/components/quotes/FlightDetailsCard";
import QuoteProfitabilityCard from "@/components/quotes/QuoteProfitabilityCard";
import QuoteStatusActionsCard from "@/components/quotes/QuoteStatusActionsCard";
import QuoteNotesCard from "@/components/quotes/QuoteNotesCard";
import AddQuoteDialog from "@/components/quotes/AddQuoteDialog";
import DeleteQuoteDialog from "@/components/quotes/DeleteQuoteDialog";
import Reveal from "@/components/common/Reveal";
import NotFoundState from "@/components/common/NotFoundState";
import { useQuotesStore } from "@/store/useQuotesStore";

export default function QuoteDetailPage({ params }) {
  const unwrappedParams = use(params);
  const rawId = decodeURIComponent(unwrappedParams?.quoteId || "");

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
      <div className="flex flex-col gap-6 p-4 sm:p-6 pb-12 w-full max-w-7xl mx-auto">
        {/* Header Bar */}
        <Reveal>
          <QuoteDetailHeader
            quote={quote}
            onEdit={() => openAddQuoteModal(quote)}
            onDuplicate={handleDuplicate}
            onDownloadPDF={handleDownloadPDF}
            onSendToClient={handleSendToClient}
          />
        </Reveal>

        {/* 5 KPI Metric Tiles */}
        <Reveal>
          <QuoteDetailStats quote={quote} />
        </Reveal>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
          {/* Left Column: Breakdown, Versions, Flight Details */}
          <div className="flex flex-col gap-6 w-full lg:col-span-2">
            <Reveal className="w-full">
              <QuoteBreakdownCard quote={quote} />
            </Reveal>

            <Reveal className="w-full">
              <QuoteVersionsCard quote={quote} />
            </Reveal>

            <Reveal className="w-full">
              <FlightDetailsCard quote={quote} />
            </Reveal>
          </div>

          {/* Right Column: Profitability, Status Actions, Notes */}
          <div className="flex flex-col gap-6 w-full lg:col-span-1">
            <Reveal className="w-full">
              <QuoteProfitabilityCard quote={quote} />
            </Reveal>

            <Reveal className="w-full">
              <QuoteStatusActionsCard quote={quote} />
            </Reveal>

            <Reveal className="w-full">
              <QuoteNotesCard quote={quote} />
            </Reveal>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddQuoteDialog />
      <DeleteQuoteDialog />
    </>
  );
}
