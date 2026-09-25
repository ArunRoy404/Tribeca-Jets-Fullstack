"use client";

import { useRouter } from "next/navigation";
import { Download, Send } from "lucide-react";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import DetailSheet from "@/components/common/DetailSheet";
import ItineraryPreview from "@/components/itineraries/ItineraryPreview";
import { Button } from "@/components/ui/button";

export default function ItineraryDetailSheet() {
  const router = useRouter();
  const selectedItineraryId = useItinerariesStore((s) => s.selectedItineraryId);
  const closeItineraryDetail = useItinerariesStore((s) => s.closeItineraryDetail);
  const getItineraryById = useItinerariesStore((s) => s.getItineraryById);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);

  const item = selectedItineraryId ? getItineraryById(selectedItineraryId) : null;

  return (
    <DetailSheet
      open={!!item}
      onOpenChange={(open) => !open && closeItineraryDetail()}
      resetKey={item?.id}
      bodyClassName="gap-6"
    >
      {item && (
        <>
          <ItineraryPreview item={item} />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-4 border-t border-border w-full mt-auto">
            <Button
              variant="outline"
              className="w-full h-10 text-[13px] gap-2 font-medium"
              onClick={() => alert("Downloading PDF itinerary document...")}
            >
              <Download className="size-4" />
              Download PDF
            </Button>

            <Button
              variant="outline"
              className="w-full h-10 text-[13px] gap-2 font-medium"
              onClick={() => openSendModal(item.id)}
            >
              <Send className="size-4" />
              Send to Client
            </Button>

            <Button
              className="w-full h-11 text-[14px] font-medium"
              onClick={() => {
                closeItineraryDetail();
                router.push(`/dashboard/trips/${encodeURIComponent(item.id.replace("#", ""))}`);
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
