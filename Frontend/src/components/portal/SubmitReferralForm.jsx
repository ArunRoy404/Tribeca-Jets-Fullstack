"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import DatePicker from "@/components/common/DatePicker";
import TimePicker from "@/components/common/TimePicker";
import SectionHeader from "@/components/common/SectionHeader";
import FileUpload, { ACCEPT } from "@/components/common/FileUpload";
import FormField from "@/components/trips/FormField";
import { Button } from "@/components/ui/button";
import { useAirports } from "@/hooks/airports";
import { useCurrentUser } from "@/hooks/auth";
import { useSubmitReferral } from "@/hooks/referrals";
import { FILTERABLE_AIRCRAFT_CATEGORIES, formatAircraftCategory } from "@/lib/aircraft";
import { optionalNumber, optionalText } from "@/lib/form";
import { personName } from "@/lib/lead";

const NO_PREFERENCE = "__none__";
const MAX_ATTACHMENTS = 10;
const ATTACHMENT_ACCEPT = `${ACCEPT.image},${ACCEPT.document}`;

const AIRCRAFT_OPTIONS = [
  { value: NO_PREFERENCE, label: "No preference" },
  ...FILTERABLE_AIRCRAFT_CATEGORIES.map((value) => ({ value, label: formatAircraftCategory(value) })),
];

const EMPTY_FORM = {
  clientFirstName: "",
  clientLastName: "",
  clientPhone: "",
  clientEmail: "",
  originAirportId: "",
  destinationAirportId: "",
  departureDate: "",
  returnDate: "",
  departureTime: "",
  passengers: "",
  aircraftPreference: NO_PREFERENCE,
  budget: "",
  notes: "",
  attachmentUrls: [],
};

/**
 * The partner portal's Submit Referral form — client adjustment #11, field for
 * field: client name, phone, email, departure and arrival airports,
 * departure/return dates, departure time, passenger count, aircraft
 * preference, approximate budget, notes and attachments.
 *
 * "Referral Source: [agent]" is never typed: the API records the signed-in
 * agent as the source. A way to reach the client (phone or email) is the only
 * thing required beyond the name — an agent often passes a client on before a
 * date is settled, and the desk fills in the rest.
 *
 * Attachments upload before the referral exists, as every upload here does,
 * and are private to the agent; the desk opens them through the referral.
 */
