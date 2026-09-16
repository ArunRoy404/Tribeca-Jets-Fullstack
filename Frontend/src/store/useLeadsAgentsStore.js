import { create } from "zustand";

/**
 * Client-only state for the Leads & Agents screens.
 *
 * The data itself comes from the API: leads are clients at lead stage
 * (`@/hooks/clients`), their enquiries are trip requests
 * (`@/hooks/trip-requests`), and the Agents roster is
 * `useBrokerPerformance`. Table state lives in the URL via
 * `useLeadsTableParams`.
 *
 * What is left here is what the server does not own and a link would not
 * carry: which tab is showing, which dialog is open, and on which row.
 *
 * The data arrays, their filtering and their pagination getters were deleted
 * when this module graduated — see the data-layer section of
 * `Frontend/AGENTS.md`.
 */
export const useLeadsAgentsStore = create((set) => ({
  /** "leads" | "agents" */
  activeMainTab: "leads",
  activeDetailTab: "overview",

  addLeadModalOpen: false,
  editingLead: null,

  followUpModalOpen: false,
  followUpTargetLead: null,

  assignBrokerModalOpen: false,
  assignBrokerTargetLead: null,

  convertLeadModalOpen: false,
  convertLeadTargetLead: null,

  /** Named "archive", not "delete": nothing in this system is destroyed. */
  archiveLeadModalOpen: false,
  /** Held whole, not by id: the row must stay nameable in the confirmation
   *  dialog even after the list refetches and drops it. */
  archivingLead: null,

  setActiveMainTab: (activeMainTab) => set({ activeMainTab }),
  setActiveDetailTab: (activeDetailTab) => set({ activeDetailTab }),

  openAddLeadModal: () => set({ addLeadModalOpen: true, editingLead: null }),
  openEditLeadModal: (lead) => set({ addLeadModalOpen: true, editingLead: lead }),
  closeAddLeadModal: () => set({ addLeadModalOpen: false, editingLead: null }),

  openFollowUpModal: (lead) =>
    set({ followUpModalOpen: true, followUpTargetLead: lead }),
  closeFollowUpModal: () =>
    set({ followUpModalOpen: false, followUpTargetLead: null }),

  openAssignBrokerModal: (lead) =>
    set({ assignBrokerModalOpen: true, assignBrokerTargetLead: lead }),
  closeAssignBrokerModal: () =>
    set({ assignBrokerModalOpen: false, assignBrokerTargetLead: null }),

  openConvertLeadModal: (lead) =>
    set({ convertLeadModalOpen: true, convertLeadTargetLead: lead }),
  closeConvertLeadModal: () =>
    set({ convertLeadModalOpen: false, convertLeadTargetLead: null }),

  openArchiveLeadModal: (lead) =>
    set({ archiveLeadModalOpen: true, archivingLead: lead }),
  closeArchiveLeadModal: () =>
    set({ archiveLeadModalOpen: false, archivingLead: null }),
}));
