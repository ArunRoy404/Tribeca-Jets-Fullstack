"use client";

import { useRouter } from "next/navigation";
import { Check, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuotesStore } from "@/store/useQuotesStore";

export default function QuoteStatusActionsCard({ quote }) {
  const router = useRouter();
  const updateQuoteStatus = useQuotesStore((s) => s.updateQuoteStatus);

  const handleMarkApproved = () => {
    updateQuoteStatus(quote.id, "Approved");
  };

  const handleBookLeg = () => {
    router.push(`/dashboard/trips/new?quoteId=${quote.id}`);
  };

  const handleMarkExpired = () => {
    updateQuoteStatus(quote.id, "Expired");
  };

  return (
    <div className="flex flex-col gap-4 w-full rounded-lg border border-border bg-white p-5 sm:p-6 shadow-card">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="font-montserrat font-bold text-[16px] text-foreground">
          Status Actions
        </h3>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {/* Mark Approved */}
        <Button
          type="button"
          variant="outline"
          onClick={handleMarkApproved}
          className="w-full h-11 justify-center gap-2 font-montserrat font-medium text-[13px] border-success/40 text-success bg-success/5 hover:bg-success/15 hover:text-success hover:border-success transition-all cursor-pointer"
        >
          <Check className="size-4 text-success" />
          <span>Mark Approved</span>
        </Button>

        {/* Book Leg */}
        <Button
          type="button"
          variant="outline"
          onClick={handleBookLeg}
          className="w-full h-11 justify-center gap-2 font-montserrat font-medium text-[13px] border-destructive/40 text-destructive bg-destructive/5 hover:bg-destructive/15 hover:text-destructive hover:border-destructive transition-all cursor-pointer"
        >
          <Target className="size-4 text-destructive" />
          <span>Book Leg</span>
        </Button>

        {/* Mark Expired */}
        <Button
          type="button"
          variant="outline"
          onClick={handleMarkExpired}
          className="w-full h-11 justify-center gap-2 font-montserrat font-medium text-[13px] border-warning/40 text-warning bg-warning/5 hover:bg-warning/15 hover:text-warning hover:border-warning transition-all cursor-pointer"
        >
          <Clock className="size-4 text-warning" />
          <span>Mark Expired</span>
        </Button>
      </div>
    </div>
  );
}

