"use client";

import { useEffect } from "react";
import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import NotFoundState from "@/components/common/NotFoundState";
import CreateTripHeaderTitle from "@/components/trips/header/CreateTripHeaderTitle";
import CreateTripForm from "@/components/trips/CreateTripForm";
import { useTripRequest } from "@/hooks/trip-requests";
import { useTrip } from "@/hooks/trips";
import { useCreateTripStore } from "@/store/useCreateTripStore";

/**
 * Create a trip, or edit one (`tripId`). The draft store is seeded once per
 * visit — from the saved trip when editing, empty when creating — so a draft
 * left behind by an earlier visit never leaks into this one. The store's own
 * `editingId` says whether it already holds this trip.
 */
export default function NewTripPage({ tripId = null, fromRequest = null }) {
  const { data: trip, isPending, error } = useTrip(tripId);
  const requestId = !tripId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fromRequest ?? "") ? fromRequest : null;
  const requestQuery = useTripRequest(requestId);
  const loadRequest = useCreateTripStore((s) => s.loadRequest);
  const fromRequestId = useCreateTripStore((s) => s.fromRequestId);
  const loadTrip = useCreateTripStore((s) => s.loadTrip);
  const reset = useCreateTripStore((s) => s.reset);
  const editingId = useCreateTripStore((s) => s.editingId);

  useEffect(() => {
    if (!tripId) reset();
  }, [tripId, fromRequest, reset]);

  useEffect(() => {
    if (!tripId && requestQuery.data && fromRequestId !== requestId) loadRequest(requestQuery.data);
  }, [tripId, requestId, requestQuery.data, fromRequestId, loadRequest]);

  useEffect(() => {
    if (tripId && trip && editingId !== tripId) loadTrip(trip);
  }, [tripId, trip, editingId, loadTrip]);

  useEffect(() => {
    if (tripId && editingId === tripId && window.location.hash === "#financials") {
      const section = document.getElementById("financials");
      section?.scrollIntoView({ block: "start" });
      section?.focus({ preventScroll: true });
    }
  }, [tripId, editingId]);

  if ((!tripId && fromRequest && (!requestId || requestQuery.error || (requestQuery.data && (requestQuery.data.deletedAt || ["CONVERTED", "LOST"].includes(requestQuery.data.status))))) || (tripId && error)) {
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
        {(editing && (isPending || editingId !== tripId)) || (requestId && (requestQuery.isPending || fromRequestId !== requestId)) ? (
          <p className="p-6 font-montserrat text-[13px] text-muted-foreground">Loading trip…</p>
        ) : (
          <CreateTripForm />
        )}
      </CommonCard>
    </div>
  );
}
