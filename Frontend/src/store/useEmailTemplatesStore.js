import { create } from "zustand";
import { emailTemplatesData } from "@/dummyData/emailTemplates";

export const EMAIL_TEMPLATES_PAGE_SIZE = 10;

export const useEmailTemplatesStore = create((set, get) => ({
  templates: emailTemplatesData,
  search: "",
  statusFilter: "All",
  categoryFilter: "All",
  page: 1,

  // Selection & Dialogs
  selectedTemplateId: null,
  newTemplateOpen: false,
  deleteTemplateOpen: false,
  sendEmailOpen: false,
  editingTemplate: null,

  // Filters & Search
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter, page: 1 }),

  // Pagination
  setPage: (page) => set({ page }),
  nextPage: () => set((state) => ({ page: state.page + 1 })),
  prevPage: () => set((state) => ({ page: Math.max(1, state.page - 1) })),

  // Getters
  getTemplateById: (id) => get().templates.find((t) => t.id === id),

  // Detail Sheet
  selectTemplate: (id) => set({ selectedTemplateId: id }),
  closeTemplateDetail: () => set({ selectedTemplateId: null }),

  // New / Edit Dialog
  openNewTemplate: (template = null) => set({ editingTemplate: template, newTemplateOpen: true }),
  closeNewTemplate: () => set({ editingTemplate: null, newTemplateOpen: false }),

  // Delete Dialog
  openDeleteTemplate: (template) => set({ editingTemplate: template, deleteTemplateOpen: true }),
  closeDeleteTemplate: () => set({ editingTemplate: null, deleteTemplateOpen: false }),

  // Send Email Dialog
  openSendEmail: (template = null) => set({ editingTemplate: template, sendEmailOpen: true }),
  closeSendEmail: () => set({ editingTemplate: null, sendEmailOpen: false }),

  // CRUD Actions
  addTemplate: (template) =>
    set((state) => {
      const nextId = `TPL-${String(state.templates.length + 1).padStart(3, "0")}`;
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
      return {
        templates: [{ ...template, id: nextId, lastUpdated: now }, ...state.templates],
        newTemplateOpen: false,
        editingTemplate: null,
      };
    }),

  updateTemplate: (id, updatedData) =>
    set((state) => {
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
      return {
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updatedData, lastUpdated: now } : t
        ),
        newTemplateOpen: false,
        editingTemplate: null,
      };
    }),

  deleteTemplate: (id) =>
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      deleteTemplateOpen: false,
      editingTemplate: null,
      selectedTemplateId: state.selectedTemplateId === id ? null : state.selectedTemplateId,
    })),
}));

export default useEmailTemplatesStore;
