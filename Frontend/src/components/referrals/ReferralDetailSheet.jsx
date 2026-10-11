"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, FileText, Link2, Mail, Phone, RotateCcw, UserPlus } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import CommonSelect from "@/components/common/CommonSelect";
import TableStatus from "@/components/table/common/TableStatus";
import NotesTimeline from "@/components/notes/NotesTimeline";
import FormField from "@/components/trips/FormField";
import { Button } from "@/components/ui/button";
import {
  useConvertReferral,
  useReferral,
  useReferralsTableParams,
  useRestoreReferral,
  useUpdateReferral,
} from "@/hooks/referrals";
import { useCurrentUser } from "@/hooks/auth";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Action, Module, Reach } from "@/lib/access";
import BrokerPicker from "@/components/users/BrokerPicker";
import ClientPicker from "@/components/clients/ClientPicker";
import TripPicker from "@/components/trips/TripPicker";
import { REFERRAL_STATUSES, formatReferralStatus, toReferralRow } from "@/lib/referral";
import { referralAttachmentUrl } from "@/services/referrals.service";
import { uploadUrl } from "@/services/uploads.service";

const STATUS_OPTIONS = REFERRAL_STATUSES.map((value) => ({ value, label: formatReferralStatus(value) }));

/**
 * One referral, worked by the desk (#11): convert it into a client and a trip
 * request, own it, move its status, link the trip it booked — and write the
 * Agent Updates the referral agent reads, which are notes on this referral
 * with "Share with the referring agent" ticked. Everything else on the timeline stays on
 * the desk.
 */
export default function ReferralDetailSheet() {
  const params = useReferralsTableParams();
  const id = params.referral || null;
  const { data, isPending, error, refetch } = useReferral(id);
  const referral = data ? toReferralRow(data) : null;

  return (
    <DetailSheet open={Boolean(id)} onOpenChange={(open) => !open && params.setReferral("")} resetKey={id} bodyClassName="gap-5">
      {!referral ? (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      ) : (
        <ReferralDetail key={referral.id} referral={referral} />
      )}
    </DetailSheet>
  );
}

