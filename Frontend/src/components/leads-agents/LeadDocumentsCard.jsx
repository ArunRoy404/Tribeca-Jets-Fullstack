"use client";

import DetailCard from "@/components/common/DetailCard";
import DocumentsPanel from "@/components/documents/DocumentsPanel";

/**
 * The lead's documents: the client's folder in the Document Vault (#22),
 * because a lead is a client — one folder for one person, the same the
 * client page's Documents tab shows.
 */
export default function LeadDocumentsCard({ lead }) {
  return (
    <DetailCard title="Documents">
      {lead?.id ? (
        <DocumentsPanel
          owner={{ type: "CLIENT", id: lead.id, label: lead?.name }}
          readOnly={lead?.isArchived}
          compact
          hideTitle
        />
      ) : null}
    </DetailCard>
  );
}
