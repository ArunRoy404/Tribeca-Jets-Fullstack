"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import TablePagination from "@/components/table/common/TablePagination";
import SettingsButton from "@/components/settings/SettingsButton";
import { useRevokeOtherSessions, useRevokeSession, useSessions } from "@/hooks/auth";
import { formatDate } from "@/lib/archive";
import { timeAgo } from "@/lib/date";
import { cn } from "@/lib/utils";

const COLUMNS = ["Device / Browser", "Signed In", "Last Active", "Status", "Action"];

/**
 * The signed-in user's devices, from `GET /auth/sessions`. Shared by My
 * Account and Settings › Security. There is no location column: that would
 * need a paid IP-lookup service (MODULE_FEATURE_STATUS.md, Settings).
 */
export default function SessionsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useSessions({ page });
  const { mutate: revoke, isPending: revoking, variables: revokingId } = useRevokeSession();
  const { mutate: revokeOthers, isPending: revokingOthers } = useRevokeOtherSessions();

  const sessions = data?.data ?? [];
  const meta = data?.meta;
  const hasOthers = sessions.some((session) => !session?.current) || (meta?.total ?? 0) > 1;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 font-montserrat text-[13px] text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading sessions…
      </div>
    );
  }
  if (isError) {
    return <p className="font-montserrat text-[13px] text-destructive">Could not load your sessions.</p>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="hidden sm:flex gap-3 w-full font-montserrat font-medium text-[12px] leading-normal text-muted-foreground">
        {COLUMNS.map((column) => (
          <p key={column} className="flex-1 min-w-0">
            {column}
          </p>
        ))}
      </div>

      {sessions.map((session) => (
        <div
          key={session?.id}
          className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1 w-full font-montserrat text-[13px] leading-normal text-foreground border-b border-border/60 pb-3 sm:border-0 sm:pb-0"
        >
          <p className="w-full sm:w-auto sm:flex-1 min-w-0 font-medium sm:font-normal">
            {session?.device ?? "Unknown device"}
          </p>
          <p className="sm:flex-1 min-w-0 text-muted-foreground sm:text-foreground">
            <span className="sm:hidden">Signed in </span>
            {formatDate(session?.signedInAt)}
          </p>
          <p className="sm:flex-1 min-w-0 text-muted-foreground sm:text-foreground">
            <span className="sm:hidden">· Active </span>
            {session?.current ? "Now" : timeAgo(session?.lastActiveAt)}
          </p>
          <p className={cn("flex-1 min-w-0 text-success", session?.current && "font-medium")}>
            {session?.current ? "Current session" : "Active"}
          </p>
          <div className="sm:flex-1 min-w-0">
            {/* This device signs out through the profile menu, not here. */}
            {!session?.current && (
              <SettingsButton
                onClick={() => revoke(session?.id)}
                disabled={revoking && revokingId === session?.id}
              >
                Revoke
              </SettingsButton>
            )}
          </div>
        </div>
      ))}

      {(meta?.totalPages ?? 1) > 1 && (
        <TablePagination
          totalCount={meta?.total}
          itemLabel="sessions"
          page={meta?.page}
          pageCount={meta?.totalPages}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, meta?.totalPages ?? p))}
          onPageChange={setPage}
        />
      )}

      {hasOthers && (
        <SettingsButton className="self-start" onClick={() => revokeOthers()} disabled={revokingOthers}>
          Sign Out All Other Devices
        </SettingsButton>
      )}
    </div>
  );
}
