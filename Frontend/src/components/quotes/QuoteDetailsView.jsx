"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import QuoteHeaderTitle from "@/components/quotes/header/QuoteHeaderTitle";
import QuoteHeaderActions from "@/components/quotes/header/QuoteHeaderActions";
import QuoteDetailStats from "@/components/quotes/header/QuoteDetailStats";
import QuoteBreakdownCard from "@/components/quotes/breakdown/QuoteBreakdownCard";
import QuoteVersionsCard from "@/components/quotes/versions/QuoteVersionsCard";
import FlightDetailsCard from "@/components/quotes/flight/FlightDetailsCard";
import QuoteProfitabilityCard from "@/components/quotes/profitability/QuoteProfitabilityCard";
import QuoteStatusActionsCard from "@/components/quotes/actions/QuoteStatusActionsCard";
import QuoteNotesCard from "@/components/quotes/notes/QuoteNotesCard";

export default function QuoteDetailsView({
  quote,
  onEdit,
  onDuplicate,
  onDownloadPDF,
  onSendToClient,
}) {
  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        className="px-4 sm:px-6 py-4"
        backUrl="/dashboard/quotes"
        backLabel="Back"
        titleContent={<QuoteHeaderTitle quote={quote} />}
        actions={
          <QuoteHeaderActions
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDownloadPDF={onDownloadPDF}
            onSendToClient={onSendToClient}
          />
        }
      />

      {/* 5 Stat Summary KPI Tiles */}
      <div className="px-4 md:px-6 pt-4 sm:pt-6">
        <QuoteDetailStats quote={quote} />
      </div>

      {/* Main Details Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6 border border-border overflow-hidden bg-white">
        {/* 2-Column Section Layout inside CommonCard */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-6 items-start p-4 sm:p-6">
          {/* Left Column: Breakdown, Versions, Flight Details */}
          <div className="flex flex-col gap-6 min-w-0">
            <QuoteBreakdownCard quote={quote} />
            <QuoteVersionsCard quote={quote} />
            <FlightDetailsCard quote={quote} />
          </div>

          {/* Right Sidebar Column: Profitability, Status Actions, Notes */}
          <div className="flex flex-col gap-6 min-w-0">
            <QuoteProfitabilityCard quote={quote} />
            <QuoteStatusActionsCard quote={quote} />
            <QuoteNotesCard quote={quote} />
          </div>
        </div>
      </CommonCard>
    </div>
  );
}
