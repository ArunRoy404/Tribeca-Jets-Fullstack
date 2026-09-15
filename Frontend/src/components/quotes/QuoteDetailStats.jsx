"use client";

import BgPanel from "@/components/common/BgPanel";
import { ArrowRight } from "lucide-react";

export default function QuoteDetailStats({ quote }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch justify-center w-full">
      {/* 1. Client */}
      <BgPanel
        src="/dashboard/bg/topnav-hero.png"
        imageOpacity="opacity-10"
        blur="backdrop-blur-[150px]"
        rounded="rounded-lg"
        sizes="300px"
        className="flex-1 min-w-0 border border-border"
        contentClassName="flex flex-col gap-1 p-3 sm:p-4 w-full"
      >
        <p className="font-montserrat font-normal text-[10px] sm:text-[12px] text-muted-foreground uppercase tracking-wider">
          CLIENT
        </p>
        <p className="font-montserrat font-bold text-[13px] sm:text-[16px] text-foreground truncate">
          {quote.client.toUpperCase()}
        </p>
      </BgPanel>

      {/* 2. Route */}
      <BgPanel
        src="/dashboard/bg/topnav-hero.png"
        imageOpacity="opacity-10"
        blur="backdrop-blur-[150px]"
        rounded="rounded-lg"
        sizes="300px"
        className="flex-1 min-w-0 border border-border"
        contentClassName="flex flex-col gap-1 p-3 sm:p-4 w-full"
      >
        <p className="font-montserrat font-normal text-[10px] sm:text-[12px] text-muted-foreground uppercase tracking-wider">
          ROUTE
        </p>
        <div className="flex items-center gap-1.5 font-montserrat font-bold text-[13px] sm:text-[16px] text-foreground">
          <span>{quote.origin}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" />
          <span>{quote.destination}</span>
        </div>
      </BgPanel>

      {/* 3. Aircraft */}
      <BgPanel
        src="/dashboard/bg/topnav-hero.png"
        imageOpacity="opacity-10"
        blur="backdrop-blur-[150px]"
        rounded="rounded-lg"
        sizes="300px"
        className="flex-1 min-w-0 border border-border"
        contentClassName="flex flex-col gap-1 p-3 sm:p-4 w-full"
      >
        <p className="font-montserrat font-normal text-[10px] sm:text-[12px] text-muted-foreground uppercase tracking-wider">
          AIRCRAFT
        </p>
        <p className="font-montserrat font-bold text-[13px] sm:text-[16px] text-foreground truncate">
          {quote.aircraft.toUpperCase()}
        </p>
      </BgPanel>

      {/* 4. Total Price */}
      <BgPanel
        src="/dashboard/bg/topnav-hero.png"
        imageOpacity="opacity-10"
        blur="backdrop-blur-[150px]"
        rounded="rounded-lg"
        sizes="300px"
        className="flex-1 min-w-0 border border-border"
        contentClassName="flex flex-col gap-1 p-3 sm:p-4 w-full"
      >
        <p className="font-montserrat font-normal text-[10px] sm:text-[12px] text-muted-foreground uppercase tracking-wider">
          TOTAL PRICE
        </p>
        <p className="font-montserrat font-bold text-[14px] sm:text-[18px] text-success truncate">
          {quote.totalPriceFormatted}
        </p>
      </BgPanel>

      {/* 5. Expiry */}
      <BgPanel
        src="/dashboard/bg/topnav-hero.png"
        imageOpacity="opacity-10"
        blur="backdrop-blur-[150px]"
        rounded="rounded-lg"
        sizes="300px"
        className="flex-1 min-w-0 border border-border col-span-2 sm:col-span-1"
        contentClassName="flex flex-col gap-1 p-3 sm:p-4 w-full"
      >
        <p className="font-montserrat font-normal text-[10px] sm:text-[12px] text-muted-foreground uppercase tracking-wider">
          EXPIRY
        </p>
        <p className="font-montserrat font-bold text-[13px] sm:text-[16px] text-foreground truncate">
          {quote.expiryDate}
        </p>
      </BgPanel>
    </div>
  );
}

