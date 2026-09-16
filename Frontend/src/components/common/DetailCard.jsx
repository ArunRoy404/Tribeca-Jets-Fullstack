import { cn } from "@/lib/utils";
import Reveal from "@/components/common/Reveal";

export default function DetailCard({ title, description, action, children, className }) {
  return (
    <Reveal className="w-full">
      <div className={cn("flex flex-col gap-4 w-full rounded-md border border-border bg-white p-4 sm:p-5 shadow-card", className)}>
        {(title || action) && (
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
            <div className="flex flex-col gap-0.5">
              {title && <p className="font-montserrat font-bold text-[14px] text-foreground">{title}</p>}
              {description && <p className="font-montserrat text-[12px] text-muted-foreground">{description}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </Reveal>
  );
}
