"use client";

import { FileText, Mail, MessageSquare, Phone, Plane } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import SectionCard from "@/components/common/SectionCard";
import StatusBadge from "@/components/common/StatusBadge";
import TableStatus from "@/components/table/common/TableStatus";
import ProgressStepper from "@/components/trips/progress/ProgressStepper";
import { useReferral, useReferralsTableParams } from "@/hooks/referrals";
import { useNotes } from "@/hooks/notes";
import { REFERRAL_LADDER, formatReferralStatus, toReferralRow } from "@/lib/referral";
import { formatTimestamp } from "@/lib/archive";
import { personName } from "@/lib/lead";
import { uploadUrl } from "@/services/uploads.service";

const LADDER_LABELS = REFERRAL_LADDER.map(formatReferralStatus);

/**
 * One of the agent's own referrals (#11): where it stands on
 * Submitted → Contacted → Quoting → Booked → Completed, what they sent, the
 * trip it booked, and the Agent Updates — the notes a broker ticked "Share
 * with the referring agent". The desk's internal notes never reach this
 * screen: the API returns SHARED notes only to a referral agent.
 */
export default function PortalReferralSheet() {
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
  const step = REFERRAL_LADDER.indexOf(referral.rawStatus);
  const closed = step === -1;

  return (
    <>
      <div className="border-b border-border pb-3 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-montserrat font-bold text-[20px] text-foreground">{referral.clientName}</h2>
          <StatusBadge status={referral.status} bordered />
        </div>
        <p className="font-montserrat text-[12px] text-muted-foreground">
          {referral.reference} · submitted {referral.submittedAt}
        </p>
      </div>

      <SectionCard title="Progress" titleClassName="text-foreground">
        {closed ? (
          <p className="font-montserrat text-[13px] text-muted-foreground w-full">
            This referral is marked <span className="font-semibold text-foreground">{referral.status}</span>. The
            Tribeca desk is no longer working it.
          </p>
        ) : (
          <ProgressStepper steps={LADDER_LABELS} currentIndex={step} />
        )}
        {referral.trip && (
          <p className="inline-flex items-center gap-2 font-montserrat text-[13px] text-foreground w-full">
            <Plane className="size-4 text-purple" />
            Booked trip <span className="font-semibold">{referral.trip.reference}</span> · departs {referral.trip.date}
          </p>
        )}
      </SectionCard>

      <AgentUpdates referralId={referral.id} />

      <SectionCard title="What you sent" titleClassName="text-foreground">
        <div className="grid grid-cols-2 gap-4 w-full">
          <DetailField
            label="PHONE"
            value={
              referral.clientPhone ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  {referral.clientPhone}
                </span>
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
                <span className="inline-flex items-center gap-1 break-all">
                  <Mail className="size-3" />
                  {referral.clientEmail}
                </span>
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
                href={uploadUrl(url)}
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
    </>
  );
}

/**
 * #11's "Agent Update" field — notes the desk intentionally shared, newest
 * first. Read-only: the portal answers through the Tribeca desk, not through
 * the CRM's notes.
 */
function AgentUpdates({ referralId }) {
  const { data, isPending, error, refetch } = useNotes("REFERRAL", referralId, { limit: 50 });
  const updates = data?.data ?? [];

  return (
    <SectionCard title="Updates from Tribeca" titleClassName="text-foreground">
      {isPending || error || updates.length === 0 ? (
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={!isPending && !error}
          emptyMessage="No updates yet"
          emptyHint="The desk will post updates here as they work this referral."
          onRetry={refetch}
        />
      ) : (
        <ul className="flex flex-col gap-3 w-full">
          {updates.map((note) => (
            <li key={note.id} className="flex gap-3 rounded-md border border-border bg-white p-3">
              <MessageSquare className="size-4 text-purple mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-montserrat text-[13px] text-foreground whitespace-pre-line break-words">{note.body}</p>
                <p className="font-montserrat text-[11px] text-muted-foreground">
                  {note.createdBy ? personName(note.createdBy) : "Tribeca Jets"} · {formatTimestamp(note.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
