/**
 * Public surface of the clients data layer.
 *
 * Components import from `@/hooks/clients`, never from the individual files.
 */
export { useClients } from "./useClients";
export { useClient } from "./useClient";
export { useClientStats } from "./useClientStats";
export { useCreateClient } from "./useCreateClient";
export { useUpdateClient } from "./useUpdateClient";
export { useRemoveClient } from "./useRemoveClient";
export { useRemoveClients } from "./useRemoveClients";
export { useRestoreClient } from "./useRestoreClient";
export { useRestoreClients } from "./useRestoreClients";
export { useClientsTableParams } from "./useClientsTableParams";
