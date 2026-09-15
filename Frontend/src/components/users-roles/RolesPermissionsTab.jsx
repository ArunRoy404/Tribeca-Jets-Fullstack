"use client";

import { Check, X, ShieldCheck, Shield, Users, Lock } from "lucide-react";
import { permissionMatrixRows } from "@/dummyData/usersRoles";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusBadge from "@/components/common/StatusBadge";

const roleOverviewCards = [
  {
    role: "Admin",
    level: "Admin",
    usersCount: "1 User",
    description: "Full system administration, user management, and financial exports.",
    icon: ShieldCheck,
  },
  {
    role: "Senior Broker",
    level: "High",
    usersCount: "0 Users",
    description: "Full trip management, operator sourcing, and team financial visibility.",
    icon: Shield,
  },
  {
    role: "Broker",
    level: "Medium",
    usersCount: "4 Users",
    description: "Create and manage own trips, leads, quotes, and operator queries.",
    icon: Users,
  },
  {
    role: "Assistant",
    level: "Low",
    usersCount: "1 User",
    description: "View assigned trips, flight tracking, and support operational workflows.",
    icon: Lock,
  },
];

function renderCellContent(val) {
  if (val === true) {
    return <Check className="size-4 text-emerald-500 mx-auto stroke-[2.5]" />;
  }
  if (val === false) {
    return <X className="size-4 text-muted-foreground/40 mx-auto stroke-[1.5]" />;
  }
  if (typeof val === "string") {
    return (
      <span className="font-montserrat font-medium text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
        {val}
      </span>
    );
  }
  return null;
}

export default function RolesPermissionsTab() {
  return (
    <div className="flex flex-col gap-6 w-full p-4 sm:p-6 bg-sidebar/30">
      {/* Roles Overview Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {roleOverviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.role}
              className="flex flex-col gap-3 p-4 rounded-md border border-border bg-white shadow-card hover:border-purple/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-purple/10 text-purple">
                    <Icon className="size-4" />
                  </div>
                  <h4 className="font-montserrat font-bold text-[14px] text-foreground">{card.role}</h4>
                </div>
                <span className="font-montserrat text-[11px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {card.usersCount}
                </span>
              </div>
              <p className="font-montserrat text-[11px] text-muted-foreground leading-relaxed">
                {card.description}
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-border/60">
                <span className="font-montserrat text-[10px] text-muted-foreground">Permission Level:</span>
                <StatusBadge status={card.level} bordered />
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix Table */}
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
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-[12px]">
                  Admin
                </TableHead>
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-[12px]">
                  Senior Broker
                </TableHead>
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-[12px]">
                  Broker
                </TableHead>
                <TableHead className="font-montserrat font-bold text-[11px] text-foreground text-center uppercase tracking-wider p-[12px]">
                  Assistant
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionMatrixRows.map((row, idx) => (
                <TableRow key={idx} className="border-border hover:bg-purple/5 transition-colors">
                  <TableCell className="font-montserrat font-semibold text-[12px] text-foreground p-[12px] px-4">
                    {row.permission}
                  </TableCell>
                  <TableCell className="text-center p-[12px]">
                    {renderCellContent(row.admin)}
                  </TableCell>
                  <TableCell className="text-center p-[12px]">
                    {renderCellContent(row.seniorBroker)}
                  </TableCell>
                  <TableCell className="text-center p-[12px]">
                    {renderCellContent(row.broker)}
                  </TableCell>
                  <TableCell className="text-center p-[12px]">
                    {renderCellContent(row.assistant)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
