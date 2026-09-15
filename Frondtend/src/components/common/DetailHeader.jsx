import CommonBreadcrumb from "@/components/common/CommonBreadcrumb";
import { cn } from "@/lib/utils";

export default function DetailHeader({
  breadcrumbs = [],
  titleContent,
  actions,
  children,
  className,
}) {
  return (
    <div className={cn("flex flex-col gap-3 bg-white p-4 md:p-6 border-b border-border", className)}>
      {breadcrumbs?.length > 0 && <CommonBreadcrumb items={breadcrumbs} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {titleContent || children}
        {actions}
      </div>
    </div>
  );
}
