"use client";

import { useMutation } from "@tanstack/react-query";
import { emailsService } from "@/services/emailTemplates.service";

/**
 * Fills a template for a recipient. A mutation, not a query: it is asked for
 * when the broker picks a template, and its answer becomes the editable
 * draft — refetching it in the background would overwrite their edits.
 * Errors are the compose form's to show inline, so there is no toast here.
 */
export function usePreviewEmail() {
  return useMutation({
    mutationFn: (payload) => emailsService.preview(payload),
  });
}
