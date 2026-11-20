"use client";

import { X } from "lucide-react";
import DatePicker from "@/components/common/DatePicker";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { useWhatsappHistory, useWhatsappHistoryPhones } from "@/hooks/settings/useWhatsappSettings";
import { formatTimestamp } from "@/lib/archive";

export const WHATSAPP_HISTORY_TYPES = [
  { value: "messages", label: "Messages" },
  { value: "actions", label: "Actions" },
  { value: "documents", label: "Documents" },
  { value: "settings", label: "Settings" },
];

const EVENT_LABELS = {
  "whatsapp.question_answered": "Question answered",
  "whatsapp.action_proposed": "Action proposed",
  "whatsapp.action_confirmed": "Action confirmed",
  "whatsapp.action_cancelled": "Action cancelled",
  "whatsapp.document_sent": "Document sent",
  "whatsapp.reply_failed": "Reply failed",
  "user.whatsapp_linked": "Phone linked",
  "user.whatsapp_unlinked": "Phone unlinked",
  "user.whatsapp_phone_renamed": "Phone renamed",
  "whatsapp_assistant.switched_on": "Assistant switched on",
  "whatsapp_assistant.switched_off": "Assistant switched off",
  "whatsapp_settings.updated": "Settings updated",
  "whatsapp_settings.revealed": "Credential revealed",
};

const ACTION_LABELS = {
  TRIP_APPROVE: "Approve trip",
  TRIP_DECLINE: "Decline trip",
  LEAD_CREATE: "Create lead",
  TASK_COMPLETE: "Complete task",
  PAYMENT_RECORD: "Record payment",
  TASK_CREATE: "Create task",
  CLIENT_FOLLOW_UP: "Schedule client follow-up",
  NOTE_CREATE: "Add internal note",
  TRIP_STATUS: "Change trip status",
  TRIP_ASSIGN: "Reassign trip",
  CLIENT_ASSIGN: "Reassign client",
  QUOTE_SEND: "Mark quote sent",
  itinerary: "Itinerary",
  quote: "Quote",
  invoice: "Invoice",
};

const NEW_RECORD = { TASK_CREATE: "new task", LEAD_CREATE: "new lead", NOTE_CREATE: "new note" };
const COLUMNS = [
  { key: "when", label: "When" }, { key: "phone", label: "Phone" },
  { key: "event", label: "Event" }, { key: "details", label: "Details" },
];
const ALL_PHONES = "All phones";
const ALL_EVENTS = "All events";
const TYPE_VALUES = WHATSAPP_HISTORY_TYPES.map(({ value }) => value);
const TYPE_LABELS = Object.fromEntries(WHATSAPP_HISTORY_TYPES.map(({ value, label }) => [value, label]));

function phoneLabel(phone, archived) {
  return phone ? `${phone.label} · …${phone.last4}${archived ? " (unlinked)" : ""}` : "—";
}

function historyRow(entry, archived) {
  const { id, action, phone, details, at } = entry;
  const parts = [
    ACTION_LABELS[details?.kind],
    details?.ref ?? NEW_RECORD[details?.kind],
    details?.outcome === "refused" ? "Refused" : null,
    details?.tools?.join(", "),
    details?.fields?.join(", "),
    details?.field,
    details?.last4 && `…${details.last4}`,
  ].filter(Boolean);
  const event = details?.notConfirmed ? "Proposed — not confirmed" : EVENT_LABELS[action];
  return {
    id,
    when: formatTimestamp(at),
    phone: phoneLabel(phone, archived.has(phone?.id)),
    event: details?.beforePhoneNames ? `${event} (before phone names)` : event,
    details: parts.length ? parts.join(" · ") : "—",
  };
}

