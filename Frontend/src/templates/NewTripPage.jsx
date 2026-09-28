"use client";

import { useEffect } from "react";
import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import NotFoundState from "@/components/common/NotFoundState";
import CreateTripHeaderTitle from "@/components/trips/header/CreateTripHeaderTitle";
import CreateTripForm from "@/components/trips/CreateTripForm";
import { useTrip } from "@/hooks/trips";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Create a trip, or edit one (`tripId`). The draft store is seeded once per
 * visit — from the saved trip when editing, empty when creating — so a draft
 * left behind by an earlier visit never leaks into this one. The store's own
 * `editingId` says whether it already holds this trip.
 */
export default function NewTripPage({ tripId = null }) {
  const { data: trip, isPending, error } = useTrip(tripId);
  const loadTrip = useCreateTripStore((s) => s.loadTrip);
  const reset = useCreateTripStore((s) => s.reset);
  const editingId = useCreateTripStore((s) => s.editingId);

  useEffect(() => {
    if (!tripId) reset();
  }, [tripId, reset]);

  useEffect(() => {
    if (tripId && trip && editingId !== tripId) loadTrip(trip);
  }, [tripId, trip, editingId, loadTrip]);

  if (tripId && error) {
    return <NotFoundState itemType="Trip" backUrl="/dashboard/trips" backLabel="Back to Trips" />;
  }

  const editing = Boolean(tripId);
  const breadcrumbs = [
    { label: "Operations" },
    { label: "All Operations", href: "/dashboard/trips" },
    { label: editing ? `Edit TJ-${trip?.reference ?? ""}` : "Create Operation" },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      <DetailHeader breadcrumbs={breadcrumbs} titleContent={<CreateTripHeaderTitle editing={editing} reference={trip?.reference} />} />
      <CommonCard className="m-4 md:m-6">
        {editing && (isPending || editingId !== tripId) ? (
          <p className="p-6 font-montserrat text-[13px] text-muted-foreground">Loading trip…</p>
        ) : (
          <CreateTripForm />
        )}
      </CommonCard>
    </div>
  );
}
