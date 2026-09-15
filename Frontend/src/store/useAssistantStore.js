import { create } from "zustand";
import { assistantSuggestions } from "@/dummyData/assistant";

export const useAssistantStore = create((set) => ({
  suggestions: assistantSuggestions,
  message: "",
  setMessage: (message) => set({ message }),
}));
