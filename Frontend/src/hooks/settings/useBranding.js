"use client";

import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "@/lib/queryKeys";
import { queryPresets } from "@/config/query.config";

/**
 * The company's branding — name, logo, contact details when shown. Public:
 * the sign-in page reads it before anyone has a session, and every sidebar
 * reads the same cached copy. Saving Company & Branding invalidates it.
 */
export function useBranding(options = {}) {
  return useQuery({
    queryKey: queryKeys.settings.branding,
    queryFn: settingsService.branding,
    // Ordinary freshness, not "static": another administrator's new logo or
    // name should reach an open tab within a minute, not an hour.
    ...queryPresets.standard,
    ...options,
  });
}

/**
 * "Tribeca Jets Command Center" — the product's name with the company's in
 * front, or just "Command Center" while the branding loads.
 */
export function useProductName() {
  const { data: branding } = useBranding();
  return branding?.companyName ? `${branding.companyName} Command Center` : "Command Center";
}
