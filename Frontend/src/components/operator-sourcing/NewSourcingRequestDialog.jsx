"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { useOperatorSourcingStore } from "@/store/useOperatorSourcingStore";
import { useCreateTripRequest } from "@/hooks/trip-requests";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TripRequestForm, {
  EMPTY_TRIP_REQUEST_FORM,
  toTripRequestPayload,
} from "@/components/trip-requests/TripRequestForm";

/**
 * Files an enquiry to be sourced.
 *
 * **This writes a trip request**, because that is what a sourcing request is —
 * the board's rows are enquiries being worked, and there is no separate
 * sourcing table. The only field sourcing adds is the quote deadline.
 *
 * The fields themselves live in `TripRequestForm`, shared with the Trip
 * Requests page: both screens write the same record, and two copies of a
 * twelve-field form drift the first time the API gains a column.
 *
 * Status is hidden here on purpose. A request filed from this board is being
 * sourced by definition, so offering the five pipeline states would invite
 * someone to file one already marked Lost.
 *
 * Nothing here defaults a value. The dialog used to send `broker: "Ari"`,
 * `"TBD"` routes and `"$0"` for an empty budget, so every request created
 * through it carried a broker nobody assigned and a zero budget that fed
 * straight into the desk's pipeline total.
 */
export default function NewSourcingRequestDialog() {
  const open = useOperatorSourcingStore((s) => s.newRequestOpen);
  const closeNewRequest = useOperatorSourcingStore((s) => s.closeNewRequest);
  const { mutate: createRequest, isPending } = useCreateTripRequest();

  const [form, setForm] = useState(EMPTY_TRIP_REQUEST_FORM);
  const setField = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleClose = () => {
    setForm(EMPTY_TRIP_REQUEST_FORM);
    closeNewRequest();
  };

  const handleCreate = () => {
    if (!form.clientId) return;
    createRequest(
      { ...toTripRequestPayload(form), status: "OPEN" },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-5xl rounded-2xl p-6 gap-4 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-secondary flex items-start justify-between gap-4 pb-4 w-full">
          <div className="flex flex-col gap-2">
            <DialogTitle className="font-montserrat font-bold text-[20px] text-black-text leading-none">
              New Sourcing Request
            </DialogTitle>
            <p className="font-montserrat font-medium text-[16px] text-muted-foreground">
              File the enquiry, then send it out to operators
            </p>
          </div>
        </div>

        <TripRequestForm
          form={form}
          setField={setField}
          enabled={open}
          showStatus={false}
        />

        <div className="border-t border-secondary flex gap-2 items-center pt-4 w-full">
          <Button variant="outline" className="gap-2 px-4 cursor-pointer" onClick={handleClose}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            className="gap-2 px-4 cursor-pointer"
            disabled={isPending || !form.clientId}
            onClick={handleCreate}
          >
            <Pencil className="size-4" />
            Create Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
