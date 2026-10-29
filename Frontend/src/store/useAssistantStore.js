import { create } from "zustand";

export const useAssistantStore = create((set) => ({
  message: "",
  setMessage: (message) => set({ message }),
  turns: [],
  appendTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  clearTurns: () => set({ turns: [], message: "" }),
}));
