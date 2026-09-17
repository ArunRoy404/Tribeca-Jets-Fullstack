"use client";

export default function FlightDetailField({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="font-montserrat text-[11px] sm:text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <div className="font-montserrat font-bold text-[13px] sm:text-[14px] text-foreground truncate">
        {children}
      </div>
    </div>
  );
}
