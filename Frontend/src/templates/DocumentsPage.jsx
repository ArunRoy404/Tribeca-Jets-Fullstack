"use client";

import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import DocumentsContainer from "@/components/table/documents/DocumentsContainer";
import { useDocumentStats, useDocumentsTableParams } from "@/hooks/documents";
import { toISODate } from "@/lib/date";

const DASH = "—";

/**
 * Document Vault (#22). The tiles are the API's, over the caller's scope:
 * a broker counts the folders of their own clients and trips.
 */
export default function DocumentsPage() {
  const params = useDocumentsTableParams();
  const { data: stats } = useDocumentStats({ on: toISODate(new Date()) });

  const tiles = [
    { label: "DOCUMENTS", value: stats?.total ?? DASH, tone: "foreground" },
    { label: "CLIENT FOLDERS", value: stats?.byOwner?.client ?? DASH, tone: "purple" },
    { label: "TRIP FOLDERS", value: stats?.byOwner?.trip ?? DASH, tone: "foreground" },
    { label: "OPERATOR FOLDERS", value: stats?.byOwner?.operator ?? DASH, tone: "foreground" },
    { label: "EXPIRING (90 DAYS)", value: stats?.expiring ?? DASH, tone: "warning" },
    { label: "EXPIRED", value: stats?.expired ?? DASH, tone: "destructive" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={tiles} gridClassName="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6" />
      <DocumentsContainer params={params} />
    </div>
  );
}