export default function SubmitReferralForm() {
  const router = useRouter();
  const { data: me } = useCurrentUser();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));
  const setText = (field) => (event) => set(field)(event.target.value);

  const { data: airports } = useAirports({ limit: 100, sortBy: "icao", sortOrder: "asc" });
  const airportOptions = useMemo(
    () => (airports?.data ?? []).map((a) => ({ value: a.id, label: `${a.icao} · ${a.city ?? a.name}` })),
    [airports?.data],
  );

  const { mutate: submit, isPending } = useSubmitReferral();

  const validate = () => {
    const next = {};
    if (!form.clientFirstName.trim()) next.clientFirstName = "Enter the client's first name";
    if (!form.clientLastName.trim()) next.clientLastName = "Enter the client's last name";
    if (!form.clientPhone.trim() && !form.clientEmail.trim()) {
      next.clientPhone = "Give a phone number or an email so the desk can reach the client";
    }
    if (form.originAirportId && form.originAirportId === form.destinationAirportId) {
      next.destinationAirportId = "Departure and arrival cannot be the same airport";
    }
    if (form.returnDate && form.departureDate && form.returnDate < form.departureDate) {
      next.returnDate = "The return cannot be before the departure";
    }
    return next;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      clientFirstName: form.clientFirstName.trim(),
      clientLastName: form.clientLastName.trim(),
      clientPhone: optionalText(form.clientPhone),
      clientEmail: optionalText(form.clientEmail),
      originAirportId: form.originAirportId || undefined,
      destinationAirportId: form.destinationAirportId || undefined,
      departureDate: form.departureDate || undefined,
      returnDate: form.returnDate || undefined,
      departureTime: form.departureTime || undefined,
      passengers: optionalNumber(form.passengers),
      aircraftPreference: form.aircraftPreference !== NO_PREFERENCE ? form.aircraftPreference : undefined,
      budget: optionalNumber(form.budget),
      notes: optionalText(form.notes),
      attachmentUrls: form.attachmentUrls,
    };

    submit(payload, {
      onSuccess: (referral) => {
        setForm(EMPTY_FORM);
        router.push(referral?.id ? `/portal/referrals?referral=${referral.id}` : "/portal/referrals");
      },
      onError: (error) => setErrors(error?.fieldErrors ?? {}),
    });
  };

  return (
    <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
      <SectionHeader title="New Referral" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4 sm:p-6 w-full" noValidate>
        <p className="font-montserrat text-[13px] text-muted-foreground">
          Referral source: <span className="font-semibold text-foreground">{me ? personName(me) : "—"}</span>. The
          Tribeca desk will contact the client and keep you updated here.
        </p>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-montserrat font-bold text-[15px] text-foreground">Client</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First name" error={errors.clientFirstName}>
              <CommonInput value={form.clientFirstName} onChange={setText("clientFirstName")} placeholder="e.g. Olivia" required />
            </FormField>
            <FormField label="Last name" error={errors.clientLastName}>
              <CommonInput value={form.clientLastName} onChange={setText("clientLastName")} placeholder="e.g. Harper" required />
            </FormField>
            <FormField label="Phone" error={errors.clientPhone}>
              <CommonInput type="tel" value={form.clientPhone} onChange={setText("clientPhone")} placeholder="+1 212 555 0100" />
            </FormField>
            <FormField label="Email" error={errors.clientEmail}>
              <CommonInput type="email" value={form.clientEmail} onChange={setText("clientEmail")} placeholder="client@example.com" />
            </FormField>
          </div>
          <p className="font-montserrat text-[12px] text-muted-foreground">A phone number or an email is required.</p>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-montserrat font-bold text-[15px] text-foreground">Trip (Optional)</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Departure airport" error={errors.originAirportId}>
              <CommonSelect value={form.originAirportId} onChange={set("originAirportId")} options={airportOptions} placeholder="Choose airport" />
            </FormField>
            <FormField label="Arrival airport" error={errors.destinationAirportId}>
              <CommonSelect
                value={form.destinationAirportId}
                onChange={set("destinationAirportId")}
                options={airportOptions}
                placeholder="Choose airport"
              />
            </FormField>
            <FormField label="Departure date" error={errors.departureDate}>
              <DatePicker value={form.departureDate} onChange={set("departureDate")} placeholder="Choose Date" />
            </FormField>
            <FormField label="Return date" error={errors.returnDate}>
              <DatePicker value={form.returnDate} onChange={set("returnDate")} placeholder="One way" />
            </FormField>
            <FormField label="Departure time" error={errors.departureTime}>
              <TimePicker value={form.departureTime} onChange={set("departureTime")} placeholder="Choose Time" />
            </FormField>
            <FormField label="Passengers" error={errors.passengers}>
              <CommonInput
                type="number"
                min={1}
                max={500}
                value={form.passengers}
                onChange={setText("passengers")}
                placeholder="e.g. 4"
              />
            </FormField>
            <FormField label="Aircraft preference" error={errors.aircraftPreference}>
              <CommonSelect value={form.aircraftPreference} onChange={set("aircraftPreference")} options={AIRCRAFT_OPTIONS} />
            </FormField>
            <FormField label="Approximate budget (USD)" error={errors.budget}>
              <CommonInput type="number" min={1} step="0.01" value={form.budget} onChange={setText("budget")} placeholder="e.g. 45000" />
            </FormField>
          </div>
        </fieldset>

        <FormField label="Notes (Optional)" error={errors.notes}>
          <CommonInput
            type="textarea"
            value={form.notes}
            onChange={setText("notes")}
            placeholder="Anything the desk should know — flexibility on dates, pets, catering, how the client prefers to be contacted."
          />
        </FormField>

        <FormField label="Attachments (Optional)" error={errors.attachmentUrls}>
          <FileUpload
            variant="dropzone"
            kind="auto"
            visibility="PRIVATE"
            multiple
            accept={ATTACHMENT_ACCEPT}
            heading="Add files"
            description={`PDF, Word, Excel, text or images · up to ${MAX_ATTACHMENTS} files`}
            value={form.attachmentUrls}
            disabled={form.attachmentUrls.length >= MAX_ATTACHMENTS}
            onUploaded={(file) =>
              file?.url &&
              setForm((prev) =>
                prev.attachmentUrls.includes(file.url) || prev.attachmentUrls.length >= MAX_ATTACHMENTS
                  ? prev
                  : { ...prev, attachmentUrls: [...prev.attachmentUrls, file.url] },
              )
            }
            onRemove={(index) =>
              setForm((prev) => ({ ...prev, attachmentUrls: prev.attachmentUrls.filter((_, i) => i !== index) }))
            }
          />
        </FormField>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => { setForm(EMPTY_FORM); setErrors({}); }}>
            Clear form
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            <Send className="size-4" />
            {isPending ? "Submitting…" : "Submit referral"}
          </Button>
        </div>
      </form>
    </CommonCard>
  );
}
