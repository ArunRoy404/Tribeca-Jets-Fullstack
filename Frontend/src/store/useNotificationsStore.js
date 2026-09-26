import { create } from "zustand";
import { notificationsData } from "@/dummyData/notifications";

/**
 * The top-nav notification list. Dummy-backed until notifications have an
 * API (scope §6.22); when they do, the list moves to React Query and this
 * store keeps only client-side state, if any.
 */
export const useNotificationsStore = create(() => ({
  notifications: notificationsData,
}));
