import { cn } from "@/lib/utils";
import CommonCard from "@/components/common/CommonCard";

const VALUE_TONE_CLASSES = {
  foreground: "text-foreground",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
  success: "text-success",
  purple: "text-purple",
};

export default function SimpleStatCard({ label, value, tone = "foreground", className }) {
  return (
    <CommonCard variant="stat" className={cn("flex-1 min-w-0 h-full", className)}>
      <div className="flex flex-col gap-1 sm:gap-2 items-center w-full">
        <p className="font-montserrat font-normal text-[10px] sm:text-[14px] text-muted-foreground w-full truncate">
          {label}
        </p>
        <p
          className={cn(
            "font-montserrat font-bold text-[15px] sm:text-[20px] w-full",
            VALUE_TONE_CLASSES[tone ?? "foreground"]
          )}
        >
          {value}
        </p>
      </div>
    </CommonCard>
  );
}
