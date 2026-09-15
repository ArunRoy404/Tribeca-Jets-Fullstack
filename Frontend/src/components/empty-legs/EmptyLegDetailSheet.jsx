"use client";

import { useRef, useEffect } from "react";
import { Plane, UserCheck, Check, Clock, Edit, Trash2 } from "lucide-react";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailField from "@/components/common/DetailField";

export default function EmptyLegDetailSheet() {
  const selectedLegId = useEmptyLegsStore((s) => s.selectedLegId);
  const closeLegDetail = useEmptyLegsStore((s) => s.closeLegDetail);
  const getLegById = useEmptyLegsStore((s) => s.getLegById);
  const openEditModal = useEmptyLegsStore((s) => s.openEditModal);
  const openDeleteModal = useEmptyLegsStore((s) => s.openDeleteModal);
  const updateEmptyLeg = useEmptyLegsStore((s) => s.updateEmptyLeg);

  const item = selectedLegId ? getLegById(selectedLegId) : null;
  const contentRef = useRef(null);

  useEffect(() => {
    if (item && contentRef.current) {
      contentRef.current.scrollTop = 0;
      const timer = setTimeout(() => {
        if (contentRef.current) contentRef.current.scrollTop = 0;
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [item]);

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && closeLegDetail()}>
      <SheetContent
        ref={contentRef}
        className="data-[side=right]:w-full sm:data-[side=right]:max-w-175 gap-6 p-6 overflow-y-auto"
      >
        {item && (
          <div className="flex flex-col gap-6 w-full">
            {/* Sheet Title */}
            <div className="flex items-center justify-between border-b border-border pb-3 w-full">
              <h2 className="font-montserrat font-bold text-[18px] text-foreground">
                Empty Leg Details
              </h2>
            </div>

            {/* Flight Route Banner */}
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-purple text-white flex items-center justify-center shrink-0">
                  <Plane className="size-5 rotate-90" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-montserrat font-bold text-[18px] text-foreground">
                    {item.origin} <span className="font-normal text-muted-foreground">→</span> {item.destination}
                  </h3>
                  <p className="font-montserrat text-[12px] text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <StatusBadge status={item.status} bordered />
            </div>

            {/* Metadata Card Box */}
            <div className="border border-border rounded-lg p-4 bg-white shadow-card grid grid-cols-2 gap-4">
              <DetailField label="AIRCRAFT" value={item.aircraft} labelClassName="text-[12px]" />
              <DetailField
                label="OPERATOR"
                value={
                  <div className="flex items-center gap-1.5 text-purple font-bold">
                    <span className="size-2 rounded-full bg-purple inline-block" />
                    {item.operator}
                  </div>
                }
                labelClassName="text-[12px]"
              />
              <DetailField
                label="Price"
                value={<span className="text-success font-bold">{item.price}</span>}
                labelClassName="text-[12px]"
              />
              <DetailField
                label="Expiry"
                value={<span className="text-destructive font-bold">{item.expiry}</span>}
                labelClassName="text-[12px]"
              />
              <DetailField
                label="Client Matches"
                value={<span className="text-success font-bold">{item.matches}</span>}
                labelClassName="text-[12px]"
              />
            </div>

            {/* Actions Block */}
            <div className="flex flex-col gap-3 w-full">
              <h3 className="font-montserrat font-bold text-[15px] text-foreground">
                Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <Button
                  variant="outline"
                  className="border-success text-success hover:bg-success/10 font-medium text-[13px] gap-2 h-10"
                  onClick={() => updateEmptyLeg(item.id, { status: "Matched" })}
                >
                  <UserCheck className="size-4" />
                  Match Client
                </Button>

                <Button
                  variant="outline"
                  className="border-info text-info hover:bg-info/10 font-medium text-[13px] gap-2 h-10"
                  onClick={() => updateEmptyLeg(item.id, { status: "Booked" })}
                >
                  <Check className="size-4" />
                  Book Leg
                </Button>

                <Button
                  variant="outline"
                  className="border-warning text-warning hover:bg-warning/10 font-medium text-[13px] gap-2 h-10"
                  onClick={() => updateEmptyLeg(item.id, { status: "Expired" })}
                >
                  <Clock className="size-4" />
                  Expire
                </Button>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="border-t border-border flex items-center justify-between pt-4 w-full mt-auto">
              <Button
                variant="outline"
                className="gap-2 px-5 font-medium"
                onClick={() => openEditModal(item)}
              >
                <Edit className="size-4" />
                Edit
              </Button>

              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 gap-2 px-5 font-medium"
                onClick={() => openDeleteModal(item.id)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
