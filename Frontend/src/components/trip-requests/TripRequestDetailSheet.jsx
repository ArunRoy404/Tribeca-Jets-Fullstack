"use client";

import Link from "next/link";
import { Edit2, ExternalLink, RotateCcw, Search, Trash2, User, XCircle } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import FlightRouteStrip from "@/components/common/FlightRouteStrip";
import TableStatus from "@/components/table/common/TableStatus";
import { Button } from "@/components/ui/button";
import { useTripRequestsStore } from "@/store/useTripRequestsStore";
import {
  useRestoreTripRequest,
  useTripRequest,
  useUpdateTripRequest,
} from "@/hooks/trip-requests";
import { toTripRequestRow } from "@/lib/lead";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module, Reach } from "@/lib/access";
import { isAdministratorRole } from "@/lib/roles";
import { useCurrentUser } from "@/hooks/auth";

export default function TripRequestDetailSheet() {
  const selectedRequestId = useTripRequestsStore((s) => s.selectedRequestId);
  const closeDetailSheet = useTripRequestsStore((s) => s.closeDetailSheet);
  const openEditModal = useTripRequestsStore((s) => s.openEditModal);
  const openArchiveModal = useTripRequestsStore((s) => s.openArchiveModal);

  const { canAccess, reachOf } = usePermissions();
  const { data: currentUser } = useCurrentUser();

  const mayEdit =
    canAccess(Module.TRIP_REQUESTS, Action.EDIT) ||
    canAccess(Module.LEADS_AGENTS, Action.EDIT);
  const mayArchive =
    canAccess(Module.TRIP_REQUESTS, Action.ARCHIVE) ||
    canAccess(Module.LEADS_AGENTS, Action.ARCHIVE) ||
    reachOf(Module.TRIP_REQUESTS) === Reach.ALL ||
    isAdministratorRole(currentUser?.role);

  const { data, isPending, error, refetch } = useTripRequest(selectedRequestId, {
    enabled: Boolean(selectedRequestId),
  });
  const request = data ? toTripRequestRow(data) : null;

  const { mutate: updateRequest, isPending: isUpdating } = useUpdateTripRequest();
  const { mutate: restoreRequest, isPending: isRestoring } = useRestoreTripRequest();

  const isArchived = Boolean(request?.isArchived);

  return (
    <DetailSheet
      open={Boolean(selectedRequestId)}
      onOpenChange={(open) => !open && closeDetailSheet()}
      resetKey={selectedRequestId}
    >
      {(isPending || error) && (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      )}

      {request && (
        <>
          {/* Header */}
          <div className="border-b border-secondary flex items-start justify-between pb-4 w-full">
            <div className="flex flex-col gap-1.5 items-start">
              <div className="flex gap-2.5 items-center flex-wrap">
                <h2 className="font-montserrat font-bold text-[20px] text-foreground">
                  {request.reference}
                </h2>
                {request.status && request.status !== "—" ? (
                  <StatusBadge status={request.status} bordered />
                ) : null}
              </div>
              <p className="font-montserrat text-[12px] text-muted-foreground">
                Filed for <span className="font-semibold text-foreground">{request.clientName}</span>
                {request.brokerName !== "Unassigned" && (
                  <span> · Broker: <strong className="font-semibold text-foreground">{request.brokerName}</strong></span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/clients/${request.clientId}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-purple hover:underline"
              >
                <User className="size-3.5" />
                Client Profile
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>

          {/* Route Strip */}
          <FlightRouteStrip
            from={request.originIcao || request.route?.split("→")?.[0]?.trim() || "TBD"}
            to={request.destinationIcao || request.route?.split("→")?.[1]?.trim() || "TBD"}
            departureLabel={request.departureDate || "No date set"}
            arrivalLabel={request.isRoundTrip ? `Returns ${request.returnDate}` : "One-way"}
            duration={request.isRoundTrip ? "Round Trip" : "One Way"}
          />

          {/* Client & Broker Overview Card */}
          <SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <DetailField label="CLIENT" value={request.clientName} labelClassName="text-[12px]" />
              <DetailField label="COMPANY" value={request.clientCompany || "—"} labelClassName="text-[12px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <DetailField label="EMAIL" value={request.clientEmail} valueClassName="break-all" labelClassName="text-[12px]" />
              <DetailField label="PHONE" value={request.clientPhone} labelClassName="text-[12px]" />
            </div>
          </SectionCard>

          {/* Flight Specs Card */}
          <SectionCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <DetailField label="BUDGET" value={request.estimatedValue} labelClassName="text-[12px]" />
              <DetailField label="PASSENGERS" value={request.passengers} labelClassName="text-[12px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <DetailField label="AIRCRAFT PREFERENCE" value={request.aircraftPreference || "No preference"} labelClassName="text-[12px]" />
              <DetailField label="QUOTE DEADLINE" value={request.quoteDeadline} labelClassName="text-[12px]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <DetailField label="SOURCE" value={request.source} labelClassName="text-[12px]" />
              <DetailField label="ASSIGNED BROKER" value={request.brokerName} labelClassName="text-[12px]" />
            </div>
          </SectionCard>

          {/* Summary & Notes */}
          {request.summary && (
            <SectionCard>
              <DetailField label="TRIP SUMMARY" value={request.summary} labelClassName="text-[12px]" />
            </SectionCard>
          )}

          {request.requirements && (
            <SectionCard>
              <DetailField label="REQUIREMENTS & CATERING" value={request.requirements} labelClassName="text-[12px]" valueClassName="whitespace-pre-line font-normal" />
            </SectionCard>
          )}

          {request.internalNotes && (
            <SectionCard className="border-purple/30 bg-purple/5">
              <DetailField label="INTERNAL NOTES (DESK ONLY)" value={request.internalNotes} labelClassName="text-[12px] text-purple" valueClassName="whitespace-pre-line font-normal" />
            </SectionCard>
          )}

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-secondary mt-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/dashboard/operator-sourcing?search=${encodeURIComponent(request.rawReference || request.reference)}`}>
                <Button size="sm" variant="default" className="gap-1.5 bg-[#252832] text-white">
                  <Search className="size-3.5" />
                  Source in Operators
                </Button>
              </Link>

              {mayEdit && !isArchived && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    closeDetailSheet();
                    openEditModal(request);
                  }}
                >
                  <Edit2 className="size-3.5" />
                  Edit
                </Button>
              )}

              {mayEdit && !isArchived && request.rawStatus !== "LOST" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-muted-foreground"
                  disabled={isUpdating}
                  onClick={() => updateRequest({ id: request.id, status: "LOST" })}
                >
                  <XCircle className="size-3.5" />
                  Mark as Lost
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isArchived && mayArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isRestoring}
                  onClick={() => restoreRequest(request)}
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
              )}

              {!isArchived && mayArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    closeDetailSheet();
                    openArchiveModal(request);
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
