"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useSidebarStore = create(
  persist(
    (set, get) => ({
      open: true,
      setOpen: (openOrFn) => {
        const next = typeof openOrFn === "function" ? openOrFn(get().open) : openOrFn;
        set({ open: Boolean(next) });
      },
      toggleSidebar: () => {
        set((state) => ({ open: !state.open }));
      },
    }),
    {
      name: "tj_sidebar_state",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
