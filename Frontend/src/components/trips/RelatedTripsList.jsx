"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plane } from "lucide-react";
import TripCard from "@/components/table/upcoming-trips/TripCard";
import { Button } from "@/components/ui/button";
import { useTrips } from "@/hooks/trips";
import { toTripRow } from "@/lib/trip";

const PAGE_SIZE = 10;

/**
 * One record's trips — a client's, an operator's or an aircraft's — read from
 * `GET /trips` with that record's id as the filter. The one component all
 * three "Trip History" tabs render, rather than three tables that each had
 * their own idea of the columns and their own hardcoded rows.
 *
 * `filter` is `{ clientId }`, `{ operatorId }` or `{ aircraftId }`. Scope is
 * the API's: a broker sees the trips they may see, so a client's tab on a
 * broker's screen never lists another broker's bookings.
 */
export default function RelatedTripsList({ filter, emptyText = "No trips on record yet." }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isPending, error } = useTrips({ ...filter, page, limit: PAGE_SIZE, sortBy: "departureDate", sortOrder: "desc" });
  const rows = (data?.data ?? []).map(toTripRow);
  const meta = data?.meta;

  if (isPending) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (error || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center w-full">
        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground mb-3">
          <Plane className="size-6 text-muted-foreground" />
        </div>
        <p className="font-montserrat font-bold text-[16px] text-foreground">{error ? "Trips could not be loaded" : "No Trip History"}</p>
        <p className="font-montserrat text-[13px] text-muted-foreground mt-1 max-w-sm">{error ? "Try again in a moment." : emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full">
        {rows.map((row) => (
          <TripCard
            key={row.id}
            id={row.reference}
            client={row.client}
            broker={row.broker}
            route={row.route}
            departure={row.departure}
            returnDate={row.returnDate !== "—" ? row.returnDate : undefined}
            aircraft={row.aircraft !== "—" ? row.aircraft : undefined}
            operator={row.operator !== "—" ? row.operator : undefined}
            status={row.status}
            fet={row.fet}
            profit={row.profit}
            onClick={() => router.push(`/dashboard/trips/${row.id}`)}
          />
        ))}
      </div>
      {meta?.totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="font-montserrat text-[12px] text-muted-foreground">
            {meta.total} trips · page {meta.page} of {meta.totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!meta.hasPrevious} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
