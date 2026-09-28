"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Edit, RotateCcw, Send, Trash2 } from "lucide-react";
import { useItinerary, useConfirmItinerary, useRemoveItinerary, useRestoreItinerary } from "@/hooks/itineraries";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toItineraryRow } from "@/lib/itinerary";
import DetailSheet from "@/components/common/DetailSheet";
import ItineraryPreview from "@/components/itineraries/ItineraryPreview";
import { Button } from "@/components/ui/button";

/**
 * A saved document. `itineraryId` is the URL-backed selected id
 * (`useItinerariesTableParams`'s `itinerary` field) so a reload or a link
 * from elsewhere in the app reopens the same sheet.
 */
export default function ItineraryDetailSheet({ itineraryId, onClose }) {
  const router = useRouter();
  const { data: item, isPending } = useItinerary(itineraryId);
  const row = item ? toItineraryRow(item) : null;

  const openEditModal = useItinerariesStore((s) => s.openEditModal);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.MANAGE_TRIPS);

  const { mutate: confirmItinerary, isPending: confirming } = useConfirmItinerary();
  const { mutate: removeItinerary, isPending: archiving } = useRemoveItinerary();
  const { mutate: restoreItinerary, isPending: restoring } = useRestoreItinerary();

  const isArchived = Boolean(row?.isArchived);

  return (
    <DetailSheet
      open={Boolean(itineraryId)}
      onOpenChange={(open) => !open && onClose?.()}
      resetKey={itineraryId}
      bodyClassName="gap-6"
    >
      {!isPending && row && (
        <>
          <ItineraryPreview item={row} />

          {row.tripArchived && (
            <p className="font-montserrat text-[12px] text-warning bg-warning/10 border border-warning/30 rounded-md px-3 py-2">
              The trip this document is for has been archived. Restore the trip to edit it.
            </p>
          )}
          {row.sentAtLabel && (
            <p className="font-montserrat text-[12px] text-muted-foreground">Sent to the client · {row.sentAtLabel}</p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-border w-full mt-auto">
            {mayWrite && !isArchived && (
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                onClick={() => openSendModal(row.id)}
              >
                <Send className="size-4" />
                Send to Client
              </Button>
            )}

            {mayWrite && !isArchived && !row.confirmed && (
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                disabled={confirming}
                onClick={() => confirmItinerary(row.id)}
              >
                <CheckCircle className="size-4" />
                Confirm Itinerary
              </Button>
            )}

            {mayWrite && !isArchived && (
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                onClick={() => openEditModal(row.raw)}
              >
                <Edit className="size-4" />
                Edit
              </Button>
            )}

            {mayWrite && !isArchived && (
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium text-destructive hover:text-destructive"
                disabled={archiving}
                onClick={() => removeItinerary(row.id)}
              >
                <Trash2 className="size-4" />
                Archive
              </Button>
            )}

            {mayWrite && isArchived && (
              <Button
                variant="outline"
                className="w-full h-10 text-[13px] gap-2 font-medium"
                disabled={restoring}
                onClick={() => restoreItinerary(row.id)}
              >
                <RotateCcw className="size-4" />
                Restore
              </Button>
            )}

            <Button
              className="w-full h-11 text-[14px] font-medium"
              onClick={() => {
                onClose?.();
                router.push(`/dashboard/trips/${row.tripId}`);
              }}
            >
              View Trip Details
            </Button>
          </div>
        </>
      )}
    </DetailSheet>
  );
}
