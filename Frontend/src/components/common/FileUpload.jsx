"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { File as FileIcon, Loader2, Paperclip, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadFile } from "@/hooks/uploads";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";
import { ImagePreview } from "@/components/common/image-preview";
import { cn } from "@/lib/utils";

/**
 * The one uploader in this application.
 *
 * Every screen that accepts a file uses this: a broker's tax forms, aircraft
 * photographs, referral attachments, company resources, an itinerary's
 * exterior/cabin photos. It posts the bytes, receives a URL, and hands that
 * URL back through `onUploaded` — the caller then stores the string on
 * whatever record it is editing.
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
 *
 * `variant`:
 * - `"button"` (default) — a button that opens the file picker, with an
 *   inline filename + progress bar while the upload is in flight. The
 *   Documents tab uses this.
 * - `"dropzone"` — a bordered drag-and-drop box with a heading/description.
 *   The box keeps one fixed footprint (`min-h-28`) across every state — empty
 *   prompt, uploading spinner, or a filled row of small `size-14` thumbnails
 *   (a file chip for documents) — so a field never grows or shrinks around
 *   its own content. The Build Itinerary form uses this for the logo, the
 *   aircraft photos and the operator-itinerary import.
 *
 * `multiple` accepts more than one file, accumulating into an array; the
 * caller reads `value` as a string for single uploads or a string array for
 * multiple, and a filled `multiple` field keeps a small "+" tile alongside
 * its thumbnails to add more. Nothing in this codebase needs `multiple` yet,
 * but the Build Itinerary form's photo fields are exactly the single case,
 * and the next uploader that needs several files (a document folder, a
 * gallery) composes this instead of writing a second uploader.
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
  variant = "button",
  multiple = false,
  value,
  onRemove,
  heading,
  description,
}) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // The stored URL is content-addressed (`/uploads/<id>`) and never carries
  // the original filename, so the picked File's own name/type is the only
  // place that information exists — captured here, at pick time, keyed by
  // the URL it resolves to once uploaded, before the File object is gone.
  // Keyed by URL (not "the last pick") so a `multiple` field's caption and
  // image/document treatment stay correct per item, not just for whichever
  // file was chosen most recently.
  const [fileMeta, setFileMeta] = useState({});
  const { mutate: upload, mutateAsync: uploadAsync, isPending } = useUploadFile();

  const busy = isPending || disabled;
  const values = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const hasValue = values.length > 0;
  // "auto" is for a field that accepts either kind (the operator-itinerary
  // importer takes a PDF, a screenshot, or a text file) — the upload API has
  // exactly two routes, so the route is resolved per file from its actual
  // MIME type rather than fixed on the component.
  const resolveKind = (file) => (kind === "auto" ? (file.type.startsWith("image/") ? "image" : "document") : kind);

  const uploadOne = (file) =>
    new Promise((resolve) => {
      upload(
        { file, kind: resolveKind(file), visibility, ownerUserId, label: fileLabel, onProgress: multiple ? undefined : setProgress },
        {
          onSuccess: (data) => {
            setFileMeta((prev) => ({ ...prev, [data.url]: { name: file.name, isImage: file.type.startsWith("image/") } }));
            onUploaded?.(data);
            resolve(data);
          },
          onSettled: () => resolve(null),
        },
      );
    });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    if (!multiple) {
      const file = files[0];
      setPendingName(file.name);
      setProgress(0);
      await uploadOne(file);
      setProgress(null);
      setPendingName(null);
      return;
    }

    setPendingCount(files.length);
    // Sequential rather than Promise.all: the API dedups per uploader, and
    // firing every file at once makes the progress readout meaningless
    // anyway since it is one shared mutation state, not per-file.
    for (const file of files) {
      const data = await uploadAsync({ file, kind: resolveKind(file), visibility, ownerUserId, label: fileLabel }).catch(() => null);
      if (data) {
        setFileMeta((prev) => ({ ...prev, [data.url]: { name: file.name, isImage: file.type.startsWith("image/") } }));
        onUploaded?.(data);
      }
    }
    setPendingCount(0);
  };

  const handlePick = (event) => {
    // Snapshot into a real array *before* clearing the input — `.files` is a
    // live FileList tied to the input's current state, and resetting `.value`
    // empties that same object in place. A reference taken a line earlier
    // still points at it and would already be empty by the time it is read.
    const files = Array.from(event?.target?.files ?? []);
    // Reset immediately, so choosing the same file twice in a row still fires
    // a change event — a re-upload is a legitimate action, and the API answers
    // it with the record it already holds.
    if (event?.target) event.target.value = "";
    handleFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    handleFiles(event.dataTransfer?.files);
  };

  const busyLabel = multiple && pendingCount > 0 ? `Uploading ${pendingCount} file${pendingCount === 1 ? "" : "s"}…` : null;

  const input = (
    <input
      ref={inputRef}
      type="file"
      className="hidden"
      accept={accept}
      multiple={multiple}
      onChange={handlePick}
    />
  );

  if (variant === "dropzone") {
    // The subset of this field's values that render as images, in order —
    // this is the "set" an ImagePreview lightbox navigates prev/next
    // across, so a `multiple` field's arrows only ever step through its
    // own photos, never its mixed-in documents.
    const imageValues = values.filter((url) => {
      const meta = fileMeta[url];
      return meta ? meta.isImage : kind === "image";
    });
    const previewImages = imageValues.map((url) => ({
      src: uploadUrl(url),
      alt: fileMeta[url]?.name || "Uploaded photo",
      loader: passthroughImageLoader,
    }));

    return (
      <div className={cn("flex flex-col gap-2 w-full", className)}>
        {input}
        {/* One box, one footprint, for every state. Swapping between empty,
            uploading and filled must not resize the field around it — only
            what renders inside this fixed-height shell changes. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "bg-white border border-[#ddddde] border-solid rounded-lg w-full min-h-28 p-3 flex transition-colors",
            hasValue && !busy ? "items-center" : "flex-col items-center justify-center text-center p-4 gap-2",
            isDragging && "border-purple bg-purple/5",
            busy && "cursor-wait opacity-70"
          )}
        >
          {busy ? (
            <>
              <Loader2 className="size-5 animate-spin text-purple" />
              <p className="font-montserrat font-medium text-[13px] text-muted-foreground">
                {busyLabel || `Uploading ${pendingName || "file"}…${progress != null ? ` ${progress}%` : ""}`}
              </p>
            </>
          ) : hasValue ? (
            <div className="flex flex-wrap items-start gap-3 w-full">
              {values.map((url, idx) => {
                const meta = fileMeta[url];
                // Falls back to the field's fixed `kind` when a value arrived
                // from outside this session (nothing was ever picked here to
                // learn its type from) — accurate for every upload made
                // through this component, which is the case that matters.
                const isImage = meta ? meta.isImage : kind === "image";
                const name = meta?.name || (isImage ? "Photo" : "File");
                return (
                  <div key={url} className="flex flex-col items-center gap-1 w-16 shrink-0">
                    <div className="relative size-16 shrink-0">
                      {isImage ? (
                        <ImagePreview
                          images={previewImages}
                          index={imageValues.indexOf(url)}
                          className="block size-16 rounded border border-border overflow-hidden bg-secondary"
                        >
                          <Image
                            src={uploadUrl(url)}
                            alt={name}
                            fill
                            className="object-cover"
                            loader={passthroughImageLoader}
                          />
                        </ImagePreview>
                      ) : (
                        <div className="size-16 rounded border border-border overflow-hidden bg-secondary flex items-center justify-center">
                          <FileIcon className="size-6 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove?.(multiple ? idx : undefined)}
                        className="absolute top-1 right-1 size-4.5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer z-10"
                        aria-label="Remove file"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                    <span
                      className="font-montserrat text-[11px] text-muted-foreground text-center w-full truncate"
                      title={name}
                    >
                      {name}
                    </span>
                  </div>
                );
              })}
              {multiple && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="size-16 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-purple hover:text-purple transition-colors cursor-pointer shrink-0"
                  aria-label="Add another file"
                >
                  <Plus className="size-5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex flex-col items-center gap-2 w-full cursor-pointer"
            >
              <span className="bg-white border border-[#252832] border-solid flex items-center justify-center px-2 py-0.5 rounded-xs">
                <span className="font-montserrat font-medium text-[13px] text-foreground">
                  {buttonLabel || "Choose File"}
                </span>
              </span>
              <p className="font-montserrat font-bold text-[14px] text-foreground">
                {heading || (kind === "image" ? "Drag & drop a photo" : "Drag & drop a file")}
              </p>
              {description && (
                <p className="font-montserrat font-medium text-[12px] text-muted-foreground">{description}</p>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {input}

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
