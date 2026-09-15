/**
 * Public surface of the airports data layer.
 *
 * Components import from `@/hooks/airports`, never from the individual files,
 * so a hook can be split or renamed without touching every call site.
 */
export { useAirports } from "./useAirports";
export { useAirport } from "./useAirport";
export { useAirportStats } from "./useAirportStats";
export { useAirportCountries } from "./useAirportCountries";
export { useCreateAirport } from "./useCreateAirport";
export { useUpdateAirport } from "./useUpdateAirport";
export { useRemoveAirport } from "./useRemoveAirport";
export { useRemoveAirports } from "./useRemoveAirports";
export { useRestoreAirport } from "./useRestoreAirport";
export { useAirportsTableParams } from "./useAirportsTableParams";
