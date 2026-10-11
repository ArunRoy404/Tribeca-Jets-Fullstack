"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useUser, useUsers } from "@/hooks/users";
import { formatStructure } from "@/lib/commission";

const PARAMS = { role: "REFERRAL_AGENT", status: "ACTIVE", sortBy: "firstName", sortOrder: "asc" };

function agentOption(user) {
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Unknown";
  const terms = user?.commissionBasis ? formatStructure(user) : null;
  const description = [user?.email, terms ? `Standing: ${terms}` : null].filter(Boolean).join(" · ");
  return {
    value: user?.id,
    label: name,
    description,
  };
}

/**
 * Reusable Referral Agent picker over the users directory filtered to active referral agents:
 * live search, 10 a page by default, paged by server via RecordPicker.
 */
export default function ReferralAgentPicker({
  value,
  onChange,
  placeholder = "Choose the referral agent",
  ...props
}) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useUsers}
      useOne={useUser}
      params={PARAMS}
      getOption={agentOption}
      placeholder={placeholder}
      searchPlaceholder="Search agent name or email…"
      itemLabel="referral agents"
      {...props}
    />
  );
}
