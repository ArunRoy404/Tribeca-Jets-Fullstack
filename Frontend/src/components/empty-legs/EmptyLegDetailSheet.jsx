"use client";

import Link from "next/link";
import { CalendarCheck, Clock, Edit, Mail, Phone, Plane, RotateCcw, Trash2, UserCheck } from "lucide-react";
import DetailSheet from "@/components/common/DetailSheet";
import DetailField from "@/components/common/DetailField";
import StatusBadge from "@/components/common/StatusBadge";
import TableStatus from "@/components/table/common/TableStatus";
import EmptyLegMatchBadge from "@/components/empty-legs/EmptyLegMatchBadge";
import { Button } from "@/components/ui/button";
import {
  useEmptyLeg,
  useEmptyLegsTableParams,
  useRemoveEmptyLeg,
  useRestoreEmptyLeg,
  useUpdateEmptyLeg,
} from "@/hooks/empty-legs";
import { usePermissions } from "@/hooks/common/usePermissions";
import { Permission } from "@/lib/permissions";
import { toEmptyLegDetail } from "@/lib/emptyLeg";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";
import { cn } from "@/lib/utils";

/**
 * One empty leg, and client adjustment #10b: every trip request on the same
 * route — including the ones that were lost or archived, which are exactly
 * the clients worth calling back — with the requested day, how close it is,
 * and the client's phone and email.
 *
 * Opened from the URL (`?leg=<id>`), so the dashboard can link straight to it.
 */
