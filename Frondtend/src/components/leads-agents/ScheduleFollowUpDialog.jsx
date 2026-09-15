"use client";

import { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";
import { useLeadsAgentsStore } from "@/store/useLeadsAgentsStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const followUpOptions = ["Call", "Email", "WhatsApp", "Other"];

export default function ScheduleFollowUpDialog() {
  const open = useLeadsAgentsStore((s) => s.scheduleFollowUpModalOpen);
  const targetLead = useLeadsAgentsStore((s) => s.followUpTargetLead);
  const closeModal = useLeadsAgentsStore((s) => s.closeScheduleFollowUpModal);
  const scheduleFollowUp = useLeadsAgentsStore((s) => s.scheduleFollowUp);

  const [date, setDate] = useState("2026-08-12");
  const [time, setTime] = useState("10:00 AM");
  const [method, setMethod] = useState("Call");
  const [reminder, setReminder] = useState("1 day before");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (targetLead) {
      setDate(targetLead.nextFollowUp || "2026-08-12");
      setTime(targetLead.followUpTime || "10:00 AM");
      setMethod(targetLead.followUpMethod || "Call");
      setReminder("1 day before");
      setNotes("");
    }
  }, [targetLead, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetLead) return;

    scheduleFollowUp(targetLead.id, {
      date,
      time,
      method,
      reminder,
      notes,
      broker: targetLead.broker || "Barry",
    });
    closeModal();
  };

  if (!targetLead && !open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeModal()}>
      <DialogContent className="sm:max-w-160 p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[20px] text-foreground">
            Schedule Follow-up
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            {targetLead ? `${targetLead.name} · ${targetLead.company || "Client"}` : "Follow-up"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="flex flex-col gap-1.5 w-full">
              <label className="font-montserrat text-[13px] font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="font-montserrat text-[13px] font-medium text-foreground">Time</label>
              <Input
                placeholder="10:00 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-10 text-[13px] font-montserrat"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-montserrat text-[13px] font-medium text-foreground">
              Follow-up Method
            </label>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {followUpOptions.map((opt) => {
                const isActive = method === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setMethod(opt)}
                    className={cn(
                      "px-5 py-2 rounded-md font-montserrat text-[13px] font-medium transition-all cursor-pointer border",
                      isActive
                        ? "bg-[#252832] text-white border-[#252832]"
                        : "bg-[#f3f4f8] text-[#252832] border-[#ddddde] hover:bg-white"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-montserrat text-[13px] font-medium text-foreground">Reminder</label>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background font-montserrat text-[13px] text-foreground outline-none focus:ring-1 focus:ring-purple w-full cursor-pointer"
            >
              <option value="1 day before">1 day before</option>
              <option value="2 hours before">2 hours before</option>
              <option value="1 hour before">1 hour before</option>
              <option value="At time of event">At time of event</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label className="font-montserrat text-[13px] font-medium text-foreground">Notes</label>
            <Textarea
              placeholder="What to discuss or prepare…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-24 text-[13px] font-montserrat resize-none"
            />
          </div>

          <div className="flex items-center justify-start gap-3 pt-3 border-t border-border/40 w-full">
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
              className="bg-[#252832] hover:bg-[#252832]/90 text-white h-9 px-5 font-medium text-[13px] gap-1.5 cursor-pointer"
            >
              <Calendar className="size-3.5" />
              Schedule Follow-up
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

