import { cn } from "@/lib/utils";

/** One white panel on a settings page: a title, a line under it, then its fields. */
export default function SettingsCard({ title, description, children, className }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 items-start w-full bg-white border border-border rounded-lg p-4 sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 w-full">
        <h3 className="font-montserrat font-semibold text-[16px] sm:text-[18px] leading-normal text-foreground">
          {title}
        </h3>
        {description && (
          <p className="font-montserrat text-[12px] leading-normal text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
