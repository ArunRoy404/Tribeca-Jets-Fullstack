"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useClient, useClients } from "@/hooks/clients";
import { personName } from "@/lib/lead";

const PARAMS = { sortBy: "firstName", sortOrder: "asc" };

function clientOption(client) {
  const name = personName(client);
  const company = client?.companyName;
  const email = client?.email;
  const description = [company, email].filter(Boolean).join(" · ") || client?.type || "";

  return {
    value: client?.id,
    label: name,
    description,
  };
}

/**
 * The client picker every form uses — `RecordPicker` over the real
 * client directory: live search by name, company, email, 10 a page by default,
 * paged by server.
 */
export default function ClientPicker({
  value,
  onChange,
  placeholder = "Select client",
  ...props
}) {
  return (
    <RecordPicker
      value={value}
      onChange={onChange}
      useList={useClients}
      useOne={useClient}
      params={PARAMS}
      getOption={clientOption}
      placeholder={placeholder}
      searchPlaceholder="Search client name, company or email…"
      itemLabel="clients"
      {...props}
    />
  );
}
