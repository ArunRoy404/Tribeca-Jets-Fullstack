"use client";

import { Fragment } from "react";
import { Check, X, ShieldCheck, Users, Lock, Crown, Handshake, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/common/StatusBadge";
import TableStatus from "@/components/table/common/TableStatus";
import { useRoles } from "@/hooks/users";
import { bySection, formatReach } from "@/lib/access";
import { formatUserRole } from "@/lib/user";

const ROLE_ICONS = {
  SUPER_ADMIN: Crown,
  ADMIN: ShieldCheck,
  BROKER: Users,
  ASSISTANT: Lock,
  REFERRAL_AGENT: Handshake,
};

/**
 * One action for one role: a default it starts with, an extra an
 * administrator may add for one person, or locked — never for this role.
 */
function ActionCell({ action }) {
  if (!action || action.locked) {
    return <Lock className="size-3.5 text-muted-foreground/40 mx-auto" aria-label="Never for this role" />;
  }
  if (action.default) {
    return <Check className="size-4 text-success mx-auto stroke-[2.5]" aria-label="Included by default" />;
  }
  return (
    <span className="font-montserrat font-medium text-[10px] text-purple bg-purple/10 px-2 py-0.5 rounded-sm inline-block whitespace-nowrap">
      Optional
    </span>
  );
}

/** A module for one role: how far it reaches, or a cross when the role never has it. */
function ModuleCell({ module }) {
  if (!module?.available) {
    return <X className="size-4 text-muted-foreground/40 mx-auto stroke-[1.5]" aria-label="Not available" />;
  }
  return (
    <Badge tone="outline" size="sm" className="text-[10px]">
      {formatReach(module.reach)}
    </Badge>
  );
}

/** The table's legend, once, rather than a tooltip in every cell. */
function Legend() {
  const items = [
    { node: <Check className="size-4 text-success stroke-[2.5]" />, text: "Included by default" },
    { node: <ActionCell action={{ default: false, locked: false }} />, text: "Can be added for one person" },
    { node: <Lock className="size-3.5 text-muted-foreground/40" />, text: "Never for this role" },
    { node: <Badge tone="outline" size="sm" className="text-[10px]">Own only</Badge>, text: "How far the role reaches — fixed" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 border-b border-border">
      {items.map((item) => (
        <div key={item.text} className="flex items-center gap-2">
          {item.node}
          <span className="font-montserrat text-[11px] text-muted-foreground">{item.text}</span>
        </div>
      ))}
    </div>
  );
}


/**
 * Each role's starting permissions, module by module (owner's design,
 * 7 Oct 2026).
 *
 * Nothing here is hardcoded: the roles, their headcounts and every cell come
 * from `GET /roles`, generated from the server's `access.roles.ts`. These are
 * the defaults a new account starts with — any one person's set is adjusted
 * from Edit user, within the locks shown here.
 */
export default function RolesPermissionsTab() {
  const { data, isPending, error, refetch } = useRoles();
  const roles = data?.roles ?? [];

  if (isPending || error || !roles.length) {
    return (
      <div className="w-full bg-sidebar/30">
        <TableStatus
          isLoading={isPending}
          error={error}
          isEmpty={!isPending && !error}
          emptyMessage="No roles to show"
          emptyHint="The role permissions could not be read."
          onRetry={refetch}
        />
      </div>
    );
  }

  // Every role carries the same catalogue in the same order; the first one
  // supplies the rows, and each column is looked up by module and action.
  const sections = bySection(roles[0]?.modules);
  const lookup = Object.fromEntries(
    roles.map((role) => [role.role, Object.fromEntries((role.modules ?? []).map((m) => [m.module, m]))]),
  );

  return (
    <div className="flex flex-col gap-6 w-full p-4 sm:p-6 bg-sidebar/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
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
              <p className="font-montserrat text-[11px] text-muted-foreground leading-relaxed flex-1">
                {card?.description}
              </p>
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-border/60">
                <span className="font-montserrat text-[10px] text-muted-foreground">Permission Level:</span>
                <StatusBadge status={card?.permissionLevel} bordered />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col rounded-md border border-border bg-white overflow-hidden shadow-card w-full">
        <div className="flex items-center gap-2 px-4 py-3 bg-secondary border-b border-border">
          <ShieldCheck className="size-4.5 text-purple" />
          <h3 className="font-montserrat font-bold text-[14px] text-foreground">Role Permission Matrix</h3>
        </div>

        <div className="flex items-start gap-2.5 px-4 py-3 bg-purple/5 border-b border-border">
          <Info className="size-4 text-purple shrink-0 mt-0.5" />
          <p className="font-montserrat text-[12px] text-foreground leading-relaxed">
            <span className="font-semibold">These are each role&apos;s starting permissions.</span> Any one
            person&apos;s can be changed from <span className="font-semibold">Edit user</span>, within the locks
            shown here. The sidebar and every page follow each person&apos;s own set now; the server enforces it
            module by module as each one is reviewed (Users &amp; Roles first).
          </p>
        </div>

        <Legend />

        <div className="overflow-x-auto w-full">
          <Table className="min-w-215">
            <TableHeader>
              <TableRow className="bg-black/5 border-border hover:bg-black/5">
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground uppercase tracking-wider p-3 px-4">
                  Module / Action
                </TableHead>
                {roles.map((role) => (
                  <TableHead
                    key={role?.role}
                    className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-3 whitespace-nowrap"
                  >
                    {formatUserRole(role?.role)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <Fragment key={section.label}>
                  <TableRow className="bg-sidebar hover:bg-sidebar border-border">
                    <TableCell
                      colSpan={roles.length + 1}
                      className="font-montserrat font-bold text-[12px] text-sidebar-foreground uppercase tracking-wider py-3 px-4 border-l-4 border-l-purple"
                    >
                      {section.label}
                    </TableCell>
                  </TableRow>
                  {section.modules.map((module) => (
                    <Fragment key={module.module}>
                      <TableRow className="bg-secondary/60 hover:bg-secondary/60 border-border">
                        <TableCell className="font-montserrat font-bold text-[13px] text-foreground p-3 px-4">
                          {module.label}
                        </TableCell>
                        {roles.map((role) => (
                          <TableCell key={role.role} className="text-center p-3">
                            <ModuleCell module={lookup[role.role]?.[module.module]} />
                          </TableCell>
                        ))}
                      </TableRow>
                      {module.actions.map((action) => (
                        <TableRow key={action.action} className="border-border hover:bg-purple/5 transition-colors">
                          <TableCell className="font-montserrat font-medium text-[12px] text-muted-foreground p-2.5 pl-9">
                            {action.label}
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.role} className="text-center p-2.5">
                              <ActionCell
                                action={lookup[role.role]?.[module.module]?.actions?.find((a) => a.action === action.action)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
