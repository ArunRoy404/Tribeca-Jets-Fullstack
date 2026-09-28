"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import SearchInput from "@/components/table/common/SearchInput";
import FilterDropdown from "@/components/table/common/FilterDropdown";
import PageSizeSelect from "@/components/table/common/PageSizeSelect";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import ReferralsTable from "@/components/table/referrals/ReferralsTable";
import ReferralCard from "@/components/table/referrals/ReferralCard";
import { Button } from "@/components/ui/button";
import { useReferrals, useReferralsTableParams } from "@/hooks/referrals";
import { useDebouncedParam } from "@/hooks/common/useTableQueryParams";
import { useEnumFilter } from "@/hooks/common/useEnumFilter";
import { REFERRAL_STATUSES, formatReferralStatus, toReferralRow } from "@/lib/referral";

const ALL_STATUS = "All Status";

/**
 * The agent's "My Referrals" (#11): every referral they submitted, and only
 * those — the API scopes the list to the signed-in agent. Search, status and
 * page all live in the URL, as on every other list. Opening a row shows its
 * progress and the Agent Updates the desk has shared.
 */
export default function PortalReferralsContainer() {
  const params = useReferralsTableParams();
  const { data, isPending, error, refetch } = useReferrals(params.queryParams);

  const rows = useMemo(() => (data?.data ?? []).map(toReferralRow), [data?.data]);
  const meta = data?.meta;
  const isEmpty = !isPending && !error && rows.length === 0;

  const [draft, setDraft] = useDebouncedParam(params.search, params.setSearch);
  const statusFilter = useEnumFilter(REFERRAL_STATUSES, formatReferralStatus, ALL_STATUS);
  const open = (id) => params.setReferral(id);

  return (
    <Reveal className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 w-full bg-sidebar border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              size="sm"
              placeholder="Search RF-1001, client name, email or phone..."
              value={draft ?? ""}
              onChange={(e) => setDraft?.(e.target.value)}
            />
            <FilterDropdown
              label={ALL_STATUS}
              value={statusFilter.labelFor(params.status)}
              options={statusFilter.options}
              onChange={(label) => params.setStatus?.(statusFilter.valueByLabel[label] ?? "")}
            />
            <PageSizeSelect value={params.limit} onChange={params.setLimit} />
          </div>
          <Button render={<Link href="/portal/submit" />} nativeButton={false} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Submit referral
          </Button>
        </div>

        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage={params.hasFilters ? "No referrals match these filters" : "You have not submitted a referral yet"}
            emptyHint={params.hasFilters ? "Try clearing a filter." : "Referrals you submit appear here with their progress."}
            onRetry={refetch}
          />
        ) : (
          <>
            <div className="relative w-full lg:hidden p-3 flex flex-col gap-3">
              {rows.map((row) => (
                <ReferralCard key={row.id} item={row} showAgent={false} onClick={() => open(row.id)} />
              ))}
            </div>

            <ReferralsTable pageItems={rows} onSelectReferral={open} partner />

            <div className="relative w-full">
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="referrals"
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
