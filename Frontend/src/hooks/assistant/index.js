import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { assistantService } from "@/services/assistant.service";

export const ASSISTANT_SUGGESTIONS_KEY = "assistant-suggestions";

export function useAssistantSuggestions(context, enabled = true) {
  return useQuery({
    queryKey: [ASSISTANT_SUGGESTIONS_KEY, context || "Dashboard"],
    queryFn: () => assistantService.suggestions(context),
    enabled,
    staleTime: 60_000,
  });
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: ({ question, context }) => assistantService.ask({ question, context }),
    onError: (error) => {
      toast.error(error?.message || "Could not reach the Command Center Assistant");
    },
  });
}
