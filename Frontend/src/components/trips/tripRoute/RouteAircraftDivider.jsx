import { PlaneTakeoff } from "lucide-react";

export default function RouteAircraftDivider({ aircraft, registration }) {
  return (
    <div className="flex items-center gap-4 my-2">
      <div className="flex items-center justify-center size-8 shrink-0">
        <div className="w-px h-8 bg-border/80" />
      </div>
      <div className="flex-1 flex items-center">
        <div className="flex-1 border-t border-border/70" />
        <div className="px-3 flex items-center gap-1.5 font-montserrat text-[12px] text-purple font-medium whitespace-nowrap">
          <PlaneTakeoff className="size-3.5 text-purple" />
          <span>
            {aircraft} · {registration}
          </span>
        </div>
        <div className="flex-1 border-t border-border/70" />
      </div>
    </div>
  );
}
