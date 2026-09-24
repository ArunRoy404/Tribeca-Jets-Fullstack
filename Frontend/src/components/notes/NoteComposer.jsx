"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Matches the API's cap, which exists to catch a paste accident. */
const MAX = 5000;

/**
 * The box a note is written in — new, or editing an existing one.
 *
 * Deliberately uncontrolled from the outside: the draft is local, disposable
 * state that nothing else needs to read, which is exactly the line the project
 * draws around `useState`.
 *
 * The visibility control is a checkbox rather than a dropdown because the
 * choice is not symmetric. INTERNAL is what a note is unless somebody decides
 * otherwise, and a dropdown showing two equal options invites picking either;
 * an unticked box says "this stays on the desk" without asking.
 */
export default function NoteComposer({
  initialBody = "",
  initialVisibility = "INTERNAL",
  submitLabel = "Add note",
  placeholder = "What happened? This goes on the record with your name and the time.",
  onSubmit,
  onCancel,
  isPending = false,
  className,
}) {
  const [body, setBody] = useState(initialBody);
  const [shared, setShared] = useState(initialVisibility === "SHARED");

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX;
  const canSave = trimmed.length > 0 && !tooLong && !isPending;

  const submit = (event) => {
    event.preventDefault();
    if (!canSave) return;
    onSubmit?.({ body: trimmed, visibility: shared ? "SHARED" : "INTERNAL" });
    // Only a *new* note clears itself. An edit keeps what was typed until its
    // parent unmounts the composer, so a failed save does not lose the text.
    if (!initialBody) {
      setBody("");
      setShared(false);
    }
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-3", className)}>
      <Textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={MAX + 1}
        aria-invalid={tooLong || undefined}
        className="min-h-20 font-montserrat text-[13px]"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 font-montserrat text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            checked={shared}
            onChange={(event) => setShared(event.target.checked)}
            className="size-3.5 accent-primary"
          />
          Share with the referring agent
        </label>

        <div className="flex items-center gap-2">
          {tooLong && (
            <span className="font-montserrat text-[11px] text-destructive">
              {trimmed.length.toLocaleString()} / {MAX.toLocaleString()}
            </span>
          )}
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!canSave}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
