import { Button } from "@/components/ui/button";

export default function EmptyLegCard({ leg }) {
  return (
    <div className="backdrop-blur-[10px] bg-white/20 border border-border flex flex-col gap-4 items-start p-3 rounded-[5px] w-full">
      <div className="flex gap-4 items-center w-full">
        <div className="flex flex-1 flex-col gap-2 items-start min-w-0">
          <p className="font-montserrat font-bold text-[14px] text-foreground">{leg?.route}</p>
          <p className="font-montserrat font-normal text-[12px] text-muted-foreground">{leg?.aircraft}</p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0 text-right">
          <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">{leg?.date}</p>
          <p className={`font-montserrat font-bold text-[12px] whitespace-nowrap ${leg?.matchTone}`}>
            {leg?.matches}
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm">
        View Match
      </Button>
    </div>
  );
}
