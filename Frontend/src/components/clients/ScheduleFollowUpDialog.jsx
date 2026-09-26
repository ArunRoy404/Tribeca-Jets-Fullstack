"use client";

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { useUpdateClient } from "@/hooks/clients";
import { useUsers } from "@/hooks/users";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission, Scope } from "@/lib/permissions";
import { BROKER_ROLES } from "@/lib/roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";

function FieldWrapper({ label, children, optional }) {
  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0">
      {label && (
        <label className="font-montserrat text-[13px] font-medium text-foreground flex items-center justify-between">
          <span>{label}</span>
          {optional && <span className="text-muted-foreground font-normal text-[11px]">( Optional )</span>}
        </label>
      )}
      {children}
    </div>
  );
}

export default function ScheduleFollowUpDialog() {
  const open = useClientsStore((s) => s.followUpModalOpen);
  const client = useClientsStore((s) => s.followUpTarget);
  const closeModal = useClientsStore((s) => s.closeFollowUpModal);
  const { mutate: updateClient, isPending } = useUpdateClient();
  // Reassigning is for a role holding the whole book; the picker is not shown
  // to anyone the API would refuse.
  const { scopeFor } = usePermissions();
  const mayAssignBroker = scopeFor(Permission.MANAGE_CLIENTS) === Scope.ALL;

  // Real colleagues, not a hardcoded list of first names.
  const { data: users } = useUsers({ limit: 100 });
  const brokers = useMemo(
    () => (users?.data ?? []).filter((u) => BROKER_ROLES.has(u?.role)),
    [users?.data],
  );

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [broker, setBroker] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client || !date) return;

    // Date and time are two controls but one column. Without a time the
    // follow-up lands at the start of that day, which is what "due today"
    // means anyway.
    const nextFollowUpAt = new Date(`${date}T${time || "00:00"}`);
    if (Number.isNaN(nextFollowUpAt.getTime())) return;

    updateClient(
      {
        id: client.id,
        nextFollowUpAt: nextFollowUpAt.toISOString(),
        followUpNote: note || null,
        ...(mayAssignBroker && broker ? { assignedBrokerId: broker } : {}),
      },
      { onSuccess: closeModal },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-140 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-0.5 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Schedule Follow-up
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground font-medium">
            {client?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          {/* Row 1: Follow-up Date & Follow-up Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <FieldWrapper label="Follow-up Date">
              <DatePicker value={date} onChange={setDate} placeholder="Choose Date" />
            </FieldWrapper>

            <FieldWrapper label="Follow-up Time">
              <TimePicker value={time} onChange={setTime} placeholder="Choose Time" />
            </FieldWrapper>
          </div>

          {/* Row 3: Assigned Broker */}
          {mayAssignBroker && (
            <FieldWrapper label="Assigned Broker">
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
              >
                <option value="">Leave unchanged</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {`${b.firstName} ${b.lastName}`.trim()}
                  </option>
                ))}
              </select>
            </FieldWrapper>
          )}

          {/* Row 4: Notes ( Optional ) */}
          <FieldWrapper label="Notes" optional>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What to discuss or prepare..."
              className="w-full p-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </FieldWrapper>

          {/* Footer Buttons - Right-aligned matching Image 4 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 w-full">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 font-medium text-[13px] gap-1.5"
              onClick={closeModal}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !date}
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-4 font-medium text-[13px] gap-1.5"
            >
              <CalendarIcon className="size-3.5" />
              Schedule Follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
