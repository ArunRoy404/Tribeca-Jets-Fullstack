import { create } from "zustand";
import {
  clientsData,
  clientStats,
  clientTripsHistory,
  clientQuotesHistory,
  clientPaymentsHistory,
  clientActivities,
} from "@/dummyData/clients";

export const CLIENTS_PAGE_SIZE = 6;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useClientsStore = create((set, get) => ({
  clients: clientsData,
  stats: clientStats,
  tripsHistory: clientTripsHistory,
  quotesHistory: clientQuotesHistory,
  paymentsHistory: clientPaymentsHistory,
  activities: clientActivities,

  search: "",
  statusFilter: "All Statuses",
  typeFilter: "All Types",
  brokerFilter: "All Brokers",
  followUpFilter: "All Follow-ups",
  page: 1,

  selectedClientId: "CL-1001",
  activeTab: "overview",

  addModalOpen: false,
  editingClient: null,
  followUpModalOpen: false,
  followUpTargetId: null,

  archiveModalOpen: false,
  archiveTargetClient: null,

  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setTypeFilter: (typeFilter) => set({ typeFilter, page: 1 }),
  setBrokerFilter: (brokerFilter) => set({ brokerFilter, page: 1 }),
  setFollowUpFilter: (followUpFilter) => set({ followUpFilter, page: 1 }),
  clearFilters: () =>
    set({
      search: "",
      statusFilter: "All Statuses",
      typeFilter: "All Types",
      brokerFilter: "All Brokers",
      followUpFilter: "All Follow-ups",
      page: 1,
    }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  getFilteredClients: () => {
    const { clients, search, statusFilter, typeFilter, brokerFilter, followUpFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return clients?.filter((item) => {
      if (statusFilter !== "All Statuses" && item?.status !== statusFilter) return false;
      if (typeFilter !== "All Types" && item?.type !== typeFilter) return false;
      if (brokerFilter !== "All Brokers" && item?.broker !== brokerFilter) return false;
      if (followUpFilter !== "All Follow-ups" && item?.nextFollowUpStatus !== followUpFilter) return false;
      if (
        query &&
        !`${item?.name} ${item?.company} ${item?.email} ${item?.phone} ${item?.prefAirports}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredClients?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / CLIENTS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredClients?.();
    return filtered?.length ?? 0;
  },

  getPageClients: () => {
    const { page } = get();
    const filtered = get()?.getFilteredClients?.();
    const start = (page - 1) * CLIENTS_PAGE_SIZE;
    return filtered?.slice(start, start + CLIENTS_PAGE_SIZE);
  },

  getClientById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return (
      get()?.clients?.find(
        (item) => normalizeId(item?.id) === normalized || item?.name?.toLowerCase() === id?.toLowerCase()
      ) ?? null
    );
  },

  selectClient: (id) => set({ selectedClientId: id }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  openAddModal: () => set({ addModalOpen: true, editingClient: null }),
  openEditModal: (client) => set({ addModalOpen: true, editingClient: client }),
  closeAddModal: () => set({ addModalOpen: false, editingClient: null }),

  openFollowUpModal: (id) => set({ followUpModalOpen: true, followUpTargetId: id }),
  closeFollowUpModal: () => set({ followUpModalOpen: false, followUpTargetId: null }),

  openArchiveModal: (client) => set({ archiveModalOpen: true, archiveTargetClient: client }),
  closeArchiveModal: () => set({ archiveModalOpen: false, archiveTargetClient: null }),

  addClient: (data) =>
    set((state) => ({
      clients: [
        {
          id: `CL-${Math.floor(1009 + Math.random() * 500)}`,
          totalTrips: 0,
          tripsOnRecord: 0,
          totalSpent: "$0",
          totalSpentRaw: 0,
          activeQuotesCount: 0,
          status: data?.status || "Active",
          broker: data?.broker || "Barry",
          addedDate: "Aug 2026",
          ...data,
        },
        ...(state?.clients ?? []),
      ],
      addModalOpen: false,
      editingClient: null,
    })),

  updateClient: (id, data) =>
    set((state) => ({
      clients: state?.clients?.map((item) =>
        normalizeId(item?.id) === normalizeId(id) ? { ...item, ...data } : item
      ),
      addModalOpen: false,
      editingClient: null,
    })),

  archiveClient: (id) =>
    set((state) => ({
      clients: state?.clients?.map((item) =>
        normalizeId(item?.id) === normalizeId(id) ? { ...item, status: "Inactive" } : item
      ),
      archiveModalOpen: false,
      archiveTargetClient: null,
    })),
}));
