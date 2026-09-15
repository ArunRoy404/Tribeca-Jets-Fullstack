import { create } from "zustand";
import { aircraftData } from "@/dummyData/aircraft";

export const AIRCRAFT_PAGE_SIZE = 6;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useAircraftStore = create((set, get) => ({
  aircraft: aircraftData,
  search: "",
  categoryFilter: "All Categories",
  statusFilter: "All Status",
  page: 1,

  activeTab: "overview",

  addModalOpen: false,
  editingAircraft: null,
  deleteModalOpen: false,
  deletingAircraft: null,
  maintenanceModalOpen: false,
  maintenanceTargetAircraft: null,

  setSearch: (search) => set({ search, page: 1 }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () => set({ search: "", categoryFilter: "All Categories", statusFilter: "All Status", page: 1 }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  setActiveTab: (activeTab) => set({ activeTab }),

  openAddModal: () => set({ addModalOpen: true, editingAircraft: null }),
  openEditModal: (ac) => set({ addModalOpen: true, editingAircraft: ac }),
  closeAddModal: () => set({ addModalOpen: false, editingAircraft: null }),

  openDeleteModal: (ac) => set({ deleteModalOpen: true, deletingAircraft: ac }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deletingAircraft: null }),

  openMaintenanceModal: (ac) => set({ maintenanceModalOpen: true, maintenanceTargetAircraft: ac }),
  closeMaintenanceModal: () => set({ maintenanceModalOpen: false, maintenanceTargetAircraft: null }),

  addAircraft: (newAc) =>
    set((state) => {
      const id = `AC-${1000 + (state?.aircraft?.length ?? 0) + 1}`;
      const item = {
        id,
        trips: 0,
        status: "Available",
        tripHistory: [],
        amenities: ["Wi-Fi", "Galley", "Enclosed Lavatory"],
        specifications: {
          engines: "Dual Turbofan",
          avionics: "Integrated Glass Cockpit",
          takeoffDistance: "4,500 ft",
          landingDistance: "2,400 ft",
          rateOfClimb: "4,000 ft/min",
          serviceCeiling: "45,000 ft",
        },
        maintenance: {
          last100Hour: new Date().toISOString().split("T")[0],
          lastAnnual: new Date().toISOString().split("T")[0],
          next100Hour: "2026-11-01",
          nextDueStatus: "Scheduled",
          history: [],
        },
        ...newAc,
      };
      return { aircraft: [item, ...(state?.aircraft ?? [])] };
    }),

  updateAircraft: (id, updates) =>
    set((state) => ({
      aircraft: state?.aircraft?.map((ac) =>
        normalizeId(ac?.id) === normalizeId(id) ? { ...ac, ...updates } : ac
      ),
    })),

  deleteAircraft: (id) =>
    set((state) => ({
      aircraft: state?.aircraft?.filter((ac) => normalizeId(ac?.id) !== normalizeId(id)),
      deleteModalOpen: false,
      deletingAircraft: null,
    })),

  toggleMaintenanceStatus: (id, targetStatus) =>
    set((state) => ({
      aircraft: state?.aircraft?.map((ac) => {
        if (normalizeId(ac?.id) === normalizeId(id)) {
          const nextStatus = targetStatus || (ac?.status === "Maintenance" ? "Available" : "Maintenance");
          return { ...ac, status: nextStatus };
        }
        return ac;
      }),
      maintenanceModalOpen: false,
      maintenanceTargetAircraft: null,
    })),

  getFilteredAircraft: () => {
    const { aircraft, search, categoryFilter, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return aircraft?.filter((ac) => {
      if (categoryFilter !== "All Categories" && ac?.category !== categoryFilter) return false;
      if (statusFilter !== "All Status" && ac?.status !== statusFilter) return false;
      if (
        query &&
        !`${ac?.tailNumber} ${ac?.model} ${ac?.category} ${ac?.operator} ${ac?.homeBase}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredAircraft?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / AIRCRAFT_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredAircraft?.();
    return filtered?.length ?? 0;
  },

  getPageAircraft: () => {
    const { page } = get();
    const filtered = get()?.getFilteredAircraft?.();
    const start = (page - 1) * AIRCRAFT_PAGE_SIZE;
    return filtered?.slice(start, start + AIRCRAFT_PAGE_SIZE);
  },

  getAircraftById: (id) => {
    if (!id) return get()?.aircraft?.[0];
    const target = normalizeId(id);
    return get()?.aircraft?.find((ac) => normalizeId(ac?.id) === target) || get()?.aircraft?.[0];
  },
}));
