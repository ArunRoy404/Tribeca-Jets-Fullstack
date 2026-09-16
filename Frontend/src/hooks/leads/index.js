/**
 * The Leads screen's own hooks.
 *
 * There is no `useLeads`: a lead is a `Client` at lead stage, so the screen
 * calls `useClients` with `status: "LEAD"`. A second list hook would be a
 * second place deciding what a lead is.
 */
export { useLeadsTableParams } from "./useLeadsTableParams";
