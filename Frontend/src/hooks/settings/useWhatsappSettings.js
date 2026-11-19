"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryPresets } from "@/config/query.config";
import { queryKeys } from "@/lib/queryKeys";
import { toastSuccess } from "@/lib/toast";
import { whatsappSettingsService } from "@/services/whatsappSettings.service";

export function useWhatsappSettings() {
  return useQuery({
    ...queryPresets.standard,
    queryKey: queryKeys.settings.whatsapp,
    queryFn: whatsappSettingsService.get,
  });
}

export function useUpdateWhatsappSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: whatsappSettingsService.update,
    gcTime: 0,
    onSuccess: (settings) => {
      client.setQueryData(queryKeys.settings.whatsapp, settings);
      client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
      toastSuccess("WhatsApp settings saved");
    },
  });
}

export function useSendWhatsappLinkCode() {
  return useMutation({
    mutationFn: whatsappSettingsService.sendCode,
    gcTime: 0,
    onSuccess: () => toastSuccess("Code sent on WhatsApp"),
  });
}

export function useTestWhatsappOpenAi() {
  return useMutation({ mutationFn: whatsappSettingsService.testOpenAi, gcTime: 0 });
}

export function useTestWhatsappMeta() {
  return useMutation({ mutationFn: whatsappSettingsService.testMeta, gcTime: 0 });
}

export function useVerifyWhatsappPhone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: whatsappSettingsService.verify,
    gcTime: 0,
    onSuccess: (linkedPhone) => {
      client.setQueryData(queryKeys.settings.whatsapp, (settings) => settings && { ...settings, linkedPhone });
      client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
      toastSuccess("WhatsApp phone linked");
    },
  });
}

export function useUnlinkWhatsappPhone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: whatsappSettingsService.unlink,
    gcTime: 0,
    onSuccess: () => {
      client.setQueryData(queryKeys.settings.whatsapp, (settings) => settings && { ...settings, linkedPhone: null });
      client.invalidateQueries({ queryKey: queryKeys.settings.whatsapp });
      toastSuccess("WhatsApp phone unlinked");
    },
  });
}
