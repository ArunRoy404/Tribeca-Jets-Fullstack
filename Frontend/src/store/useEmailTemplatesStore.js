import { create } from "zustand";

/**
 * Which Email Templates dialog is open — nothing the server owns. The
 * library and the sent log are React Query's, and the open sheets, the tab,
 * the filters and the page live in the URL (`useEmailTemplatesTableParams`).
 */
export const useEmailTemplatesStore = create((set) => ({
  editorOpen: false,
  /** The template being edited; null for a new one. */
  editingTemplateId: null,
  openNewTemplate: () => set({ editorOpen: true, editingTemplateId: null }),
  openEditTemplate: (id) => set({ editorOpen: true, editingTemplateId: id }),
  closeEditor: () => set({ editorOpen: false, editingTemplateId: null }),

  composeOpen: false,
  /** The template the compose form starts from; null lets the broker pick. */
  composeTemplateId: null,
  openCompose: (templateId = null) => set({ composeOpen: true, composeTemplateId: templateId }),
  closeCompose: () => set({ composeOpen: false, composeTemplateId: null }),
}));

export default useEmailTemplatesStore;
