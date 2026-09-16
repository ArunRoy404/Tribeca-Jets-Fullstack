"use client";

import { useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import { useUpdateClient } from "@/hooks/clients";
import { FOLLOW_UP_METHODS, formatFollowUpMethod } from "@/lib/lead";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/common/DatePicker";

const SELECT_CLASS =
  "h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer";

/** A lead is a client, so the follow-up is stored on the client record. */
export default function ScheduleFollowUpDialog() {
  const open = useLeadsAgentsStore((s) => s.followUpModalOpen);
  const lead = useLeadsAgentsStore((s) => s.followUpTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeFollowUpModal);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <DialogContent className="sm:max-w-130 p-6 flex flex-col gap-4">
        {open && lead ? (
          <FollowUpForm key={lead.id} lead={lead} onDone={closeModal} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FollowUpForm({ lead, onDone }) {
  const { mutate: updateClient, isPending } = useUpdateClient();
  const [date, setDate] = useState(
    lead?.rawNextFollowUpAt ? String(lead.rawNextFollowUpAt).slice(0, 10) : "",
  );
  const [method, setMethod] = useState(lead?.rawFollowUpMethod ?? "");
  const [note, setNote] = useState(lead?.followUpNote ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    updateClient(
      {
        id: lead.id,
        // Clearing the date clears the reminder — null, not an empty string,
        // which the API would reject as an invalid date.
        nextFollowUpAt: date ? new Date(`${date}T00:00`).toISOString() : null,
        followUpMethod: method || null,
        followUpNote: note.trim() || null,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <>
      <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
        <DialogTitle className="font-montserrat font-bold text-[18px] text-foreground">
          Schedule Follow-up
        </DialogTitle>
        <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
          For <span className="font-bold text-foreground">{lead?.name}</span>.
          Clearing the date removes the reminder.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div className="flex flex-col gap-1.5">
            <label className="font-montserrat text-[12px] font-medium text-foreground">Date</label>
            <DatePicker value={date} onChange={setDate} placeholder="Choose Date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-montserrat text-[12px] font-medium text-foreground">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Not decided</option>
              {FOLLOW_UP_METHODS.map((value) => (
                <option key={value} value={value}>
                  {formatFollowUpMethod(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-montserrat text-[12px] font-medium text-foreground">
            Note <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What to cover on the next contact."
            className="w-full p-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-purple resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 w-full border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 font-medium text-[13px] gap-2"
            onClick={onDone}
            disabled={isPending}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#252832] hover:bg-[#252832]/90 text-white h-10 px-5 font-medium text-[13px] gap-2"
            disabled={isPending}
          >
            <CalendarClock className="size-4" />
            {isPending ? "Saving…" : "Save Follow-up"}
          </Button>
        </div>
      </form>
    </>
  );
}
