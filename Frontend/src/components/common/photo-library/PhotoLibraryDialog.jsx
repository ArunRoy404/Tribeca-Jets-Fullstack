"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/table/common/SearchInput";
import { ImagePreview } from "@/components/common/image-preview";
import { usePhotoLibrary } from "@/hooks/uploads";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { uploadUrl, passthroughImageLoader } from "@/services/uploads.service";

const PAGE_SIZE = 12;

/**
 * Pick a photo that is already on file — client adjustment #3's "stock image
 * database for when you have to add pics to quote or itinerary".
 *
 * Two sources, in the order a broker reaches for them:
 *
 * - **`suggested`** — photos the caller already knows are relevant, such as
 *   the fleet photos of the aircraft picked on a quote. Passed in, because
 *   only the form knows which aircraft it is about.
 * - **The library** — every PUBLIC image uploaded anywhere, newest first,
 *   searchable by filename.
 *
 * Every thumbnail previews through `ImagePreview` (hover, click to zoom) and
 * is chosen with its own button, so looking at a photo and choosing it are two
 * different clicks. Choosing hands back the stored relative URL — exactly what
 * an upload would have returned — so the form cannot tell the difference.
 */
export default function PhotoLibraryDialog({ open, onOpenChange, onPick, suggested = [] }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const commitSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);
  const [draft, setDraft] = useDebouncedParam(search, commitSearch);

  const { data, isLoading, isFetching } = usePhotoLibrary(
    { page, limit: PAGE_SIZE, ...(search ? { search } : {}) },
    { enabled: open },
  );
  const photos = data?.data ?? [];
  const meta = data?.meta;

  const pick = (url, filename) => {
    onPick?.({ url, filename });
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="flex flex-col items-start gap-1 pb-2 border-b border-border">
          <DialogTitle className="font-montserrat font-bold text-[18px] sm:text-[20px] text-foreground">
            Photo Library
          </DialogTitle>
          <DialogDescription className="font-montserrat text-[13px] text-muted-foreground">
            Reuse a photo already on file instead of uploading it again.
          </DialogDescription>
        </DialogHeader>

        {suggested?.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="font-montserrat font-semibold text-[13px] text-foreground">From this aircraft</h3>
            <PhotoGrid
              items={suggested.map((item) => ({ url: item?.url, name: item?.label }))}
              onPick={pick}
            />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-montserrat font-semibold text-[13px] text-foreground">All photos</h3>
            <SearchInput
              size="sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search by file name"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
              <ImageOff className="size-6" />
              <p className="font-montserrat text-[13px] text-center">
                {search ? "No photos match that name." : "No photos in the library yet. Upload one and it appears here."}
              </p>
            </div>
          ) : (
            <PhotoGrid
              items={photos.map((photo) => ({ url: photo?.url, name: photo?.label || photo?.filename }))}
              onPick={pick}
              dimmed={isFetching}
            />
          )}

          {meta?.totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-montserrat text-[12px] text-muted-foreground">
                Page {meta?.page} of {meta?.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!meta?.hasPrevious}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" /> Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!meta?.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

/** A grid of pickable thumbnails. Two columns on a phone, four from `sm`. */
function PhotoGrid({ items, onPick, dimmed = false }) {
  const gallery = items.map((item) => ({
    src: uploadUrl(item?.url),
    alt: item?.name || "Photo",
    loader: passthroughImageLoader,
  }));

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      {items.map((item, idx) => (
        <div key={item?.url} className="flex flex-col gap-1.5 min-w-0">
          <ImagePreview
            images={gallery}
            index={idx}
            className="block w-full aspect-4/3 rounded border border-border overflow-hidden bg-secondary"
          >
            <Image
              src={uploadUrl(item?.url)}
              alt={item?.name || "Photo"}
              fill
              sizes="(min-width: 640px) 180px, 45vw"
              className="object-cover"
              loader={passthroughImageLoader}
            />
          </ImagePreview>
          <span className="font-montserrat text-[11px] text-muted-foreground truncate" title={item?.name}>
            {item?.name || "Photo"}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[12px]"
            onClick={() => onPick(item?.url, item?.name)}
          >
            Use this photo
          </Button>
        </div>
      ))}
    </div>
  );
}
