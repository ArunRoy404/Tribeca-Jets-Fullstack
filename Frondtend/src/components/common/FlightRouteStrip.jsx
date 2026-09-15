import { Plane } from "lucide-react";

export default function FlightRouteStrip({ from, to, departureLabel, arrivalLabel, duration }) {
  return (
    <div className="bg-white border border-secondary flex items-center gap-4 p-3 rounded-lg w-full">
      <div className="flex flex-col gap-0.5 items-start text-center">
        <p className="font-montserrat font-bold text-[18px] text-foreground">{from}</p>
        <p className="font-montserrat font-normal text-[12px] text-foreground">{departureLabel}</p>
      </div>
      <div className="flex flex-1 flex-col items-center gap-1">
        <div className="w-full h-px bg-border" />
        <div className="flex flex-col gap-px items-center -mt-3.5 bg-white px-2">
          <p className="font-montserrat font-normal text-[10px] text-foreground">{duration}</p>
          <Plane className="size-3.5 text-muted-foreground rotate-90" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 items-end text-center">
        <p className="font-montserrat font-bold text-[18px] text-foreground">{to}</p>
        <p className="font-montserrat font-normal text-[12px] text-foreground">{arrivalLabel}</p>
      </div>
    </div>
  );
}
