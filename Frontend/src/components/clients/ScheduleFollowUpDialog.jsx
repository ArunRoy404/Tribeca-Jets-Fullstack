"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useClientsStore } from "@/store/useClientsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";
import { cn } from "@/lib/utils";

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
  const followUpTargetId = useClientsStore((s) => s.followUpTargetId);
  const closeModal = useClientsStore((s) => s.closeFollowUpModal);
  const getClientById = useClientsStore((s) => s.getClientById);
  const updateClient = useClientsStore((s) => s.updateClient);

  const client = followUpTargetId ? getClientById(followUpTargetId) : null;

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [broker, setBroker] = useState("Barry");
  const [note, setNote] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (client) {
      updateClient(client.id, {
        nextFollowUpDate: date || "Aug 12, 2026",
        nextFollowUpStatus: "Upcoming",
        followUpNote: note,
        broker,
      });
    }
    closeModal();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-140 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-0.5 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Schedule Follow-up
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground font-medium">
            {client?.name || "Hope Sterling"}
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

          {/* Row 2: Priority Pill Buttons */}
          <FieldWrapper label="Priority">
            <div className="flex items-center gap-2">
              {["High", "Medium", "Low"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "px-4 py-1.5 rounded-md font-montserrat text-[13px] font-medium border transition-colors cursor-pointer",
                    priority === p
                      ? "bg-[#252832] text-white border-[#252832]"
                      : "bg-white text-foreground border-border hover:bg-muted"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </FieldWrapper>

          {/* Row 3: Assigned Broker */}
          <FieldWrapper label="Assigned Broker">
            <select
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
            >
              <option value="Barry">Barry</option>
              <option value="Benny">Benny</option>
              <option value="Mark">Mark</option>
              <option value="Ari">Ari</option>
            </select>
          </FieldWrapper>

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
