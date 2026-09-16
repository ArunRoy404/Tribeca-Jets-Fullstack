"use client";

import { Check, X, ShieldCheck, Shield, Users, Lock, Crown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/StatusBadge";
import TableStatus from "@/components/table/common/TableStatus";
import { useRoles } from "@/hooks/users";
import { formatUserRole } from "@/lib/user";

const ROLE_ICONS = {
  SUPER_ADMIN: Crown,
  ADMIN: ShieldCheck,
  SENIOR_BROKER: Shield,
  BROKER: Users,
  ASSISTANT: Lock,
};

/**
 * Scopes render as the matrix's own vocabulary.
 *
 * `ALL` is a plain tick and `NONE` a plain cross, because those are the common
 * cases and icons read faster than words. The partial scopes get a labelled
 * chip, since "Own" and "Assigned" are the cells an administrator actually
 * needs to stop and read.
 */
function ScopeCell({ scope }) {
  if (scope === "ALL") {
    return <Check className="size-4 text-emerald-500 mx-auto stroke-[2.5]" />;
  }
  if (scope === "NONE" || !scope) {
    return <X className="size-4 text-muted-foreground/40 mx-auto stroke-[1.5]" />;
  }

  const label = { READ: "View only", OWN: "Own only", ASSIGNED: "Assigned" }[scope] ?? scope;
  return (
    <span className="font-montserrat font-medium text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block whitespace-nowrap">
      {label}
    </span>
  );
}

/**
 * The permission matrix, rendered from the server's own rules.
 *
 * Nothing here is hardcoded. The roles, their descriptions, the live headcounts
 * and every cell come from `GET /users/roles`, so the table an administrator
 * reads is the ruleset the API enforces. A frontend copy would drift the first
 * time a permission changed and would then be confidently wrong — worse than
 * having no table at all.
 */
export default function RolesPermissionsTab() {
  const { data, isPending, error, refetch } = useRoles();

  const roles = data?.roles ?? [];
  const matrix = data?.matrix ?? [];

  if (isPending || error || !roles.length) {
    return (
      <div className="w-full bg-sidebar/30">
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={!isPending && !error}
          emptyMessage="No roles to show"
          emptyHint="The permission matrix could not be read."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full p-4 sm:p-6 bg-sidebar/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {roles.map((card) => {
          const Icon = ROLE_ICONS[card?.role] ?? Users;
          const count = card?.userCount ?? 0;
          return (
            <div
              key={card?.role}
              className="flex flex-col gap-3 p-4 rounded-md border border-border bg-white shadow-card hover:border-purple/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-md bg-purple/10 text-purple shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <h4 className="font-montserrat font-bold text-[14px] text-foreground truncate">
                    {formatUserRole(card?.role)}
                  </h4>
                </div>
                <span className="font-montserrat text-[11px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded whitespace-nowrap">
                  {count} {count === 1 ? "User" : "Users"}
                </span>
              </div>
              <p className="font-montserrat text-[11px] text-muted-foreground leading-relaxed">
                {card?.description}
              </p>
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-border/60">
                <span className="font-montserrat text-[10px] text-muted-foreground">
                  Permission Level:
                </span>
                <StatusBadge status={card?.permissionLevel} bordered />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col rounded-md border border-border bg-white overflow-hidden shadow-card w-full">
        <div className="flex items-center gap-2 px-4 py-3 bg-sidebar border-b border-border">
          <ShieldCheck className="size-4.5 text-purple" />
          <h3 className="font-montserrat font-bold text-[14px] text-foreground">
            Role Permission Matrix
          </h3>
        </div>

        <div className="overflow-x-auto w-full">
          <Table className="min-w-[750px]">
            <TableHeader>
              <TableRow className="bg-black/5 border-border hover:bg-black/5">
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground uppercase tracking-wider p-[12px] px-4">
                  Permission Action
                </TableHead>
                {roles.map((role) => (
                  <TableHead
                    key={role?.role}
                    className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-[12px] whitespace-nowrap"
                  >
                    {formatUserRole(role?.role)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((row) => (
                <TableRow
                  key={row?.permission}
                  className="border-border hover:bg-purple/5 transition-colors"
                >
                  <TableCell className="font-montserrat font-semibold text-[12px] text-foreground p-[12px] px-4">
                    {row?.label}
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role?.role} className="text-center p-[12px]">
                      <ScopeCell scope={row?.scopes?.[role?.role]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
