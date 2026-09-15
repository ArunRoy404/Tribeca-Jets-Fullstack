import { Building2, Check, Clock, XCircle } from "lucide-react";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";

export default function QuoteCard({ quote, onApprove, onReject }) {
  const isDecided = quote.status === "Approved" || quote.status === "Rejected";

  return (
    <SectionCard
      header={
        <>
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <div className="bg-primary flex items-center justify-center rounded-full size-8 shrink-0">
              <Building2 className="size-4 text-primary-foreground" />
            </div>
            <p className="font-montserrat font-bold text-[16px] text-muted-foreground truncate">{quote.operator}</p>
          </div>
          <StatusBadge status={quote.status} bordered className="shrink-0" />
        </>
      }
    >
      <div className="flex items-start gap-4 w-full">
        <div className="flex flex-1 flex-col gap-2 items-start min-w-0 border-b border-secondary pb-2 text-[14px]">
          <p className="font-montserrat font-normal text-muted-foreground w-full truncate">
            {quote.aircraft} · {quote.tailNumber}
          </p>
          <p className="font-montserrat font-bold text-success">{quote.price}</p>
          <p className="font-montserrat font-normal text-muted-foreground w-full truncate">{quote.amenities}</p>
        </div>
        <div className="flex items-center gap-2 self-stretch shrink-0 border-b border-secondary pb-2">
          <Clock className="size-4 text-muted-foreground" />
          <p className="font-montserrat font-normal text-[14px] text-muted-foreground whitespace-nowrap">
            {quote.responseTime}
          </p>
        </div>
      </div>

      <div className="flex gap-2 items-start w-full">
        <button
          type="button"
          disabled={isDecided}
          onClick={onApprove}
          className={cn(
            "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-success bg-success/10 font-montserrat font-medium text-[14px] text-success cursor-pointer",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <Check className="size-4" />
          Approve
        </button>
        <button
          type="button"
          disabled={isDecided}
          onClick={onReject}
          className={cn(
            "flex flex-1 gap-2 items-center justify-center px-4 py-2 rounded-sm border border-destructive bg-destructive/10 font-montserrat font-medium text-[14px] text-destructive cursor-pointer",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          <XCircle className="size-4" />
          Reject
        </button>
      </div>
    </SectionCard>
  );
}
