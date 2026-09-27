import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** The form page's title — creating an operation, or editing one by reference. */
export default function CreateTripHeaderTitle({ backUrl = "/dashboard/trips", editing = false, reference }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={backUrl}
        className="flex items-center justify-center rounded-sm border border-border size-7 shrink-0 hover:bg-muted"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <div className="flex flex-col">
        <h1 className="font-montserrat font-bold text-[20px] text-foreground">
          {editing ? `Edit TJ-${reference ?? ""}` : "Create New Operation"}
        </h1>
        <p className="font-montserrat text-[13px] text-muted-foreground">
          {editing
            ? "Change the route, aircraft, passengers or price. Status moves on the trip page."
            : "Add trip, client, operator, scheduling, and financial information."}
        </p>
      </div>
    </div>
  );
}
