"use client";

import { Eye, Send, CheckCircle, FileDown } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useItinerariesStore } from "@/store/useItinerariesStore";
import TablePagination from "@/components/table/common/TablePagination";
import ItinerariesToolbar from "./ItinerariesToolbar";
import ItinerariesCardsContainer from "./ItinerariesCardsContainer";
import ItinerariesTable from "./ItinerariesTable";
import BuildItineraryDialog from "@/components/itineraries/BuildItineraryDialog";
import SendItineraryDialog from "@/components/itineraries/SendItineraryDialog";
import ItineraryDetailSheet from "@/components/itineraries/ItineraryDetailSheet";

export default function ItinerariesContainer({ revealDelay = 0 }) {
  const search = useItinerariesStore((s) => s.search);
  const setSearch = useItinerariesStore((s) => s.setSearch);
  const page = useItinerariesStore((s) => s.page);
  const nextPage = useItinerariesStore((s) => s.nextPage);
  const prevPage = useItinerariesStore((s) => s.prevPage);
  const selectItinerary = useItinerariesStore((s) => s.selectItinerary);
  const openBuildModal = useItinerariesStore((s) => s.openBuildModal);
  const openSendModal = useItinerariesStore((s) => s.openSendModal);
  const confirmItinerary = useItinerariesStore((s) => s.confirmItinerary);

  const getPageItineraries = useItinerariesStore((s) => s.getPageItineraries);
  const getPageCount = useItinerariesStore((s) => s.getPageCount);
  const getFilteredCount = useItinerariesStore((s) => s.getFilteredCount);

  const pageItems = getPageItineraries?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectItinerary?.(item?.id),
    },
    {
      label: "Send to Passenger",
      icon: <Send />,
      onSelect: () => openSendModal?.(item?.id),
    },
    {
      label: "Confirm Itinerary",
      icon: <CheckCircle />,
      onSelect: () => confirmItinerary?.(item?.id),
    },
    {
      label: "Download PDF",
      icon: <FileDown />,
      onSelect: () => {
        alert(`Downloading PDF for itinerary ${item?.id}...`);
      },
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ItinerariesToolbar
          search={search}
          setSearch={setSearch}
          onBuildItinerary={openBuildModal}
        />

        <div className="relative w-full lg:hidden p-3">
          <ItinerariesCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectItinerary={selectItinerary}
          />
        </div>

        <ItinerariesTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectItinerary={selectItinerary}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="itineraries"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <BuildItineraryDialog />
        <SendItineraryDialog />
        <ItineraryDetailSheet />
      </CommonCard>
    </Reveal>
  );
}
