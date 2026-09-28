import { create } from "zustand";

/**
 * Tasks Board (#20) keeps only dialog state here: which form is open, for
 * which task, and which column a new task starts in. The tasks themselves
 * come from the API through `@/hooks/tasks`, and the open task's panel is in
 * the URL (`?task=`).
 */
export const useTasksStore = create((set) => ({
  addModalOpen: false,
  editingTaskId: null,
  addModalDefaultStatus: "TODO",
  archiveTargetId: null,

  openAddModal: (defaultStatus = "TODO") =>
    set({ addModalOpen: true, editingTaskId: null, addModalDefaultStatus: defaultStatus }),
  openEditModal: (taskId) => set({ addModalOpen: true, editingTaskId: taskId }),
  closeAddModal: () => set({ addModalOpen: false, editingTaskId: null }),

  openArchiveModal: (taskId) => set({ archiveTargetId: taskId }),
  closeArchiveModal: () => set({ archiveTargetId: null }),
}));
