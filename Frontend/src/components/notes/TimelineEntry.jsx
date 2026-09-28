"use client";

import { useState } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import NoteComposer from "@/components/notes/NoteComposer";
import {
  actorName,
  describeEvent,
  timelineExactTime,
  timelineTime,
  wasEdited,
} from "@/lib/timeline";
import { cn } from "@/lib/utils";

/**
 * One row of a timeline — either a note somebody wrote or an event the system
 * recorded.
 *
 * The two are drawn differently on purpose. A note is a statement by a person
 * and carries their name, their words and their controls; an event is a fact
 * the system logged and carries none. Rendering them identically would let a
 * recorded status change read as something a broker said.
 */
export default function TimelineEntry({
  entry,
  isLast,
  currentUserId,
  canModerate = false,
  onEdit,
  onRemove,
  onRestore,
  isSaving = false,
}) {
  const [editing, setEditing] = useState(false);

  const isNote = entry?.kind === "NOTE";
  const author = isNote ? entry?.createdBy : entry?.actor;
  const withdrawn = Boolean(entry?.deletedAt);

  // The API refuses an edit from anyone but the author, administrators
  // included — so the button is not offered to them either. Withdrawing is
  // wider: moderation does not put words in anybody's mouth.
  const mayEdit = isNote && !withdrawn && entry?.createdById === currentUserId;
  const mayWithdraw = isNote && !withdrawn && (mayEdit || canModerate);
  const mayRestore = isNote && withdrawn && (entry?.createdById === currentUserId || canModerate);

  return (
    <div className="relative flex items-start gap-3.5">
      {!isLast && (
        <div className="absolute left-[15px] top-9 -z-0 h-full w-0.5 bg-border/60" />
      )}

      <div className="z-10 shrink-0">
        {isNote ? (
          <UserAvatar name={actorName(author)} size="sm" className="size-8" />
        ) : (
          <span
            className="flex size-8 items-center justify-center rounded-full bg-secondary"
            aria-hidden="true"
          >
            <span className="size-1.5 rounded-full bg-muted-foreground" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-montserrat text-[12px] font-bold text-foreground sm:text-[13px]">
            {actorName(author)}
          </span>

          {isNote ? (
            <>
              {entry?.visibility === "SHARED" && (
                <span className="rounded-sm bg-purple/10 px-1.5 py-0.5 font-montserrat text-[10px] font-semibold text-purple">
                  Shared with agent
                </span>
              )}
              {withdrawn && (
                <span className="rounded-sm bg-muted px-1.5 py-0.5 font-montserrat text-[10px] font-semibold text-muted-foreground">
                  Withdrawn
                </span>
              )}
            </>
          ) : (
            <span className="font-montserrat text-[12px] text-muted-foreground sm:text-[13px]">
              {describeEvent(entry)}
            </span>
          )}

          <span
            className="font-montserrat text-[11px] text-muted-foreground"
            title={timelineExactTime(entry?.createdAt)}
          >
            · {timelineTime(entry?.createdAt)}
            {isNote && wasEdited(entry) ? " · edited" : ""}
          </span>
        </div>

        {isNote &&
          (editing ? (
            <NoteComposer
              className="mt-1"
              initialBody={entry?.body ?? ""}
              initialVisibility={entry?.visibility}
              submitLabel="Save"
              isPending={isSaving}
              onCancel={() => setEditing(false)}
              onSubmit={(values) => {
                onEdit?.({ id: entry.id, ...values });
                setEditing(false);
              }}
            />
          ) : (
            <p
              className={cn(
                // Preserved line breaks: a note is typed as paragraphs and
                // collapsing them turns a call summary into one run-on line.
                "whitespace-pre-line font-montserrat text-[12px] leading-relaxed text-foreground sm:text-[13px]",
                withdrawn && "text-muted-foreground line-through decoration-border",
              )}
            >
              {entry?.body}
            </p>
          ))}

        {isNote && !editing && (mayEdit || mayWithdraw || mayRestore) && (
          <div className="mt-0.5 flex items-center gap-1">
            {mayEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-montserrat text-[11px] text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
            {mayWithdraw && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-montserrat text-[11px] text-muted-foreground"
                onClick={() => onRemove?.(entry.id)}
              >
                Withdraw
              </Button>
            )}
            {mayRestore && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 font-montserrat text-[11px] text-muted-foreground"
                onClick={() => onRestore?.(entry.id)}
              >
                Restore
              </Button>
            )}
          </div>
        )}

        {withdrawn && entry?.deletedBy && (
          <span className="font-montserrat text-[11px] text-muted-foreground">
            Withdrawn by {actorName(entry.deletedBy)} ·{" "}
            {timelineTime(entry.deletedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
