export default function RouteArrivalPoint({ code, time, airportName, city }) {
  return (
    <>
      {/* Arrival Pill & Middle Dot */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-8 shrink-0">
          <div className="size-2 rounded-full border border-foreground bg-white" />
        </div>
        {time && (
          <span className="w-fit rounded-sm bg-secondary px-2.5 py-1 font-montserrat text-[11px] text-muted-foreground">
            Arrival · {time}
          </span>
        )}
      </div>

      {/* Line from dot to Arrival Airport */}
      <div className="flex items-start gap-4 mt-1">
        <div className="flex flex-col items-center size-8 shrink-0">
          <div className="w-px h-3 bg-border/80" />
          <div className="flex items-center justify-center rounded-full bg-[#252832] text-white size-8 shrink-0 font-montserrat font-bold text-[10px] uppercase">
            {code}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 pt-3">
          <p className="font-montserrat font-bold text-[14px] text-foreground">{airportName}</p>
          <p className="font-montserrat text-[12px] text-muted-foreground">{city}</p>
        </div>
      </div>
    </>
  );
}
