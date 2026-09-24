"use client";

import { useState } from "react";
import FilterTabs from "@/components/table/common/FilterTabs";
import TableStatus from "@/components/table/common/TableStatus";
import TablePagination from "@/components/table/common/TablePagination";
import NoteComposer from "@/components/notes/NoteComposer";
import TimelineEntry from "@/components/notes/TimelineEntry";
import {
  useCreateNote,
  useNotes,
  useRemoveNote,
  useRestoreNote,
  useTimeline,
  useUpdateNote,
} from "@/hooks/notes";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Scope } from "@/lib/permissions";
import { SUBJECT_PERMISSION } from "@/lib/timeline";

const TABS = ["Timeline", "Notes", "Withdrawn"];
const PAGE_SIZE = 20;

/**
 * A record's timeline, and the box to add to it.
 *
 * Written against `subjectType` / `subjectId` rather than against a client,
 * because the API is: the day Trips ships, its detail page renders this
 * component with `subjectType="TRIP"` and gets the same surface, the same
 * permissions and the same wording.
 *
 * Three views of one thing:
 *
 * - **Timeline** — notes and recorded events interleaved. The reading view.
 * - **Notes** — what people wrote, without the automatic entries.
 * - **Withdrawn** — notes taken off the record, with who did it.
 *
 * The tab is local state rather than a URL param, which is the one place this
 * deliberately differs from a table: it sits inside a tab of a detail page
 * that already owns its own URL state, and adding a second level would put two
 * `tab` params on one address.
 */
export default function NotesTimeline({ subjectType, subjectId }) {
  const [tab, setTab] = useState(TABS[0]);
  const [page, setPage] = useState(1);

  const { data: currentUser } = useCurrentUser();
  const { canWrite, scopeFor } = usePermissions();
  // Which permission governs this record, not a hardcoded MANAGE_CLIENTS —
  // this component is rendered by the trip detail page too.
  const permission = SUBJECT_PERMISSION[subjectType];
  const mayWrite = canWrite(permission);
  // Withdrawing somebody else's note is an administrator's call — the same
  // line the API draws. Authors always get their own, which the row decides.
  const canModerate = scopeFor(permission) === Scope.ALL;

  const isTimeline = tab === "Timeline";
  const archived = tab === "Withdrawn";
  const params = { page, limit: PAGE_SIZE };

  // Only the view being looked at fetches. Both hooks stay mounted so a tab
  // switch reads from cache instead of blanking, but firing both meant every
  // visit to the timeline also pulled a note list nobody had asked for.
  const timeline = useTimeline(subjectType, subjectId, params, {
    enabled: isTimeline,
  });
  const notes = useNotes(
    subjectType,
    subjectId,
    { ...params, archived },
    { enabled: !isTimeline },
  );
  const query = isTimeline ? timeline : notes;

  const create = useCreateNote();
  const update = useUpdateNote();
  const remove = useRemoveNote();
  const restore = useRestoreNote();

  const entries = query.data?.data ?? [];
  const meta = query.data?.meta;

  const changeTab = (next) => {
    setTab(next);
    // Page 4 of the timeline is not page 4 of the withdrawn notes.
    setPage(1);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs options={TABS} value={tab} onValueChange={changeTab} />
        {meta?.total !== undefined && (
          <span className="font-montserrat text-[11px] text-muted-foreground">
            {meta.total} {meta.total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {mayWrite && !archived && (
        <NoteComposer
          isPending={create.isPending}
          onSubmit={(values) => {
            create.mutate({ subjectType, subjectId, ...values });
            // A note written from page 3 lands at the top of page 1. Leaving
            // the pager where it was means the writer saves and sees nothing
            // change, which reads as a failure.
            setPage(1);
          }}
        />
      )}

      <TableStatus
        isLoading={query.isPending}
        error={query.error}
        isEmpty={entries.length === 0}
        emptyMessage={
          archived ? "Nothing has been withdrawn" : "Nothing on the record yet"
        }
        emptyHint={
          archived
            ? "Notes taken off the timeline appear here, with who removed them."
            : mayWrite
              ? "Write the first note above. Everything the system records shows up here too."
              : "Notes and recorded changes will appear here."
        }
        onRetry={query.refetch}
      />

      {entries.length > 0 && (
        <div className="relative flex w-full flex-col gap-4 pl-2">
          {entries.map((entry, index) => (
            <TimelineEntry
              key={`${entry.kind ?? "NOTE"}-${entry.id}`}
              entry={entry}
              isLast={index === entries.length - 1}
              currentUserId={currentUser?.id}
              canModerate={canModerate}
              isSaving={update.isPending}
              onEdit={(values) => update.mutate(values)}
              onRemove={(id) => remove.mutate(id)}
              onRestore={(id) => restore.mutate(id)}
            />
          ))}
        </div>
      )}

      {meta?.totalPages > 1 && (
        <TablePagination
          totalCount={meta.total}
          itemLabel={archived ? "withdrawn notes" : "entries"}
          page={meta.page}
          pageCount={meta.totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
          onPageChange={(next) => setPage(next)}
        />
      )}
    </div>
  );
}
