"use client";

import DetailCard from "@/components/common/DetailCard";
import ClientFollowUpBanner from "@/components/clients/ClientFollowUpBanner";
import NotesTimeline from "@/components/notes/NotesTimeline";

/**
 * The client's timeline (adjustment #5).
 *
 * Was a props-fed list of hand-built activity objects with a TODO on top. It
 * now reads the API, which merges what people wrote with what the system
 * recorded — the second half was already in the audit log and needed only to
 * be read alongside the first.
 *
 * The standing "Internal Notes" summary in the sidebar is deliberately *not*
 * this. That field answers "what do I need to know about this person"; the
 * timeline answers "what happened, and when". Editing the first destroys what
 * it said before, which is precisely why the second exists.
 */
export default function ClientActivityTab({
  client,
  onScheduleFollowUp,
  onMarkComplete,
  isCompleting,
}) {
  return (
    <DetailCard className="gap-6 p-4 sm:p-6">
      <NotesTimeline subjectType="CLIENT" subjectId={client?.id} />

      <ClientFollowUpBanner
        client={client}
        onScheduleFollowUp={onScheduleFollowUp}
        onMarkComplete={onMarkComplete}
        isCompleting={isCompleting}
      />
    </DetailCard>
  );
}
