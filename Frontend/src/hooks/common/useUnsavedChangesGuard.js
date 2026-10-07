"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Asks before unsaved work is thrown away.
 *
 * - **Any link inside the app** (the sidebar, a breadcrumb, the menu) and the
 *   form's own Cancel (`requestLeave(href)`) ask in the app's dialog — render
 *   `<ConfirmDialog {...guard.dialog} />`. Links are caught on the document in
 *   the capture phase, before Next's `<Link>` sees the click, so nothing
 *   navigates until the person answers.
 * - **Closing or reloading the tab** gets the browser's own prompt. Browsers
 *   allow nothing else there, by design.
 *
 * Links that open elsewhere (new tab, download, another site) are left alone,
 * and the browser's back button is not covered — it cannot be held without
 * fighting the history stack. Pass `dirty` false once the work is saved.
 */
export function useUnsavedChangesGuard(dirty, { title = "Discard your changes?", description } = {}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState(null);

  useEffect(() => {
    if (!dirty) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target?.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  /** Leave for `href` — straight away when nothing is unsaved, after asking otherwise. */
  const requestLeave = useCallback(
    (href) => {
      if (dirty) setPendingHref(href);
      else router.push(href);
    },
    [dirty, router],
  );

  return {
    requestLeave,
    dialog: {
      open: Boolean(pendingHref),
      onOpenChange: (open) => !open && setPendingHref(null),
      title,
      description: description ?? "You have changes that are not saved. Leaving this page discards them.",
      confirmLabel: "Discard and leave",
      cancelLabel: "Keep editing",
      tone: "destructive",
      onConfirm: () => {
        const href = pendingHref;
        setPendingHref(null);
        router.push(href);
      },
    },
  };
}
