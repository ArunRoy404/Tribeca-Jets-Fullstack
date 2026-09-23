"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/uploads";

/**
 * The one uploader in this application.
 *
 * Every screen that accepts a file uses this: a broker's tax forms, aircraft
 * photographs, referral attachments, company resources. It posts the bytes,
 * receives a URL, and hands that URL back through `onUploaded` — the caller
 * then stores the string on whatever record it is editing.
 *
 * **That indirection is the point.** Because the upload happens before the
 * record is saved, a photograph can be chosen on a *create* form, for a row
 * that does not exist yet. A component that uploaded straight onto a record
 * could not do that, and every create form would have to save first and upload
 * second — leaving a record with no picture whenever the second call failed.
 *
 * `visibility` is a required decision rather than a default, because the two
 * answers are not interchangeable: an aircraft photograph every broker needs
 * to see is `PUBLIC`, and a 1099 is not. Making the call site say which means
 * nobody has to remember what the default was.
 */
export default function FileUpload({
  kind = "document",
  visibility = "PRIVATE",
  ownerUserId,
  label: fileLabel,
  accept,
  onUploaded,
  disabled = false,
  buttonLabel,
  className = "",
}) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const { mutate: upload, isPending } = useUploadFile();

  const busy = isPending || disabled;

  const handlePick = (event) => {
    const file = event?.target?.files?.[0];
    // Reset immediately, so choosing the same file twice in a row still fires
    // a change event — a re-upload is a legitimate action, and the API answers
    // it with the record it already holds.
    if (event?.target) event.target.value = "";
    if (!file) return;

    setPendingName(file.name);
    setProgress(0);

    upload(
      {
        file,
        kind,
        visibility,
        ownerUserId,
        label: fileLabel,
        onProgress: setProgress,
      },
      {
        onSettled: () => {
          setProgress(null);
          setPendingName(null);
        },
        onSuccess: (data) => onUploaded?.(data),
      },
    );
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handlePick}
        disabled={busy}
      />

      <Button
        type="button"
        variant="outline"
        className="gap-2 px-4 w-fit"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        {buttonLabel || (kind === "image" ? "Upload Image" : "Upload Document")}
      </Button>

      {/* Only while something is actually in flight. A progress bar sitting at
          zero when nothing is happening reads as a stuck upload. */}
      {pendingName ? (
        <div className="flex items-center gap-2 w-full max-w-100">
          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
          <span className="font-montserrat text-[12px] text-muted-foreground truncate min-w-0">
            {pendingName}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden min-w-10">
            <div
              className="h-full bg-purple transition-all duration-200"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <span className="font-montserrat text-[11px] text-muted-foreground tabular-nums shrink-0">
            {progress ?? 0}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * What each route accepts, for the file picker's own dialog.
 *
 * A hint, not a check — the browser filters by extension and the server decides
 * by reading the bytes. Keeping them roughly in step just means the picker does
 * not offer files that will be refused.
 */
export const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  document:
    ".pdf,.docx,.xlsx,.csv,.txt,application/pdf," +
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
    "text/plain,text/csv",
};
