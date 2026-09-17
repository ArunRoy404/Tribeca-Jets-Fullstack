"use client";

export default function QuoteBreakdownTotal({ label = "Total Price", total }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 sm:p-4 mt-2 rounded-md bg-[#E8FAF3] border border-success/25">
      <span className="font-montserrat font-bold text-[14px] sm:text-[15px] text-foreground">
        {label}
      </span>
      <span className="font-montserrat font-bold text-[16px] sm:text-[18px] text-success">
        {total}
      </span>
    </div>
  );
}
