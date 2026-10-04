import { create } from "zustand";

/**
 * Reports (#23) — client-only state: the export dialog. Every figure comes
 * from `/reports/*` through React Query; the window and the chart buckets
 * live in the URL (`useReportsParams`).
 */
export const useReportsStore = create((set) => ({
  exportModalOpen: false,
  /** "current" — the window on screen; "all" — every operation on record. */
  exportScope: "current",
  /** CSV or XLSX, the API's vocabulary. */
  exportFormat: "XLSX",

  openExportModal: (format) => set((state) => ({ exportModalOpen: true, exportFormat: format ?? state.exportFormat })),
  closeExportModal: () => set({ exportModalOpen: false }),
  setExportScope: (exportScope) => set({ exportScope }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
}));
