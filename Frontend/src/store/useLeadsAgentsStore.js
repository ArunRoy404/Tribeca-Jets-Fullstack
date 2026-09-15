import { create } from "zustand";
import {
  leadsAgentsKPIStats,
  agentsData,
  leadsData,
  agentAssociatedTrips,
  agentRecentActivities,
} from "@/dummyData/leadsAgents";

export const AGENTS_PAGE_SIZE = 6;
export const LEADS_PAGE_SIZE = 6;

function normalizeId(id) {
  return String(id ?? "").replace("#", "").toUpperCase();
}

export const useLeadsAgentsStore = create((set, get) => ({
  kpiStats: leadsAgentsKPIStats,
  agents: agentsData,
  leads: leadsData,
  associatedTrips: agentAssociatedTrips,
  recentActivities: agentRecentActivities,

  activeMainTab: "leads",

  // Agents Filter & Pagination
  search: "",
  statusFilter: "All Status",
  page: 1,

  // Leads Filter & Pagination
  leadsSearch: "",
  leadsStatusFilter: "All Status",
  leadsSourceFilter: "All Sources",
  leadsBrokerFilter: "All Brokers",
  leadsPriorityFilter: "All Priority",
  leadsPage: 1,

  // Agent Modals
  selectedAgentId: "AGT-101",
  addModalOpen: false,
  editingAgent: null,

  // Lead Modals
  selectedLeadId: "LD-201",
  addLeadModalOpen: false,
  editingLead: null,
  scheduleFollowUpModalOpen: false,
  followUpTargetLead: null,
  assignBrokerModalOpen: false,
  assignBrokerTargetLead: null,
  convertLeadModalOpen: false,
  convertLeadTargetLead: null,
  deleteLeadModalOpen: false,
  deleteLeadTargetLead: null,

  // Tab switcher
  setActiveMainTab: (tab) => set({ activeMainTab: tab }),

  // Agent Filter Actions
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  clearFilters: () =>
    set({
      search: "",
      statusFilter: "All Status",
      page: 1,
    }),
  nextPage: () => {
    const count = get()?.getAgentsPageCount?.();
    set((state) => ({ page: Math.min(state?.page + 1, count) }));
  },
  prevPage: () => set((state) => ({ page: Math.max(state?.page - 1, 1) })),

  // Leads Filter Actions
  setLeadsSearch: (leadsSearch) => set({ leadsSearch, leadsPage: 1 }),
  setLeadsStatusFilter: (leadsStatusFilter) => set({ leadsStatusFilter, leadsPage: 1 }),
  setLeadsSourceFilter: (leadsSourceFilter) => set({ leadsSourceFilter, leadsPage: 1 }),
  setLeadsBrokerFilter: (leadsBrokerFilter) => set({ leadsBrokerFilter, leadsPage: 1 }),
  setLeadsPriorityFilter: (leadsPriorityFilter) => set({ leadsPriorityFilter, leadsPage: 1 }),
  clearLeadsFilters: () =>
    set({
      leadsSearch: "",
      leadsStatusFilter: "All Status",
      leadsSourceFilter: "All Sources",
      leadsBrokerFilter: "All Brokers",
      leadsPriorityFilter: "All Priority",
      leadsPage: 1,
    }),
  nextLeadsPage: () => {
    const count = get()?.getLeadsPageCount?.();
    set((state) => ({ leadsPage: Math.min(state?.leadsPage + 1, count) }));
  },
  prevLeadsPage: () => set((state) => ({ leadsPage: Math.max(state?.leadsPage - 1, 1) })),

  // Filter Selectors
  getFilteredAgents: () => {
    const { agents, search, statusFilter } = get();
    const query = (search ?? "").trim().toLowerCase();
    return agents?.filter((agent) => {
      if (statusFilter !== "All Status" && agent?.status !== statusFilter) return false;
      if (
        query &&
        !`${agent?.name} ${agent?.email} ${agent?.phone} ${agent?.role} ${agent?.company}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getAgentsPageCount: () => {
    const filtered = get()?.getFilteredAgents?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / AGENTS_PAGE_SIZE));
  },

  getFilteredAgentsCount: () => {
    const filtered = get()?.getFilteredAgents?.();
    return filtered?.length ?? 0;
  },

  getPageAgents: () => {
    const { page } = get();
    const filtered = get()?.getFilteredAgents?.();
    const start = (page - 1) * AGENTS_PAGE_SIZE;
    return filtered?.slice(start, start + AGENTS_PAGE_SIZE);
  },

  getFilteredLeads: () => {
    const {
      leads,
      leadsSearch,
      leadsStatusFilter,
      leadsSourceFilter,
      leadsBrokerFilter,
      leadsPriorityFilter,
    } = get();
    const query = (leadsSearch ?? "").trim().toLowerCase();

    return leads?.filter((lead) => {
      if (leadsStatusFilter !== "All Status" && lead?.status !== leadsStatusFilter) return false;
      if (leadsSourceFilter !== "All Sources" && lead?.source !== leadsSourceFilter) return false;
      if (
        leadsBrokerFilter !== "All Brokers" &&
        !lead?.broker?.toLowerCase()?.includes(leadsBrokerFilter.toLowerCase())
      ) {
        return false;
      }
      if (leadsPriorityFilter !== "All Priority" && lead?.priority !== leadsPriorityFilter) {
        return false;
      }
      if (
        query &&
        !`${lead?.name} ${lead?.company} ${lead?.email} ${lead?.phone} ${lead?.origin} ${lead?.destination} ${lead?.broker} ${lead?.route}`
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }
      return true;
    });
  },

  getLeadsPageCount: () => {
    const filtered = get()?.getFilteredLeads?.();
    return Math.max(1, Math.ceil((filtered?.length ?? 0) / LEADS_PAGE_SIZE));
  },

  getFilteredLeadsCount: () => {
    const filtered = get()?.getFilteredLeads?.();
    return filtered?.length ?? 0;
  },

  getPageLeads: () => {
    const { leadsPage } = get();
    const filtered = get()?.getFilteredLeads?.();
    const start = (leadsPage - 1) * LEADS_PAGE_SIZE;
    return filtered?.slice(start, start + LEADS_PAGE_SIZE);
  },

  getAgentById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return (
      get()?.agents?.find(
        (a) => normalizeId(a?.id) === normalized || a?.name?.toLowerCase() === id.toLowerCase()
      ) ?? null
    );
  },

  getLeadById: (id) => {
    if (!id) return null;
    const normalized = normalizeId(id);
    return (
      get()?.leads?.find(
        (l) => normalizeId(l?.id) === normalized || l?.name?.toLowerCase() === id.toLowerCase()
      ) ?? null
    );
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  selectLead: (id) => set({ selectedLeadId: id }),

  // Agent Modals
  openAddModal: () => set({ addModalOpen: true, editingAgent: null }),
  openEditModal: (agent) => set({ addModalOpen: true, editingAgent: agent }),
  closeAddModal: () => set({ addModalOpen: false, editingAgent: null }),

  addAgent: (agentData) =>
    set((state) => {
      const newId = `AGT-${100 + (state?.agents?.length ?? 0) + 1}`;
      const newAgent = {
        id: newId,
        name: agentData?.name,
        email: agentData?.email,
        phone: agentData?.phone,
        company: agentData?.company || "Tribeca Jets",
        contactEmail: agentData?.email,
        contactPhone: agentData?.phone,
        role: agentData?.role || "Broker",
        status: agentData?.status || "Active",
        activeLeads: 0,
        qualifiedLeads: 0,
        convertedLeads: 0,
        activeTrips: 0,
        conversionRate: "0%",
        followUpsDue: 0,
        activePipeline: 0,
        maxLeadCapacity: parseInt(agentData?.maxLeadCapacity, 10) || 15,
        defaultFollowUp: agentData?.defaultFollowUp || "Call",
        permissionLevel: agentData?.permissionLevel || "Medium",
        workload: "Normal",
      };

      return {
        agents: [newAgent, ...(state?.agents ?? [])],
        kpiStats: state?.kpiStats?.map((stat) =>
          stat?.label === "Active Agents"
            ? { ...stat, value: String((state?.agents?.length ?? 0) + 1) }
            : stat
        ),
      };
    }),

  updateAgent: (id, updateData) =>
    set((state) => ({
      agents: state?.agents?.map((a) => (a?.id === id ? { ...a, ...updateData } : a)),
    })),

  // Lead Modals
  openAddLeadModal: () => set({ addLeadModalOpen: true, editingLead: null }),
  openEditLeadModal: (lead) => set({ addLeadModalOpen: true, editingLead: lead }),
  closeAddLeadModal: () => set({ addLeadModalOpen: false, editingLead: null }),

  openScheduleFollowUpModal: (lead) =>
    set({ scheduleFollowUpModalOpen: true, followUpTargetLead: lead }),
  closeScheduleFollowUpModal: () =>
    set({ scheduleFollowUpModalOpen: false, followUpTargetLead: null }),

  openAssignBrokerModal: (lead) =>
    set({ assignBrokerModalOpen: true, assignBrokerTargetLead: lead }),
  closeAssignBrokerModal: () =>
    set({ assignBrokerModalOpen: false, assignBrokerTargetLead: null }),

  openConvertLeadModal: (lead) =>
    set({ convertLeadModalOpen: true, convertLeadTargetLead: lead }),
  closeConvertLeadModal: () =>
    set({ convertLeadModalOpen: false, convertLeadTargetLead: null }),

  openDeleteLeadModal: (lead) =>
    set({ deleteLeadModalOpen: true, deleteLeadTargetLead: lead }),
  closeDeleteLeadModal: () =>
    set({ deleteLeadModalOpen: false, deleteLeadTargetLead: null }),

  // Lead Mutations
  addLead: (leadData) =>
    set((state) => {
      const newId = `LD-${200 + (state?.leads?.length ?? 0) + 1}`;
      const newLead = {
        id: newId,
        name: leadData?.name,
        company: leadData?.company || "Direct Client",
        email: leadData?.email,
        phone: leadData?.phone,
        source: leadData?.source || "Direct",
        origin: leadData?.origin || "TEB",
        destination: leadData?.destination || "MIA",
        route: `${leadData?.origin || "NYC"} → ${leadData?.destination || "Miami"}`,
        interest: leadData?.interest || `${leadData?.origin || "NYC"} → ${leadData?.destination || "Miami"} charter`,
        priority: leadData?.priority || "Medium",
        broker: leadData?.broker || "Barry",
        brokerId: leadData?.brokerId || "AGT-101",
        nextFollowUp: leadData?.nextFollowUp || "Aug 15, 2026",
        followUpTime: leadData?.followUpTime || "10:00 AM",
        followUpMethod: leadData?.followUpMethod || "Call",
        status: leadData?.status || "New",
        createdDate: "Aug 11, 2026",
        departureAirport: leadData?.departureAirport || "KTEB",
        destinationAirport: leadData?.destinationAirport || "KMIA",
        departureDate: leadData?.departureDate || "Aug 20, 2026",
        returnDate: leadData?.returnDate || "Aug 22, 2026",
        passengers: leadData?.passengers ? `${leadData?.passengers} pax` : "4 pax",
        aircraftPreference: leadData?.aircraftPreference || "No preference",
        tripNotes: leadData?.tripNotes || "",
        internalNotes: leadData?.internalNotes || "",
        estValue: leadData?.estValue || "$25,000",
        activities: [
          {
            id: `LACT-${Date.now()}`,
            title: "Lead created",
            timestamp: "Just now",
            author: leadData?.broker || "Barry",
          },
        ],
        followUpsList: [
          {
            id: `LFU-${Date.now()}`,
            title: `${leadData?.nextFollowUp || "Aug 15, 2026"} · ${leadData?.followUpMethod || "Call"}`,
            subtitle: `Assigned to ${leadData?.broker || "Barry"}`,
            status: "Upcoming",
          },
        ],
      };

      return {
        leads: [newLead, ...(state?.leads ?? [])],
        kpiStats: state?.kpiStats?.map((stat) =>
          stat?.label === "Total Leads"
            ? { ...stat, value: String((state?.leads?.length ?? 0) + 1) }
            : stat?.label === "New Leads"
            ? { ...stat, value: String(parseInt(stat?.value, 10) + 1) }
            : stat
        ),
      };
    }),

  updateLead: (id, updateData) =>
    set((state) => ({
      leads: state?.leads?.map((l) => (l?.id === id ? { ...l, ...updateData } : l)),
    })),

  deleteLead: (id) =>
    set((state) => ({
      leads: state?.leads?.filter((l) => l?.id !== id),
      kpiStats: state?.kpiStats?.map((stat) =>
        stat?.label === "Total Leads"
          ? { ...stat, value: String(Math.max(0, (state?.leads?.length ?? 0) - 1)) }
          : stat
      ),
    })),

  scheduleFollowUp: (leadId, followUpData) =>
    set((state) => {
      const followUpItem = {
        id: `LFU-${Date.now()}`,
        title: `${followUpData?.date} · ${followUpData?.method || "Call"}`,
        subtitle: `Assigned to ${followUpData?.broker || "Barry"}`,
        status: "Upcoming",
      };

      const activityItem = {
        id: `LACT-${Date.now()}`,
        title: `Follow-up scheduled for ${followUpData?.date} via ${followUpData?.method || "Call"}`,
        timestamp: "Just now",
        author: "System",
      };

      return {
        leads: state?.leads?.map((l) => {
          if (l?.id === leadId) {
            return {
              ...l,
              nextFollowUp: followUpData?.date || l?.nextFollowUp,
              followUpTime: followUpData?.time || l?.followUpTime,
              followUpMethod: followUpData?.method || l?.followUpMethod,
              followUpsList: [followUpItem, ...(l?.followUpsList || [])],
              activities: [activityItem, ...(l?.activities || [])],
            };
          }
          return l;
        }),
      };
    }),

  assignBroker: (leadId, newBrokerName) =>
    set((state) => {
      const agent = state?.agents?.find((a) => a?.name?.toLowerCase()?.includes(newBrokerName.toLowerCase()));
      const brokerId = agent ? agent?.id : "AGT-101";

      const activityItem = {
        id: `LACT-${Date.now()}`,
        title: `Assigned broker changed to ${newBrokerName}`,
        timestamp: "Just now",
        author: "System",
      };

      return {
        leads: state?.leads?.map((l) => {
          if (l?.id === leadId) {
            return {
              ...l,
              broker: newBrokerName,
              brokerId: brokerId,
              activities: [activityItem, ...(l?.activities || [])],
            };
          }
          return l;
        }),
      };
    }),

  convertLeadToClient: (leadId) =>
    set((state) => {
      const activityItem = {
        id: `LACT-${Date.now()}`,
        title: `Lead converted to active client record (Status set to Won)`,
        timestamp: "Just now",
        author: "System",
      };

      return {
        leads: state?.leads?.map((l) => {
          if (l?.id === leadId) {
            return {
              ...l,
              status: "Won",
              activities: [activityItem, ...(l?.activities || [])],
            };
          }
          return l;
        }),
      };
    }),
}));
