"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { uploadsService } from "@/services/uploads.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The photo library — client adjustment #3's "stock image database".
 *
 * Every PUBLIC image already uploaded for a quote, an itinerary or the fleet,
 * newest first. A library rather than a second table: the photos are already
 * stored, and the only thing the desk was missing was a way to pick one again
 * instead of hunting down the operator's email and uploading it twice.
 *
 * Only PUBLIC images, because those are the ones meant for documents a client
 * sees. A private upload stays out of everybody else's picker by the same rule
 * that keeps it out of their fetch.
 */
export function usePhotoLibrary(params, { enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.uploads.library(params),
    queryFn: () =>
      uploadsService.list({ ...params, kind: "IMAGE", visibility: "PUBLIC" }),
    enabled,
    placeholderData: keepPreviousData,
    ...queryPresets.standard,
  });
}
