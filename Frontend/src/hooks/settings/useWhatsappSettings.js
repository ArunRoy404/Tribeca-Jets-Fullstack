"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryPresets } from "@/config/query.config";
import { PAGE_SIZE_OPTIONS } from "@/hooks/common/useTableQueryParams";
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
  const client = useQueryClient();
  return usePrivateMutation(async ({ field, currentPassword }, receive) => {
    const { value } = await whatsappSettingsService.reveal(field, currentPassword);
    receive?.(value);
  }, () => client.invalidateQueries({ queryKey: queryKeys.settings.whatsappHistory() }));
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
  return usePrivateMutation(whatsappSettingsService.verify, () => {
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess("WhatsApp phone linked");
  });
}

export function useUnlinkWhatsappPhone() {
  const client = useQueryClient();
  return usePrivateMutation(({ id, currentPassword }) => whatsappSettingsService.unlinkPhone(id, currentPassword), () => {
    client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
    toastSuccess("WhatsApp phone unlinked");
  });
}

export function useRenameWhatsappPhone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }) => whatsappSettingsService.renamePhone(id, label),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
      toastSuccess("Phone renamed");
    },
  });
}

export function useWhatsappPhones() {
  return useQuery({
    ...queryPresets.standard,
    queryKey: queryKeys.settings.whatsappPhones(),
    queryFn: ({ signal }) => whatsappSettingsService.phones({}, signal),
  });
}

export function useWhatsappHistoryPhones() {
  return useQuery({
    ...queryPresets.standard,
    queryKey: queryKeys.settings.whatsappPhones({ includeArchived: true }),
    queryFn: async ({ signal }) => {
      const phones = new Map();
      for (let page = 1; ; page++) {
        const result = await whatsappSettingsService.phones({ includeArchived: true, page, limit: PAGE_SIZE_OPTIONS.at(-1) }, signal);
        result?.data?.forEach((phone) => phones.set(phone?.id, phone));
        if (!result?.meta?.hasNext) return [...phones.values()];
      }
    },
  });
}

export function useWhatsappHistory(params) {
  return useQuery({
    ...queryPresets.live,
    queryKey: queryKeys.settings.whatsappHistory(params),
    queryFn: ({ signal }) => whatsappSettingsService.history(params, signal),
    placeholderData: keepPreviousData,
  });
}