export default function EmptyLegDetailSheet() {
  const params = useEmptyLegsTableParams();
  const id = params.leg || null;
  const { data, isPending, error, refetch } = useEmptyLeg(id);
  const leg = data ? toEmptyLegDetail(data) : null;

  const { canWrite } = usePermissions();
  const mayWrite = canWrite(Permission.OPERATOR_SOURCING);
  const openEditModal = useEmptyLegsStore((s) => s.openEditModal);

  const { mutate: updateLeg, isPending: moving } = useUpdateEmptyLeg();
  const { mutate: removeLeg } = useRemoveEmptyLeg();
  const { mutate: restoreLeg } = useRestoreEmptyLeg();

  const close = () => params.setLeg("");
  const move = (status) => updateLeg({ id, status });

  return (
    <DetailSheet open={Boolean(id)} onOpenChange={(open) => !open && close()} resetKey={id} bodyClassName="gap-6">
      {!leg ? (
        <TableStatus isLoading={isPending} error={error} onRetry={refetch} />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border pb-3 w-full">
            <h2 className="font-montserrat font-bold text-[18px] text-foreground">{leg.reference}</h2>
            {leg.isArchived && <StatusBadge status="Archived" bordered />}
          </div>

          <div className="flex items-start justify-between gap-3 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-11 rounded-full bg-purple text-white flex items-center justify-center shrink-0">
                <Plane className="size-5 rotate-90" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h3 className="font-montserrat font-bold text-[18px] text-foreground">
                  {leg.origin} <span className="font-normal text-muted-foreground">→</span> {leg.destination}
                </h3>
                <p className="font-montserrat text-[12px] text-muted-foreground truncate">
                  {leg.originName} → {leg.destinationName} · {leg.date}
                </p>
              </div>
            </div>
            <StatusBadge status={leg.status} bordered />
          </div>

          <div className="border border-border rounded-lg p-4 bg-white shadow-card grid grid-cols-2 gap-4">
            <DetailField label="AIRCRAFT" value={leg.aircraft} labelClassName="text-[12px]" />
            <DetailField label="OPERATOR" value={leg.operator} valueClassName="text-purple" labelClassName="text-[12px]" />
            <DetailField label="PRICE" value={leg.price} valueClassName="text-success" labelClassName="text-[12px]" />
            <DetailField label="SEATS" value={leg.seats ?? "—"} labelClassName="text-[12px]" />
            <DetailField
              label="OFFER ENDS"
              value={leg.lapsed ? `${leg.expiry} (lapsed)` : leg.expiry}
              valueClassName={leg.lapsed ? "text-destructive" : undefined}
              labelClassName="text-[12px]"
            />
            <DetailField
              label="MATCHES"
              value={<EmptyLegMatchBadge count={leg.matchCount} dateCount={leg.dateMatchCount} />}
              labelClassName="text-[12px]"
            />
          </div>

          {leg.notes && (
            <div className="flex flex-col gap-1.5">
              <h3 className="font-montserrat font-bold text-[14px] text-foreground">Notes</h3>
              <p className="font-montserrat text-[13px] text-muted-foreground whitespace-pre-line">{leg.notes}</p>
            </div>
          )}

          {mayWrite && !leg.isArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <Button
                variant="outline"
                disabled={moving || leg.rawStatus === "MATCHED"}
                className="border-success text-success hover:bg-success/10 gap-2 h-10"
                onClick={() => move("MATCHED")}
              >
                <UserCheck className="size-4" />
                Mark Matched
              </Button>
              <Button
                variant="outline"
                disabled={moving || leg.rawStatus === "BOOKED"}
                className="border-info text-info hover:bg-info/10 gap-2 h-10"
                onClick={() => move("BOOKED")}
              >
                <CalendarCheck className="size-4" />
                Mark Booked
              </Button>
              {leg.rawStatus === "EXPIRED" ? (
                <Button variant="outline" disabled={moving} className="gap-2 h-10" onClick={() => move("AVAILABLE")}>
                  <RotateCcw className="size-4" />
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={moving}
                  className="border-warning text-warning hover:bg-warning/10 gap-2 h-10"
                  onClick={() => move("EXPIRED")}
                >
                  <Clock className="size-4" />
                  Mark Expired
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-montserrat font-bold text-[15px] text-foreground">Clients to contact</h3>
              <p className="font-montserrat text-[12px] text-muted-foreground">
                Trip requests for this route, lost and archived ones included. Within three days of this departure first.
              </p>
            </div>

            {leg.matches.length === 0 ? (
              <p className="font-montserrat text-[13px] text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                Nobody has asked for this route yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {leg.matches.map((match) => (
                  <li
                    key={match.id}
                    className={cn(
                      "flex flex-col gap-2 p-3 rounded-md border bg-white",
                      match.dateMatch ? "border-success/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        {match.clientId ? (
                          <Link
                            href={`/dashboard/clients/${match.clientId}`}
                            className="font-montserrat font-bold text-[13px] text-foreground hover:underline truncate"
                          >
                            {match.clientName}
                          </Link>
                        ) : (
                          <span className="font-montserrat font-bold text-[13px] text-foreground">{match.clientName}</span>
                        )}
                        <span className="font-montserrat text-[11px] text-muted-foreground">
                          {match.reference} · asked {match.askedOn} · {match.broker}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                        {match.dateMatch && <StatusBadge status="On date" className="bg-success/10 text-success" />}
                        {match.archived && <StatusBadge status="Archived" />}
                        <StatusBadge status={match.status} bordered />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-montserrat text-[12px] text-muted-foreground">
                      <span>
                        Wanted: <span className="text-foreground font-medium">{match.requestedDate}</span>
                        {match.dayGap !== null && match.dayGap > 0 && ` (${match.dayGap} ${match.dayGap === 1 ? "day" : "days"} off)`}
                      </span>
                      {match.clientPhone && (
                        <a href={`tel:${match.clientPhone}`} className="inline-flex items-center gap-1 text-purple hover:underline">
                          <Phone className="size-3" />
                          {match.clientPhone}
                        </a>
                      )}
                      {match.clientEmail && (
                        <a href={`mailto:${match.clientEmail}`} className="inline-flex items-center gap-1 text-purple hover:underline">
                          <Mail className="size-3" />
                          {match.clientEmail}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {mayWrite && (
            <div className="border-t border-border flex items-center justify-between pt-4 w-full mt-auto">
              {leg.isArchived ? (
                <Button variant="outline" className="gap-2 px-5" onClick={() => restoreLeg(leg.id)}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="gap-2 px-5" onClick={() => openEditModal(data)}>
                    <Edit className="size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10 gap-2 px-5"
                    onClick={() => removeLeg(leg.id, { onSuccess: close })}
                  >
                    <Trash2 className="size-4" />
                    Archive
                  </Button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </DetailSheet>
  );
}
