import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** A full-page form's title: a back link, the heading and one line on what the form is for. */
export default function FormPageTitle({ backUrl, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={backUrl}
        className="flex items-center justify-center rounded-sm border border-border size-7 shrink-0 hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <div className="flex flex-col">
        <h1 className="font-montserrat font-bold text-[20px] text-foreground">{title}</h1>
        {description && <p className="font-montserrat text-[13px] text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
