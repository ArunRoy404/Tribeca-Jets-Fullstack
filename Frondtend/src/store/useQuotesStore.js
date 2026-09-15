import { create } from "zustand";
import {
  quotesKPIStats,
  quotesData,
} from "@/dummyData/quotes";

export const QUOTES_PAGE_SIZE = 5;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useQuotesStore = create((set, get) => ({
  kpiStats: quotesKPIStats,
  quotes: quotesData,

  // Search, Filter & Pagination
  search: "",
  statusFilter: "All Status",
  page: 1,

  // Add / Edit Modal
  addModalOpen: false,
  editingQuote: null,

  // Delete Modal
  deleteModalOpen: false,
  deleteTargetQuote: null,

  // Filter Actions
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () =>
    set({
      search: "",
      statusFilter: "All Status",
      page: 1,
    }),
  setPage: (page) => set({ page }),
  nextPage: () => {
    const count = get()?.getPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  // Selectors
  getFilteredQuotes: () => {
    const { quotes, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();

    return quotes?.filter((quote) => {
      if (statusFilter !== "All Status" && quote?.status?.toLowerCase() !== statusFilter?.toLowerCase()) {
        return false;
      }
      if (
        query &&
        !`${quote?.id} ${quote?.client} ${quote?.company} ${quote?.broker} ${quote?.origin} ${quote?.destination} ${quote?.route} ${quote?.aircraft} ${quote?.operator}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getPageCount: () => {
    const filtered = get()?.getFilteredQuotes?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / QUOTES_PAGE_SIZE));
  },

  getFilteredCount: () => {
    const filtered = get()?.getFilteredQuotes?.();
    return filtered?.length ?? 0;
  },

  getPageQuotes: () => {
    const { page } = get();
    const filtered = get()?.getFilteredQuotes?.();
    const start = (page - 1) * QUOTES_PAGE_SIZE;
    return filtered?.slice(start, start + QUOTES_PAGE_SIZE);
  },

  getQuoteById: (id) => {
    if (!id) return null;
    const { quotes } = get();
    const clean = normalizeId(id);
    return quotes?.find((q) => normalizeId(q?.id) === clean) || null;
  },

  // Modal Controls
  openAddQuoteModal: (quote = null) =>
    set({
      addModalOpen: true,
      editingQuote: quote,
    }),
  closeAddQuoteModal: () =>
    set({
      addModalOpen: false,
      editingQuote: null,
    }),

  openDeleteQuoteModal: (quote) =>
    set({
      deleteModalOpen: true,
      deleteTargetQuote: quote,
    }),
  closeDeleteQuoteModal: () =>
    set({
      deleteModalOpen: false,
      deleteTargetQuote: null,
    }),

  // CRUD Operations
  addQuote: (data) => {
    const { quotes } = get();
    const newId = `Q-2026-0${(quotes?.length ?? 0) + 43}`;
    const basePrice = Number(data?.basePrice) || 0;
    const fetEnabled = data?.fetEnabled !== false;
    const fetAmount = fetEnabled ? Math.round(basePrice * 0.075) : 0;
    const totalPrice = basePrice + fetAmount;
    const operatorCost = Number(data?.operatorCost) || Math.round(basePrice * 0.75);
    const grossProfit = totalPrice - operatorCost;
    const marginPercentage = totalPrice > 0 ? `${((grossProfit / totalPrice) * 100).toFixed(1)}%` : "0.0%";

    const newQuote = {
      id: newId,
      client: data?.client || "New Client",
      clientTier: data?.clientTier || "Standard",
      company: data?.company || "Direct Client",
      broker: data?.broker ? data?.broker?.split(" ")?.[0] : "Barry",
      brokerFullName: data?.broker || "Barry Wilson",
      origin: (data?.origin || "KTEB")?.toUpperCase(),
      destination: (data?.destination || "KPBI")?.toUpperCase(),
      route: `${(data?.origin || "KTEB")?.toUpperCase()} → ${(data?.destination || "KPBI")?.toUpperCase()}`,
      date: data?.departureDate ? data?.departureDate : "Aug 15",
      departureDate: data?.departureDate || "2026-08-15",
      returnDate: data?.returnDate || "",
      departureAirport: (data?.origin || "KTEB")?.toUpperCase(),
      destinationAirport: (data?.destination || "KPBI")?.toUpperCase(),
      aircraft: data?.aircraft || "Gulfstream G550",
      operator: data?.operator || "ExecuJet",
      basePrice,
      basePriceFormatted: `$${basePrice.toLocaleString()}`,
      fetAmount,
      fetFormatted: `$${fetAmount.toLocaleString()}`,
      fetEnabled,
      totalPrice,
      totalPriceFormatted: `$${totalPrice.toLocaleString()}`,
      operatorCost,
      operatorCostFormatted: `$${operatorCost.toLocaleString()}`,
      grossProfit,
      grossProfitFormatted: `$${grossProfit.toLocaleString()}`,
      marginPercentage,
      version: "V1",
      status: data?.status || "Draft",
      sentDate: data?.sentDate || "Today",
      expiryDate: data?.expiryDate || "In 3 days",
      lineItems: [
        { label: "Base Charter Price", amount: `$${basePrice.toLocaleString()}`, type: "currency" },
        ...(fetEnabled
          ? [{ label: "Federal Excise Tax (7.5%)", amount: `$${fetAmount.toLocaleString()}`, type: "currency" }]
          : []),
        { label: "Standard Catering", amount: "Included", type: "text" },
      ],
      versions: [
        {
          version: "V1",
          amount: `$${totalPrice.toLocaleString()}`,
          note: "Initial Quote",
          date: "Today",
          isCurrent: true,
        },
      ],
      notes: data?.notes || "No special notes provided.",
    };

    set({ quotes: [newQuote, ...(quotes ?? [])] });
    return newQuote;
  },

  updateQuote: (id, data) => {
    const { quotes } = get();
    const basePrice = Number(data?.basePrice) || 0;
    const fetEnabled = data?.fetEnabled !== false;
    const fetAmount = fetEnabled ? Math.round(basePrice * 0.075) : 0;
    const totalPrice = basePrice + fetAmount;
    const operatorCost = Number(data?.operatorCost) || 0;
    const grossProfit = totalPrice - operatorCost;
    const marginPercentage = totalPrice > 0 ? `${((grossProfit / totalPrice) * 100).toFixed(1)}%` : "0.0%";

    const updated = quotes?.map((q) => {
      if (q?.id === id) {
        return {
          ...q,
          ...data,
          origin: (data?.origin || q?.origin)?.toUpperCase(),
          destination: (data?.destination || q?.destination)?.toUpperCase(),
          route: `${(data?.origin || q?.origin)?.toUpperCase()} → ${(data?.destination || q?.destination)?.toUpperCase()}`,
          basePrice,
          basePriceFormatted: `$${basePrice.toLocaleString()}`,
          fetAmount,
          fetFormatted: `$${fetAmount.toLocaleString()}`,
          fetEnabled,
          totalPrice,
          totalPriceFormatted: `$${totalPrice.toLocaleString()}`,
          operatorCost,
          operatorCostFormatted: `$${operatorCost.toLocaleString()}`,
          grossProfit,
          grossProfitFormatted: `$${grossProfit.toLocaleString()}`,
          marginPercentage,
        };
      }
      return q;
    });

    set({ quotes: updated });
  },

  duplicateQuote: (id) => {
    const { quotes } = get();
    const original = quotes?.find((q) => q?.id === id);
    if (!original) return;

    const newId = `Q-2026-0${(quotes?.length ?? 0) + 50}`;
    const duplicated = {
      ...original,
      id: newId,
      status: "Draft",
      version: "V1",
      sentDate: "Draft",
      versions: [
        {
          version: "V1",
          amount: original?.totalPriceFormatted,
          note: `Duplicate of ${original?.id}`,
          date: "Today",
          isCurrent: true,
        },
      ],
    };

    set({ quotes: [duplicated, ...(quotes ?? [])] });
    return duplicated;
  },

  deleteQuote: (id) => {
    const { quotes } = get();
    set({ quotes: quotes?.filter((q) => q?.id !== id) });
  },

  updateQuoteStatus: (id, newStatus) => {
    const { quotes } = get();
    set({
      quotes: quotes?.map((q) => (q?.id === id ? { ...q, status: newStatus } : q)),
    });
  },
}));
