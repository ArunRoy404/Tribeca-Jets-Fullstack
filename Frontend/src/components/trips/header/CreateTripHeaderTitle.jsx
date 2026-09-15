import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function CreateTripHeaderTitle({ backUrl = "/dashboard/trips" }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={backUrl}
        className="flex items-center justify-center rounded-sm border border-border size-7 shrink-0 hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <div className="flex flex-col">
        <h1 className="font-montserrat font-bold text-[20px] text-foreground">Create New Operations</h1>
        <p className="font-montserrat text-[13px] text-muted-foreground">
          Add trip, client, operator, scheduling, and financial information.
        </p>
      </div>
    </div>
  );
}
