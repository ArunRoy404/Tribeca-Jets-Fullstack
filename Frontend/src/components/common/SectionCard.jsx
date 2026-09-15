import { cn } from "@/lib/utils";

export default function SectionCard({ title, action, header, children, className, titleClassName }) {
  const showHeader = header || title || action;
  return (
    <div className={cn("border border-border flex flex-col items-start rounded-lg w-full", className)}>
      {showHeader && (
        <div className="border-b border-secondary flex items-center justify-between gap-2 px-4 py-3 w-full">
          {header ?? (
            <>
              <p className={cn("font-montserrat font-bold text-[16px] text-muted-foreground", titleClassName)}>
                {title}
              </p>
              {action}
            </>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4 p-4 w-full">{children}</div>
    </div>
  );
}
