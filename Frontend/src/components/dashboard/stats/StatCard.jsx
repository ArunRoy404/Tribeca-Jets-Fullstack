import Image from "next/image";
import { cn } from "@/lib/utils";
import CommonCard from "@/components/common/CommonCard";

const TONE_CLASSES = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
  purple: "bg-purple/10 text-purple",
};

const SUBTITLE_CLASSES = {
  muted: "text-muted-foreground",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  foreground: "text-foreground",
};

export default function StatCard({
  icon,
  spark,
  badgeText,
  tone,
  title,
  value,
  subtitle,
  subtitleTone = "muted",
}) {
  return (
    <CommonCard variant="stat" className="h-full justify-between">
      <div className="flex items-start justify-between w-full">
        <div className="bg-secondary border border-border flex items-center justify-center rounded-xl size-7 sm:size-10">
          {icon && <Image src={icon} alt="" width={20} height={20} className="size-3.5 sm:size-5" />}
        </div>
        <div className={cn("flex gap-1 items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg", TONE_CLASSES[tone])}>
          <p className="font-montserrat font-normal text-[8px] sm:text-[10px] whitespace-nowrap">{badgeText}</p>
        </div>
      </div>

      <div className="flex items-end justify-between w-full gap-2 pt-2">
        <div className="flex flex-1 flex-col items-start gap-0.5 sm:gap-1 min-w-0">
          <p className="font-montserrat font-normal text-[10px] sm:text-[16px] text-muted-foreground w-full truncate">{title}</p>
          <p className="font-montserrat font-bold text-[15px] sm:text-[20px] text-foreground w-full">{value}</p>
          <p className={cn("font-montserrat font-normal text-[10px] sm:text-[14px] w-full truncate", SUBTITLE_CLASSES[subtitleTone])}>
            {subtitle}
          </p>
        </div>
        {spark && (
          <Image
            src={spark}
            alt=""
            width={108}
            height={65}
            className="h-8.5 w-14 sm:h-16.25 sm:w-27 shrink-0"
          />
        )}
      </div>
    </CommonCard>
  );
}
