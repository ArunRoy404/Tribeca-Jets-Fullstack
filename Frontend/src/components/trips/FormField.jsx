import { cn } from "@/lib/utils";

export default function FormField({ label, children, className, labelClassName }) {
  return (
    <div className={cn("w-full flex flex-col min-w-0", className)}>
      {label && (
        <p className={cn("mb-1.5 font-montserrat font-medium text-[13px] text-foreground", labelClassName)}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}
