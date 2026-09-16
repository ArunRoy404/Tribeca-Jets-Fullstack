/**
 * Public surface of the aircraft data layer.
 *
 * Components import from `@/hooks/aircraft`, never from the individual files.
 */
export { useAircraftList } from "./useAircraftList";
export { useAircraftDetail } from "./useAircraftDetail";
export { useAircraftStats } from "./useAircraftStats";
export { useAircraftAmenities } from "./useAircraftAmenities";
export { useCreateAircraft } from "./useCreateAircraft";
export { useUpdateAircraft } from "./useUpdateAircraft";
export { useRemoveAircraft } from "./useRemoveAircraft";
export { useRestoreAircraft } from "./useRestoreAircraft";
export { useRemoveManyAircraft } from "./useRemoveManyAircraft";
export { useRestoreManyAircraft } from "./useRestoreManyAircraft";
export { useAircraftTableParams } from "./useAircraftTableParams";
