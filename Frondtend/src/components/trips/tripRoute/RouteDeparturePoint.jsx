export default function RouteDeparturePoint({ code, time, airportName, city }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex items-center justify-center rounded-full bg-[#252832] text-white size-8 shrink-0 font-montserrat font-bold text-[10px] uppercase">
        {code}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
        <p className="font-montserrat font-bold text-[14px] text-foreground">{airportName}</p>
        <p className="font-montserrat text-[12px] text-muted-foreground">{city}</p>
        {time && (
          <span className="mt-1.5 w-fit rounded-sm bg-secondary px-2.5 py-1 font-montserrat text-[11px] text-muted-foreground">
            Departure · {time}
          </span>
        )}
      </div>
    </div>
  );
}