function ReferralDetail({ referral }) {
  const { data: me } = useCurrentUser();
  const { canAccess, reachOf } = usePermissions();
  const mayWork = canAccess(Module.REFERRALS, Action.EDIT) && !referral.isArchived;
  const mayArchive = canAccess(Module.REFERRALS, Action.ARCHIVE);
  const administers = reachOf(Module.REFERRALS) === Reach.ALL;

  const { mutate: update, isPending: saving } = useUpdateReferral();
  const { mutate: convert, isPending: converting } = useConvertReferral();
  const { mutate: restore } = useRestoreReferral();

  const [linkExisting, setLinkExisting] = useState(false);
  const [existingClientId, setExistingClientId] = useState("");
  const [tripChoice, setTripChoice] = useState("");

  return (
    <>
      <div className="border-b border-border pb-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-montserrat font-bold text-[20px] text-foreground">{referral.clientName}</h2>
          <StatusBadge status={referral.status} bordered />
          {referral.isArchived && <StatusBadge status="Archived" />}
        </div>
        <p className="font-montserrat text-[12px] text-muted-foreground">
          {referral.reference} · Referral source: <span className="font-semibold text-foreground">{referral.agent}</span> ·
          submitted {referral.submittedAt}
        </p>
      </div>

      <SectionCard title="What the agent sent" titleClassName="text-foreground">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField
            label="PHONE"
            value={
              referral.clientPhone ? (
                <a href={`tel:${referral.clientPhone}`} className="inline-flex items-center gap-1 text-purple hover:underline">
                  <Phone className="size-3" />
                  {referral.clientPhone}
                </a>
              ) : (
                "—"
              )
            }
            labelClassName="text-[12px]"
          />
          <DetailField
            label="EMAIL"
            value={
              referral.clientEmail ? (
                <a href={`mailto:${referral.clientEmail}`} className="inline-flex items-center gap-1 text-purple hover:underline break-all">
                  <Mail className="size-3" />
                  {referral.clientEmail}
                </a>
              ) : (
                "—"
              )
            }
            labelClassName="text-[12px]"
          />
          <DetailField label="ROUTE" value={referral.route} labelClassName="text-[12px]" />
          <DetailField label="DEPARTURE" value={referral.departure} labelClassName="text-[12px]" />
          <DetailField label="RETURN" value={referral.returnDate} labelClassName="text-[12px]" />
          <DetailField label="PASSENGERS" value={referral.passengers} labelClassName="text-[12px]" />
          <DetailField label="AIRCRAFT PREFERENCE" value={referral.aircraftPreference} labelClassName="text-[12px]" />
          <DetailField label="APPROX. BUDGET" value={referral.budget} labelClassName="text-[12px]" />
        </div>
        {referral.notes && (
          <p className="font-montserrat text-[13px] text-muted-foreground whitespace-pre-line w-full">{referral.notes}</p>
        )}
        {referral.attachmentUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full">
            {referral.attachmentUrls.map((url, index) => (
              <a
                key={url}
                href={uploadUrl(referralAttachmentUrl(referral.id, url))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 font-montserrat text-[12px] text-purple hover:bg-purple/5"
              >
                <FileText className="size-3.5" />
                Attachment {index + 1}
              </a>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="On the desk" titleClassName="text-foreground">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <FormField label="Status">
            {mayWork ? (
              <CommonSelect
                value={referral.rawStatus}
                onChange={(status) => status !== referral.rawStatus && update({ id: referral.id, status })}
                options={STATUS_OPTIONS}
              />
            ) : (
              <StatusBadge status={referral.status} bordered />
            )}
          </FormField>
          <FormField label="Broker">
            {mayWork && administers ? (
              <BrokerPicker
                value={referral.assignedBrokerId}
                onChange={(brokerId) =>
                  update({ id: referral.id, assignedBrokerId: brokerId || null })
                }
              />
            ) : mayWork && !referral.assignedBrokerId ? (
              <Button variant="outline" size="sm" disabled={saving} className="gap-2 w-fit" onClick={() => update({ id: referral.id, assignedBrokerId: me?.id })}>
                <UserPlus className="size-4" />
                Take this referral
              </Button>
            ) : (
              <span className="font-montserrat text-[13px] font-semibold text-foreground">{referral.broker}</span>
            )}
          </FormField>
        </div>

        {referral.converted ? (
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-montserrat text-[13px] w-full">
            {referral.client && (
              <span>
                Client:{" "}
                <Link href={`/dashboard/clients/${referral.client.id}`} className="font-semibold text-purple hover:underline">
                  {referral.client.name}
                </Link>
              </span>
            )}
            {referral.tripRequest && (
              <span>
                Enquiry:{" "}
                <Link href="/dashboard/trip-requests" className="font-semibold text-purple hover:underline">
                  {referral.tripRequest.reference}
                </Link>
              </span>
            )}
          </div>
        ) : (
          mayWork && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-between">
                <span className="font-montserrat text-[13px] font-semibold text-foreground">
                  Convert into a client and a trip request
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLinkExisting(!linkExisting);
                    setExistingClientId("");
                  }}
                  className="font-montserrat text-[12px] text-purple hover:underline"
                >
                  {linkExisting ? "Create new client instead" : "Link existing client instead"}
                </button>
              </div>
              {linkExisting ? (
                <FormField label="Choose existing client">
                  <ClientPicker
                    value={existingClientId}
                    onChange={setExistingClientId}
                    placeholder="Search and select client…"
                  />
                </FormField>
              ) : (
                <p className="font-montserrat text-[12px] text-muted-foreground">
                  Will create a new client for <span className="font-semibold text-foreground">{referral.clientName}</span> (lead source Referral).
                </p>
              )}
              <Button
                disabled={converting || (linkExisting && !existingClientId)}
                className="gap-2 w-fit"
                onClick={() =>
                  convert({ id: referral.id, ...(linkExisting && existingClientId ? { clientId: existingClientId } : {}) })
                }
              >
                <ArrowRightLeft className="size-4" />
                Convert referral
              </Button>
            </div>
          )
        )}

        {referral.trip ? (
          <p className="font-montserrat text-[13px] w-full">
            Booked trip:{" "}
            {referral.trip.id ? (
              <Link href={`/dashboard/trips/${referral.trip.id}`} className="font-semibold text-purple hover:underline">
                {referral.trip.reference}
              </Link>
            ) : (
              referral.trip.reference
            )}{" "}
            · {referral.trip.date}
          </p>
        ) : (
          mayWork &&
          referral.converted && (
            <div className="flex flex-col gap-2 w-full">
              <FormField label="The trip it booked">
                <TripPicker
                  value={tripChoice}
                  onChange={setTripChoice}
                  params={{ clientId: referral.client?.id }}
                  placeholder="Choose the client's trip"
                />
              </FormField>
              <p className="font-montserrat text-[11px] text-muted-foreground">
                Linking moves the referral to Booked and raises the agent&apos;s commission from their standard structure.
              </p>
              <Button
                variant="outline"
                disabled={!tripChoice || saving}
                className="gap-2 w-fit"
                onClick={() => update({ id: referral.id, tripId: tripChoice })}
              >
                <Link2 className="size-4" />
                Link trip
              </Button>
            </div>
          )
        )}

        {referral.isArchived && mayArchive && (
          <Button variant="outline" className="gap-2 w-fit" onClick={() => restore(referral.id)}>
            <RotateCcw className="size-4" />
            Restore referral
          </Button>
        )}
      </SectionCard>

      <div className="flex flex-col gap-2">
        <h3 className="font-montserrat font-bold text-[15px] text-foreground">Timeline & Agent Updates</h3>
        <p className="font-montserrat text-[12px] text-muted-foreground">
          Tick &ldquo;Share with the referring agent&rdquo; to send an update to {referral.agent}. Everything else stays on the desk.
        </p>
        <NotesTimeline subjectType="REFERRAL" subjectId={referral.id} />
      </div>
    </>
  );
}
