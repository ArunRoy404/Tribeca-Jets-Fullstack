"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useUser, useUsers } from "@/hooks/users";

const PARAMS = { status: "ACTIVE", sortBy: "firstName", sortOrder: "asc" };

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  BROKER: "Broker",
  ASSISTANT: "Assistant",
};

function assigneeOption(user) {
  // Referral agents cannot receive tasks on desk
  if (user?.role === "REFERRAL_AGENT") return null;

  return {
    value: user?.id,
    label: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Unknown",
    description: user?.email,
    badge: ROLE_LABELS[user?.role] ?? user?.role,
  };
}

/**
 * Assignee picker for desk tasks — built on `RecordPicker` over active staff members:
 * live server search, 10 a page, exclusions for suspended accounts and referral agents.
 */
export default function AssigneePicker({
  value,
  onChange,
  placeholder = "Unassigned",
  ...props
}) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useUsers}
      useOne={useUser}
      params={PARAMS}
      getOption={assigneeOption}
      placeholder={placeholder}
      searchPlaceholder="Search team member name or email…"
      itemLabel="team members"
      allowClear
      clearLabel="Unassigned"
      {...props}
    />
  );
}
