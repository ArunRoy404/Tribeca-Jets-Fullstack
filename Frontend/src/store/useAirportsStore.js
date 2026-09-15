import { create } from "zustand";
import { airportsData } from "@/dummyData/airports";

export const AIRPORTS_PAGE_SIZE = 10;

export const useAirportsStore = create((set, get) => ({
  airports: airportsData,
  search: "",
  countryFilter: "All Countries",
  page: 1,

  addModalOpen: false,
  editingAirport: null,
  deleteModalOpen: false,
  deletingAirport: null,
  detailsSidebarOpen: false,
  selectedAirport: null,

  setSearch: (search) => set({ search, page: 1 }),
  setCountryFilter: (countryFilter) => set({ countryFilter, page: 1 }),
  setPage: (page) => set({ page }),

  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  openAddModal: () => set({ addModalOpen: true, editingAirport: null }),
  openEditModal: (airport) => set({ addModalOpen: true, editingAirport: airport }),
  closeAddModal: () => set({ addModalOpen: false, editingAirport: null }),

  openDeleteModal: (airport) => set({ deleteModalOpen: true, deletingAirport: airport }),
  closeDeleteModal: () => set({ deleteModalOpen: false, deletingAirport: null }),

  openDetailsSidebar: (airport) => set({ detailsSidebarOpen: true, selectedAirport: airport }),
  closeDetailsSidebar: () => set({ detailsSidebarOpen: false, selectedAirport: null }),

  addAirport: (airportData) =>
    set((state) => {
      const newAirport = {
        ...airportData,
        id: `APT-${1000 + (state?.airports?.length ?? 0) + 1}`,
      };
      return { airports: [newAirport, ...(state?.airports ?? [])] };
    }),

  updateAirport: (id, updatedFields) =>
    set((state) => ({
      airports: state?.airports?.map((apt) =>
        apt?.id === id ? { ...apt, ...updatedFields } : apt
      ),
      selectedAirport:
        state?.selectedAirport?.id === id
          ? { ...state?.selectedAirport, ...updatedFields }
          : state?.selectedAirport,
    })),

  deleteAirport: (id) =>
    set((state) => ({
      airports: state?.airports?.filter((apt) => apt?.id !== id),
      deleteModalOpen: false,
      deletingAirport: null,
      detailsSidebarOpen: state?.selectedAirport?.id === id ? false : state?.detailsSidebarOpen,
      selectedAirport: state?.selectedAirport?.id === id ? null : state?.selectedAirport,
    })),

  getFilteredAirports: () => {
    const { airports, search, countryFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return airports?.filter((apt) => {
      if (countryFilter !== "All Countries" && apt?.country !== countryFilter) return false;
      if (
        query &&
        !`${apt?.icao} ${apt?.iata} ${apt?.name} ${apt?.city} ${apt?.country}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredAirports?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / AIRPORTS_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredAirports?.();
    return filtered?.length ?? 0;
  },

  getPageAirports: () => {
    const { page } = get();
    const filtered = get()?.getFilteredAirports?.();
    const start = (page - 1) * AIRPORTS_PAGE_SIZE;
    return filtered?.slice(start, start + AIRPORTS_PAGE_SIZE);
  },

  getAirportById: (id) => {
    return get()?.airports?.find((apt) => apt?.id === id || apt?.icao?.toLowerCase() === id?.toLowerCase());
  },
}));
