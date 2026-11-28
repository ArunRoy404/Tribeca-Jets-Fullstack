"use client";

import RecordPicker from "@/components/common/record-picker/RecordPicker";
import { useClientPassengers } from "@/hooks/clients";
import { formatCalendarDate, toDateInput } from "@/lib/date";

const option = (person) => ({
  value: person.id,
  label: person.fullName,
  description: [person.dateOfBirth ? formatCalendarDate(person.dateOfBirth) : null, person.lastTripReference].filter(Boolean).join(" · "),
});

export default function SavedPassengerPicker({ clientId, onPick, disabled }) {
  return (
    <RecordPicker
      value="" useList={useClientPassengers} params={{ clientId }} getOption={option}
      placeholder="Add from past trips" searchPlaceholder="Search passenger names…" itemLabel="passengers"
      disabled={!clientId || disabled}
      onChange={(_, person) => person && onPick({ fullName: person.fullName, dateOfBirth: toDateInput(person.dateOfBirth), weightLb: person.weightLb ?? "", passportNumber: "" })}
    />
  );
}
