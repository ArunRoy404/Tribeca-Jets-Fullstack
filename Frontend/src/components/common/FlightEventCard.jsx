import { cn } from "@/lib/utils";
import StatusBadge from "@/components/common/StatusBadge";

export default function FlightEventCard({ event, onClick, className }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-secondary flex flex-col gap-1 items-start pl-4 pr-2 py-2 rounded-sm w-full overflow-hidden",
        onClick && "cursor-pointer hover:bg-secondary/70 transition-colors",
        className
      )}
    >
      <div className="absolute inset-y-px left-px w-1 rounded-l-sm bg-primary" />
      <div className="flex items-center justify-between w-full">
        <p className="font-montserrat font-medium text-[10px] text-foreground">{event.id}</p>
        <StatusBadge status={event.status} bordered className="text-[10px]" />
      </div>
      <p className="font-montserrat font-medium text-[10px] text-muted-foreground">{event.client}</p>
      <div className="flex items-center justify-between w-full">
        <p className="font-montserrat font-medium text-[10px] text-foreground">
          {event.from} → {event.to}
        </p>
        <p className="font-montserrat font-medium text-[10px] text-purple">{event.time}</p>
      </div>
      <p className="font-montserrat font-medium text-[10px] text-muted-foreground truncate w-full">
        {event.aircraft} · {event.operator}
      </p>
    </div>
  );
}
