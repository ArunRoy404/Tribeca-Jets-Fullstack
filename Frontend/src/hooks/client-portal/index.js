import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { clientPortalService } from "@/services/clientPortal.service";

export const CLIENT_PORTAL_KEY = "client-portal";

export function useClientPortalOverview(token) {
  return useQuery({
    queryKey: [CLIENT_PORTAL_KEY, token],
    queryFn: () => clientPortalService.overview(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useIssueClientPortalLink() {
  return useMutation({
    mutationFn: (clientId) => clientPortalService.issueLink(clientId),
    onError: (error) => {
      toast.error(error?.message || "Could not generate client portal link");
    },
  });
}

export function useRespondClientPortalQuote(token) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, decision, notes }) =>
      clientPortalService.respondToQuote({ token, quoteId, decision, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [CLIENT_PORTAL_KEY, token] });
      toast.success(
        variables.decision === "APPROVE"
          ? "Quote approved. Your charter advisor has been notified."
          : "Quote declined. Your response has been recorded.",
      );
    },
    onError: (error) => {
      toast.error(error?.message || "Could not record your response");
    },
  });
}