export default function WhatsappHistory({ params, values, setters, setValues, goToPage }) {
  const query = useWhatsappHistory(params);
  const phones = useWhatsappHistoryPhones();
  const archived = new Set(phones.data?.filter((phone) => phone?.deletedAt).map((phone) => phone?.id));
  const rows = query.data?.data?.map((entry) => historyRow(entry, archived));
  const meta = query.data?.meta;
  const changePage = (page) => goToPage(page, meta?.totalPages);

  const phoneIds = phones.data?.map((phone) => phone?.id) ?? [];
  const phoneNames = Object.fromEntries(phones.data?.map((phone) => [phone?.id, phoneLabel(phone, Boolean(phone?.deletedAt))]) ?? []);
  const phoneFilter = useEnumFilter(phoneIds, (id) => phoneNames[id], ALL_PHONES);
  const typeFilter = useEnumFilter(TYPE_VALUES, (type) => TYPE_LABELS[type], ALL_EVENTS);
  const hasFilters = Boolean(values?.phoneId || values?.type || values?.from || values?.to);

  // Picking a From after the To (or the reverse) clears the other end rather
  // than sending a range the API refuses.
  function setDate(key, value) {
    const opposite = key === "from" ? "to" : "from";
    const crosses = value && values?.[opposite] && (key === "from" ? value > values.to : value < values.from);
    setValues({ [key]: value ?? "", ...(crosses && { [opposite]: "" }) });
  }

  return (
    <section aria-label="WhatsApp history" className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex w-full flex-wrap items-center gap-2 border-b border-border bg-sidebar p-3 sm:p-4">
        <FilterDropdown label={ALL_PHONES} value={phoneFilter.labelFor(values?.phoneId)} options={phoneFilter.options}
          onChange={(label) => setters.setPhoneId(phoneFilter.valueByLabel[label] ?? "")} />
        <FilterDropdown label={ALL_EVENTS} value={typeFilter.labelFor(values?.type)} options={typeFilter.options}
          onChange={(label) => setters.setType(typeFilter.valueByLabel[label] ?? "")} />
        <div className="flex shrink-0 items-center gap-1.5">
          <DatePicker size="sm" value={values?.from} maxDate={values?.to || undefined}
            onChange={(value) => setDate("from", value)} placeholder="From" />
          <span className="text-[10px] font-medium text-muted-foreground">to</span>
          <DatePicker size="sm" value={values?.to} minDate={values?.from || undefined}
            onChange={(value) => setDate("to", value)} placeholder="To" />
        </div>
        <PageSizeSelect value={values?.limit} onChange={setters.setLimit} />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => setValues({ phoneId: "", type: "", from: "", to: "" })}
            className="h-7 shrink-0 cursor-pointer gap-1 px-2 text-[10px] text-muted-foreground hover:text-foreground">
            <X className="size-3" />
            Clear filters
          </Button>
        )}
      </div>
      <div className="p-4 sm:p-6">
      {phones.error && <p role="alert" className="text-sm text-destructive">Could not load phone filters.</p>}
      <TableStatus isLoading={query.isPending} error={query.error} onRetry={query.refetch} isEmpty={!rows?.length}
        emptyMessage="Nothing yet." emptyHint="Messages, actions and settings changes appear here." />
      {rows?.length > 0 && (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader><TableRow>{COLUMNS.map(({ key, label }) => <TableHead key={key}>{label}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{rows.map((row) => (
                <TableRow key={row?.id}>{COLUMNS.map(({ key }) => (
                  <TableCell key={key} className="whitespace-normal break-words">{row?.[key]}</TableCell>
                ))}</TableRow>
              ))}</TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 lg:hidden">{rows.map((row) => (
            <li key={row?.id} className="min-w-0 rounded-md border border-border p-3">
              <dl className="grid gap-2">
                {COLUMNS.map(({ key, label }) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="break-words text-sm">{row?.[key]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}</ul>
        </>
      )}
      {meta?.total > 0 && (
        <TablePagination totalCount={meta.total} itemLabel="events" page={meta.page} pageCount={meta.totalPages}
          onPageChange={changePage} onPrev={() => changePage(meta.page - 1)} onNext={() => changePage(meta.page + 1)} />
      )}
      </div>
    </section>
  );
}
