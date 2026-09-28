"use client";

import NotesTimeline from "@/components/notes/NotesTimeline";

/**
 * The lead's activity: the client timeline, because a lead is a client —
 * notes, status and stage changes, reassignments, and every email the desk
 * sent them (Email Templates, #21), newest first. One timeline for one
 * person, the same the client page's Activity tab shows; never a second copy.
 */
export default function LeadActivityTimelineCard({ leadId }) {
  return (
    <div className="rounded-lg border border-border p-3.5 sm:p-4 bg-white flex flex-col gap-3 shadow-sm">
      <h4 className="font-montserrat font-bold text-[13px] text-foreground">Activity Timeline</h4>
      {leadId ? <NotesTimeline subjectType="CLIENT" subjectId={leadId} /> : null}
    </div>
  );
}
