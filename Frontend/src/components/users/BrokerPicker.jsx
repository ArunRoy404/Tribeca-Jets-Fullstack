"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useUser, useUsers } from "@/hooks/users";

const PARAMS = { role: "BROKER", status: "ACTIVE", sortBy: "firstName", sortOrder: "asc" };

function brokerOption(user) {
  return {
    value: user?.id,
    label: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Unknown",
    description: user?.email,
  };
}

/**
 * The broker picker every staff form uses — `RecordPicker` over the real
 * staff directory filtered to active brokers:
 * live search, 10 a page by default, paged by server.
 */
export default function BrokerPicker({
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
      getOption={brokerOption}
      placeholder={placeholder}
      searchPlaceholder="Search broker name or email…"
      itemLabel="brokers"
      allowClear
      clearLabel="Unassigned"
      {...props}
    />
  );
}
