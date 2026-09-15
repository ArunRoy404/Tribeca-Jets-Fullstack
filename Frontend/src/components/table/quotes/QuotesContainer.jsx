"use client";

import { useRouter } from "next/navigation";
import { Eye, Edit, Copy, Check, XCircle, FileDown, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useQuotesStore } from "@/store/useQuotesStore";
import TablePagination from "@/components/table/common/TablePagination";
import QuotesToolbar from "./QuotesToolbar";
import QuotesCardsContainer from "./QuotesCardsContainer";
import QuotesTable from "./QuotesTable";
import AddQuoteDialog from "@/components/quotes/AddQuoteDialog";
import DeleteQuoteDialog from "@/components/quotes/DeleteQuoteDialog";

export default function QuotesContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const search = useQuotesStore((s) => s.search);
  const setSearch = useQuotesStore((s) => s.setSearch);
  const statusFilter = useQuotesStore((s) => s.statusFilter);
  const setStatusFilter = useQuotesStore((s) => s.setStatusFilter);
  const page = useQuotesStore((s) => s.page);
  const nextPage = useQuotesStore((s) => s.nextPage);
  const prevPage = useQuotesStore((s) => s.prevPage);
  const openAddQuoteModal = useQuotesStore((s) => s.openAddQuoteModal);
  const openDeleteQuoteModal = useQuotesStore((s) => s.openDeleteQuoteModal);
  const duplicateQuote = useQuotesStore((s) => s.duplicateQuote);
  const updateQuoteStatus = useQuotesStore((s) => s.updateQuoteStatus);

  const getPageQuotes = useQuotesStore((s) => s.getPageQuotes);
  const getPageCount = useQuotesStore((s) => s.getPageCount);
  const getFilteredCount = useQuotesStore((s) => s.getFilteredCount);

  const pageItems = getPageQuotes?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (quote) => [
    {
      label: "View Details",
      icon: <Eye className="size-4" />,
      onSelect: () => router?.push(`/dashboard/quotes/${quote?.id}`),
    },
    {
      label: "Edit",
      icon: <Edit className="size-4" />,
      onSelect: () => openAddQuoteModal?.(quote),
    },
    {
      label: "Duplicate",
      icon: <Copy className="size-4" />,
      onSelect: () => duplicateQuote?.(quote?.id),
    },
    {
      label: "Mark Approved",
      icon: <Check className="size-4 text-success" />,
      onSelect: () => updateQuoteStatus?.(quote?.id, "Approved"),
    },
    {
      label: "Mark Rejected",
      icon: <XCircle className="size-4 text-destructive" />,
      onSelect: () => updateQuoteStatus?.(quote?.id, "Rejected"),
    },
    {
      label: "Download PDF",
      icon: <FileDown className="size-4" />,
      onSelect: () => {
        alert(`Downloading PDF for quote ${quote?.id}...`);
      },
    },
    "separator",
    {
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      variant: "destructive",
      onSelect: () => openDeleteQuoteModal?.(quote),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <QuotesToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onNewQuote={() => openAddQuoteModal?.(null)}
        />

        <div className="relative w-full lg:hidden p-3">
          <QuotesCardsContainer
            items={pageItems}
            getActions={getRowActions}
            onItemClick={(item) => router?.push(`/dashboard/quotes/${item?.id}`)}
          />
        </div>

        <QuotesTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectQuote={(item) => router?.push(`/dashboard/quotes/${item?.id}`)}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="requests"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddQuoteDialog />
        <DeleteQuoteDialog />
      </CommonCard>
    </Reveal>
  );
}
