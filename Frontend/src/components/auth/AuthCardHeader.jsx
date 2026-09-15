import { cn } from "@/lib/utils";
import StaggerItem from "@/components/common/StaggerItem";

export default function AuthCardHeader({ title, description, size = "default", subtitleTone = "muted" }) {
  return (
    <StaggerItem className="flex w-full flex-col gap-3">
      <p
        className={cn(
          "font-montserrat font-bold",
          size === "lg" ? "text-[28px] sm:text-[36px] text-foreground" : "text-[26px] sm:text-[32px] text-ink"
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "font-montserrat font-medium text-[16px]",
            subtitleTone === "slate" ? "text-slate" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      )}
    </StaggerItem>
  );
}
