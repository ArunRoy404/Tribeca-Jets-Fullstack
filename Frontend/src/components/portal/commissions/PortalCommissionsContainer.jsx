"use client";

import { useMemo } from "react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import StatusBadge from "@/components/common/StatusBadge";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommissions, useCommissionsTableParams } from "@/hooks/commissions";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { COMMISSION_STATUSES, formatCommissionStatus, toPartnerCommission } from "@/lib/commission";

const ALL_STATUS = "All Status";
const COLUMNS = ["Client", "Trip", "Trip Date", "Structure", "Estimated", "Final", "Status", "Paid On"];
const CELL = "p-[12px] font-montserrat text-[12px] whitespace-nowrap";

/**
 * #11's Commission Center list: client/trip, trip date, commission structure,
 * estimated and final commission, status and payment date — for the signed-in
 * agent's own commissions only (the API scopes and projects it). Nothing here
 * shows, or can work back to, the trip's price, cost or profit.
 */
export default function PortalCommissionsContainer() {
  const params = useCommissionsTableParams();
  const { data, isPending, error, refetch } = useCommissions(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toPartnerCommission), [data?.data]);
  const meta = data?.meta;
  const isEmpty = !isPending && !error && rows.length === 0;
  const statusFilter = useEnumFilter(COMMISSION_STATUSES, formatCommissionStatus, ALL_STATUS);

  return (
    <Reveal className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <div className="flex flex-wrap items-center gap-2 p-4 w-full bg-sidebar border-b border-border">
          <FilterDropdown
            label={ALL_STATUS}
            value={statusFilter.labelFor(params.status)}
            options={statusFilter.options}
            onChange={(label) => params.setStatus?.(statusFilter.valueByLabel[label] ?? "")}
          />
          <PageSizeSelect value={params.limit} onChange={params.setLimit} />
        </div>

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={params.status ? "No commissions with this status" : "No commissions yet"}
            emptyHint={
              params.status
                ? "Try clearing the filter."
                : "When a referral of yours books a trip, its commission appears here."
            }
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3 flex flex-col gap-3">
              {rows.map((row) => (
                <CommissionCard key={row.id} item={row} />
              ))}
            </div>

            <div className="relative w-full overflow-x-auto hidden lg:block">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow className="bg-black/5 border-border hover:bg-black/5">
                    {COLUMNS.map((col) => (
                      <TableHead key={col} className="p-[12px] font-montserrat font-semibold text-[12px] text-foreground whitespace-nowrap h-auto">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="border-border">
                      <TableCell className={`${CELL} font-bold text-foreground`}>{row.client}</TableCell>
                      <TableCell className={`${CELL} font-semibold text-purple`}>{row.trip}</TableCell>
                      <TableCell className={`${CELL} text-muted-foreground`}>{row.tripDate}</TableCell>
                      <TableCell className={`${CELL} text-foreground`}>{row.structure}</TableCell>
                      <TableCell className={`${CELL} text-foreground`}>{row.estimated}</TableCell>
                      <TableCell className={`${CELL} font-semibold text-foreground`}>{row.final}</TableCell>
                      <TableCell className="p-[12px]">
                        <StatusBadge status={row.status} bordered />
                      </TableCell>
                      <TableCell className={`${CELL} text-muted-foreground`}>{row.paidAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="commissions"
                page={meta?.page ?? 1}
                pageCount={meta?.totalPages ?? 1}
                onPageChange={(next) => params.goToPage(next, meta?.totalPages ?? 1)}
                onPrev={() => params.goToPage((meta?.page ?? 1) - 1, meta?.totalPages ?? 1)}
                onNext={() => params.goToPage((meta?.page ?? 1) + 1, meta?.totalPages ?? 1)}
              />
            </div>
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}

/** One commission as a card, below `lg`. */
function CommissionCard({ item }) {
  const fields = [
    ["Trip date", item.tripDate],
    ["Structure", item.structure],
    ["Estimated", item.estimated],
    ["Final", item.final],
    ["Paid on", item.paidAt],
  ];
  return (
    <div className="bg-white border border-border rounded-md p-4 flex flex-col gap-3 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-montserrat font-bold text-[14px] text-foreground truncate">{item.client}</span>
          <span className="font-montserrat font-semibold text-[11px] text-purple">{item.trip}</span>
        </div>
        <StatusBadge status={item.status} bordered />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border font-montserrat text-[12px]">
        {fields.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="font-semibold text-foreground truncate">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
