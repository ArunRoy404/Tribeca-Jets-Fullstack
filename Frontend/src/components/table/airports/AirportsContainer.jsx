"use client";

import { useState } from "react";
import { Eye, Edit2, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useAirportsStore } from "@/store/useAirportsStore";
import TablePagination from "@/components/table/common/TablePagination";
import AirportsToolbar from "./AirportsToolbar";
import AirportsCardsContainer from "./AirportsCardsContainer";
import AirportsTable from "./AirportsTable";
import AddAirportDialog from "@/components/airports/AddAirportDialog";
import DeleteAirportDialog from "@/components/airports/DeleteAirportDialog";
import AirportDetailsSidebar from "@/components/airports/AirportDetailsSidebar";

export default function AirportsContainer({ revealDelay = 0 }) {
  const search = useAirportsStore((s) => s.search);
  const setSearch = useAirportsStore((s) => s.setSearch);
  const countryFilter = useAirportsStore((s) => s.countryFilter);
  const setCountryFilter = useAirportsStore((s) => s.setCountryFilter);
  const page = useAirportsStore((s) => s.page);
  const nextPage = useAirportsStore((s) => s.nextPage);
  const prevPage = useAirportsStore((s) => s.prevPage);
  const openAddModal = useAirportsStore((s) => s.openAddModal);
  const openEditModal = useAirportsStore((s) => s.openEditModal);
  const openDeleteModal = useAirportsStore((s) => s.openDeleteModal);
  const openDetailsSidebar = useAirportsStore((s) => s.openDetailsSidebar);

  const getPageAirports = useAirportsStore((s) => s.getPageAirports);
  const getPageCount = useAirportsStore((s) => s.getPageCount);
  const getFilteredCount = useAirportsStore((s) => s.getFilteredCount);

  const pageAirports = getPageAirports?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const getRowActions = (apt) => [
    { label: "View Details", icon: <Eye />, onSelect: () => openDetailsSidebar?.(apt) },
    { label: "Edit Airport", icon: <Edit2 />, onSelect: () => openEditModal?.(apt) },
    "separator",
    { label: "Remove Airport", icon: <Trash2 />, variant: "destructive", onSelect: () => openDeleteModal?.(apt) },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <AirportsToolbar
          search={search}
          setSearch={setSearch}
          countryFilter={countryFilter}
          setCountryFilter={setCountryFilter}
          onAddAirport={openAddModal}
        />

        <div className="relative w-full lg:hidden">
          <AirportsCardsContainer
            airports={pageAirports}
            selected={selected}
            onToggleRow={toggleRow}
            getRowActions={getRowActions}
            onSelectAirport={openDetailsSidebar}
          />
        </div>

        <AirportsTable
          pageAirports={pageAirports}
          selected={selected}
          onSelectAll={() =>
            setSelected((prev) =>
              prev.size === pageAirports?.length ? new Set() : new Set(pageAirports?.map((apt) => apt?.id))
            )
          }
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectAirport={openDetailsSidebar}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="airports"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddAirportDialog />
        <DeleteAirportDialog />
        <AirportDetailsSidebar />
      </CommonCard>
    </Reveal>
  );
}
