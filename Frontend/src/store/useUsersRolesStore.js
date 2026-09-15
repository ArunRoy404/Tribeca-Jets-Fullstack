import { create } from "zustand";
import { usersData, usersRolesStats } from "@/dummyData/usersRoles";

export const USERS_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useUsersRolesStore = create((set, get) => ({
  users: usersData,
  stats: usersRolesStats,
  activeTab: "users", // 'users' | 'roles' | 'audit'
  search: "",
  roleFilter: "All Roles",
  statusFilter: "All Status",
  page: 1,

  selectedUserId: null,
  inviteModalOpen: false,
  editingUser: null,
  deleteModalOpen: false,
  deleteTargetId: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearch: (search) => set({ search, page: 1 }),
  setRoleFilter: (roleFilter) => set({ roleFilter, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", roleFilter: "All Roles", statusFilter: "All Status", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredUsers: () => {
    const { users, search, roleFilter, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return users?.filter((item) => {
      if (roleFilter !== "All Roles" && item?.role !== roleFilter) return false;
      if (statusFilter !== "All Status" && item?.status !== statusFilter) return false;
      if (query && !`${item?.name} ${item?.email} ${item?.role} ${item?.permissionLevel}`.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredUsers?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / USERS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredUsers?.();
    return filtered?.length ?? 0;
  },

  getPageUsers: () => {
    const { page } = get();
    const filtered = get()?.getFilteredUsers?.();
    const start = (page - 1) * USERS_PAGE_SIZE;
    return filtered?.slice(start, start + USERS_PAGE_SIZE);
  },

  getUserById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return get()?.users?.find((item) => normalizeId(item?.id) === normalized || item?.email?.toLowerCase() === id.toLowerCase()) ?? null;
  },

  selectUser: (id) => set({ selectedUserId: id }),
  closeUserDetail: () => set({ selectedUserId: null }),

  openInviteModal: () => set({ inviteModalOpen: true, editingUser: null }),
  openEditUserModal: (user) => set({ inviteModalOpen: true, editingUser: user }),
  closeInviteModal: () => set({ inviteModalOpen: false, editingUser: null }),

  openDeleteModal: (id) => set({ deleteModalOpen: true, deleteTargetId: id }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deleteTargetId: null }),

  inviteUser: (data) =>
    set((state) => ({
      users: [
        {
          id: `USR-00${(state?.users?.length ?? 0) + 1}`,
          name: data?.email?.split("@")[0]?.replace(".", " ") ?? "",
          email: data?.email,
          role: data?.role || "Broker",
          permissionLevel: data?.role === "Admin" ? "Admin" : data?.role === "Senior Broker" ? "High" : "Medium",
          activeLeads: 0,
          activeTrips: 0,
          conversionRate: "0%",
          revenue: "$0",
          revenueRaw: 0,
          lastLogin: "Never",
          status: "Pending",
          ...data,
        },
        ...(state?.users ?? []),
      ],
      inviteModalOpen: false,
      editingUser: null,
    })),

  updateUser: (id, data) =>
    set((state) => ({
      users: state?.users?.map((item) => {
        if (normalizeId(item?.id) !== normalizeId(id)) return item;
        return {
          ...item,
          ...data,
        };
      }),
      inviteModalOpen: false,
      editingUser: null,
    })),

  deleteUser: (id) =>
    set((state) => ({
      users: state?.users?.filter((item) => normalizeId(item?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deleteTargetId: null,
      selectedUserId: state?.selectedUserId === id ? null : state?.selectedUserId,
    })),
}));
