"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryPresets } from "@/config/query.config";
import { queryKeys } from "@/lib/queryKeys";
import { toastSuccess } from "@/lib/toast";
import { whatsappSettingsService } from "@/services/whatsappSettings.service";

// Mutations retain their variables. Give React Query a ticket and keep the
// credentials in a separate, single-use request until the mutation starts.
const requests = new WeakMap();

export function stageWhatsappRequest(data, receive) {
  const ticket = {};
  requests.set(ticket, { data, receive });
  return ticket;
}

function usePrivateMutation(request, onSuccess) {
  return useMutation({
    mutationFn: async (ticket) => {
      const { data, receive } = requests.get(ticket);
      requests.delete(ticket);
      return request(data, receive);
    },
    gcTime: 0,
    retry: false,
    networkMode: "always",
    onSuccess,
  });
}

export function useWhatsappSettings() {
  return useQuery({
    ...queryPresets.standard,
    queryKey: queryKeys.settings.whatsapp,
    queryFn: whatsappSettingsService.get,
  });
}

export function useUpdateWhatsappSettings() {
  const client = useQueryClient();
  return usePrivateMutation(whatsappSettingsService.update, (settings) => {
    client.setQueryData(queryKeys.settings.whatsapp, settings);
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess("WhatsApp settings saved");
  });
}

export function useRevealWhatsappSecret() {
  return usePrivateMutation(async ({ field, currentPassword }, receive) => {
    const { value } = await whatsappSettingsService.reveal(field, currentPassword);
    receive?.(value);
  });
}

export function useSetWhatsappAssistant() {
  const client = useQueryClient();
  return usePrivateMutation(({ enabled, currentPassword }) => whatsappSettingsService.setAssistant(enabled, currentPassword), (settings) => {
    client.setQueryData(queryKeys.settings.whatsapp, settings);
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess(settings.assistantEnabled ? "Assistant on" : "Assistant off");
  });
}

export function useSendWhatsappLinkCode() {
  return usePrivateMutation(whatsappSettingsService.sendCode, () => toastSuccess("Code sent on WhatsApp"));
}

export function useTestWhatsappOpenAi() {
  return usePrivateMutation(whatsappSettingsService.testOpenAi);
}

export function useTestWhatsappMeta() {
  return usePrivateMutation(whatsappSettingsService.testMeta);
}

export function useVerifyWhatsappPhone() {
  const client = useQueryClient();
  return usePrivateMutation(whatsappSettingsService.verify, (linkedPhone) => {
    client.setQueryData(queryKeys.settings.whatsapp, (settings) => settings && {
      ...settings, linkedPhone, readiness: { ...settings.readiness, phoneLinked: true },
    });
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess("WhatsApp phone linked");
  });
}

export function useUnlinkWhatsappPhone() {
  const client = useQueryClient();
  return usePrivateMutation(whatsappSettingsService.unlink, () => {
    client.setQueryData(queryKeys.settings.whatsapp, (settings) => settings && {
      ...settings, linkedPhone: null, readiness: { ...settings.readiness, phoneLinked: false },
    });
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess("WhatsApp phone unlinked");
  });
}
