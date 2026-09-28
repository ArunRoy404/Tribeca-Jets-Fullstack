import Link from "next/link";
import { Button } from "@/components/ui/button";
import EmptyLegMatchBadge from "@/components/empty-legs/EmptyLegMatchBadge";

/** One empty leg on the dashboard, linking straight to its matches. */
export default function EmptyLegCard({ leg }) {
  return (
    <div className="backdrop-blur-[10px] bg-white/20 border border-border flex flex-col gap-4 items-start p-3 rounded-[5px] w-full">
      <div className="flex gap-4 items-center w-full">
        <div className="flex flex-1 flex-col gap-2 items-start min-w-0">
          <p className="font-montserrat font-bold text-[14px] text-foreground">
            {leg?.origin} → {leg?.destination}
          </p>
          <p className="font-montserrat font-normal text-[12px] text-muted-foreground truncate max-w-full">
            {[leg?.aircraft, leg?.operator].filter((v) => v && v !== "—").join(" · ") || "Aircraft not recorded"}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0 text-right">
          <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">{leg?.date}</p>
          <EmptyLegMatchBadge count={leg?.matchCount} dateCount={leg?.dateMatchCount} />
        </div>
      </div>
      <Button variant="outline" size="sm" render={<Link href={`/dashboard/empty-legs?leg=${leg?.id}`} />}>
        View Matches
      </Button>
    </div>
  );
}
