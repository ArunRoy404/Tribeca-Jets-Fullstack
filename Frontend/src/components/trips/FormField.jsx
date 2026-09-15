import { cn } from "@/lib/utils";

/**
 * Label + control + validation message.
 *
 * `error` accepts the API's per-field message. It renders below the control and
 * is announced via `role="alert"`, so a rejected submit is not silent for
 * anyone using a screen reader.
 */
export default function FormField({ label, children, className, labelClassName, error }) {
  return (
    <div className={cn("w-full flex flex-col min-w-0", className)}>
      {label && (
        <p className={cn("mb-1.5 font-montserrat font-medium text-[13px] text-foreground", labelClassName)}>
          {label}
        </p>
      )}
      {children}
      {error && (
        <p role="alert" className="mt-1.5 font-montserrat text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
