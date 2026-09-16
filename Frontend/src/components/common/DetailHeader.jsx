import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CommonBreadcrumb from "@/components/common/CommonBreadcrumb";
import { cn } from "@/lib/utils";

export default function DetailHeader({
  breadcrumbs = [],
  backUrl,
  backLabel,
  titleContent,
  actions,
  children,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-3 bg-white p-4 md:p-6 border-b border-border", className)}>
      {breadcrumbs?.length > 0 && <CommonBreadcrumb items={breadcrumbs} />}
      {backUrl && (
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 font-montserrat text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          {backLabel || "Back"}
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div className="min-w-0">{titleContent || children}</div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

