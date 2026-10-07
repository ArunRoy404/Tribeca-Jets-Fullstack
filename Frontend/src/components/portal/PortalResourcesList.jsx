"use client";

import { Download, FileText } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import SectionHeader from "@/components/common/SectionHeader";
import TablePagination from "@/components/table/common/TablePagination";
import TableStatus from "@/components/table/common/TableStatus";
import { useReferralResources } from "@/hooks/referrals";
import { paginationFields, useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import { formatTimestamp } from "@/lib/archive";
import { uploadUrl } from "@/services/uploads.service";
import { useBranding } from "@/hooks/settings";

/**
 * Mirrors the API's resource sort allowlist. A library reads best by title, so
 * this one list opens alphabetically rather than newest-first.
 */
const SCHEMA = paginationFields(["createdAt", "updatedAt", "title"], { sortBy: "title", sortOrder: "asc" });

/**
 * #11's Resources: the brochure, the aircraft category guide, the programme
 * terms, marketing material and contact details — whatever the Tribeca team
 * has published from the desk's Referrals page. Read-only here. The page lives
 * in the URL like every other list's.
 */
export default function PortalResourcesList() {
  const { queryParams, goToPage } = useTableQueryParams(SCHEMA);
  const { data, isPending, error, refetch } = useReferralResources(queryParams);
  const resources = data?.data ?? [];
  const meta = data?.meta;
  const { data: branding } = useBranding();
  const isEmpty = !isPending && !error && resources.length === 0;
  const page = meta?.page ?? 1;
  const pageCount = meta?.totalPages ?? 1;
  const goTo = (next) => goToPage(next, pageCount);

  return (
    <Reveal className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <SectionHeader title={branding?.companyName ? `Resources from ${branding.companyName}` : "Resources"} />
        {isPending || error || isEmpty ? (
          <TableStatus
            isLoading={isPending}
            error={error}
            isEmpty={isEmpty}
            emptyMessage="Nothing published yet"
            emptyHint="Brochures, guides and programme terms from the Tribeca team will appear here."
            onRetry={refetch}
          />
        ) : (
          <>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 w-full">
              {resources.map((resource) => (
                <li key={resource.id}>
                  <a
                    href={uploadUrl(resource.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex h-full items-start gap-3 rounded-md border border-border bg-white p-4 hover:border-purple/40 hover:bg-purple/5 transition-colors"
                  >
                    <FileText className="size-5 text-purple shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="font-montserrat font-semibold text-[14px] text-foreground break-words">{resource.title}</span>
                      {resource.description && (
                        <span className="font-montserrat text-[12px] text-muted-foreground">{resource.description}</span>
                      )}
                      <span className="font-montserrat text-[11px] text-muted-foreground">
                        Published {formatTimestamp(resource.createdAt)}
                      </span>
                    </div>
                    <Download className="size-4 text-muted-foreground group-hover:text-purple shrink-0 mt-0.5" />
                  </a>
                </li>
              ))}
            </ul>
            {pageCount > 1 && (
              <TablePagination
                totalCount={meta?.total ?? 0}
                itemLabel="resources"
                page={page}
                pageCount={pageCount}
                onPageChange={goTo}
                onPrev={() => goTo(page - 1)}
                onNext={() => goTo(page + 1)}
              />
            )}
          </>
        )}
      </CommonCard>
    </Reveal>
  );
}
