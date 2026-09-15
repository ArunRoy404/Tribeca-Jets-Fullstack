import Image from "next/image";
import { cn } from "@/lib/utils";

export default function DarkPanel({ title, action, children, className, bodyClassName }) {
  return (
    <div className={cn("relative flex flex-col items-start rounded-md border border-border overflow-hidden w-full", className)}>
      <Image
        src="/dashboard/bg/trips-table.png"
        alt=""
        fill
        className="object-cover opacity-50 pointer-events-none"
        sizes="800px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 to-[#e5eeff]/90 backdrop-blur-2xl pointer-events-none" />

      <div className="relative flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 w-full bg-sidebar">
        <p className="font-montserrat font-bold text-[14px] sm:text-[16px] text-white whitespace-nowrap">{title}</p>
        {action}
      </div>

      <div className={cn("relative w-full", bodyClassName)}>{children}</div>
    </div>
  );
}
