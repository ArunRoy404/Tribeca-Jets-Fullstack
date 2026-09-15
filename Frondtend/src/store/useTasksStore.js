import { create } from "zustand";
import { tasksData, taskColumns } from "@/dummyData/tasks";

let nextTaskNumber = tasksData.length + 1;

export const useTasksStore = create((set, get) => ({
  tasks: tasksData,
  search: "",
  filter: "Everyone",

  selectedTaskId: null,
  addModalOpen: false,
  editingTask: null,
  addModalDefaultStatus: "To Do",
  deleteModalOpen: false,
  deleteTargetId: null,

  setSearch: (search) => set({ search }),
  setFilter: (filter) => set({ filter }),

  getFilteredTasks: () => {
    const { tasks, search, filter } = get();
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (filter === "My Tasks" && task.assignee !== "Ari") return false;
      if (filter === "Due Today" && task.dueDate !== "Aug 12") return false;
      if (filter === "Overdue" && task.dueDate !== "Aug 10") return false;
      if (filter === "High priority" && task.priority !== "High" && task.priority !== "Urgent") return false;
      if (
        query &&
        !`${task.title} ${task.client} ${task.trip} ${task.assignee}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getTasksByStatus: (status) => get().getFilteredTasks().filter((task) => task.status === status),

  getTaskById: (id) => get().tasks.find((task) => task.id === id) ?? null,

  selectTask: (id) => set({ selectedTaskId: id }),
  closeTaskDetail: () => set({ selectedTaskId: null }),

  openAddModal: (defaultStatus = "To Do") =>
    set({ addModalOpen: true, editingTask: null, addModalDefaultStatus: defaultStatus }),
  openEditModal: (task) => set({ addModalOpen: true, editingTask: task }),
  closeAddModal: () => set({ addModalOpen: false, editingTask: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  addTask: (data) =>
    set((state) => {
      const id = `TSK-${String(nextTaskNumber++).padStart(3, "0")}`;
      return {
        tasks: [
          {
            id,
            title: data.title || "Untitled task",
            description: data.description || "",
            status: data.status || "To Do",
            priority: data.priority || "Medium",
            dueDate: data.dueDate || "TBD",
            client: data.client || "Unassigned",
            trip: data.trip || "",
            assignee: data.assignee || "Ari",
            auto: false,
            checklist: data.checklist || [],
            notes: data.notes || "",
          },
          ...state.tasks,
        ],
        addModalOpen: false,
        editingTask: null,
      };
    }),

  updateTask: (id, data) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...data } : task)),
      addModalOpen: false,
      editingTask: null,
    })),

  setTaskStatus: (id, status) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
    })),

  toggleChecklistItem: (taskId, itemId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              checklist: task.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
              ),
            }
          : task
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),
}));

export { taskColumns };
