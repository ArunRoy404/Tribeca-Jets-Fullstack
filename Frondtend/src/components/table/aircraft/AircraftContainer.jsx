"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, Wrench, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useAircraftStore } from "@/store/useAircraftStore";
import TablePagination from "@/components/table/common/TablePagination";
import AircraftToolbar from "./AircraftToolbar";
import AircraftCardsContainer from "./AircraftCardsContainer";
import AircraftTable from "./AircraftTable";
import AddAircraftDialog from "@/components/aircraft/AddAircraftDialog";
import DeleteAircraftDialog from "@/components/aircraft/DeleteAircraftDialog";
import SetMaintenanceDialog from "@/components/aircraft/SetMaintenanceDialog";

export default function AircraftContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const search = useAircraftStore((s) => s.search);
  const setSearch = useAircraftStore((s) => s.setSearch);
  const categoryFilter = useAircraftStore((s) => s.categoryFilter);
  const setCategoryFilter = useAircraftStore((s) => s.setCategoryFilter);
  const statusFilter = useAircraftStore((s) => s.statusFilter);
  const setStatusFilter = useAircraftStore((s) => s.setStatusFilter);
  const page = useAircraftStore((s) => s.page);
  const nextPage = useAircraftStore((s) => s.nextPage);
  const prevPage = useAircraftStore((s) => s.prevPage);
  const openAddModal = useAircraftStore((s) => s.openAddModal);
  const openEditModal = useAircraftStore((s) => s.openEditModal);
  const openDeleteModal = useAircraftStore((s) => s.openDeleteModal);
  const openMaintenanceModal = useAircraftStore((s) => s.openMaintenanceModal);

  const getPageAircraft = useAircraftStore((s) => s.getPageAircraft);
  const getPageCount = useAircraftStore((s) => s.getPageCount);
  const getFilteredCount = useAircraftStore((s) => s.getFilteredCount);

  const pageAircraft = getPageAircraft?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const [selected, setSelected] = useState(() => new Set());
  const toggleRow = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleOpenDetails = (id) => {
    router?.push(`/dashboard/aircraft/${id}`);
  };

  const getRowActions = (ac) => [
    { label: "View Details", icon: <Eye />, onSelect: () => handleOpenDetails(ac?.id) },
    { label: "Edit Specifications", icon: <Edit2 />, onSelect: () => openEditModal?.(ac) },
    { label: "Set Maintenance", icon: <Wrench />, onSelect: () => openMaintenanceModal?.(ac) },
    "separator",
    { label: "Remove Aircraft", icon: <Trash2 />, variant: "destructive", onSelect: () => openDeleteModal?.(ac) },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <AircraftToolbar
          search={search}
          setSearch={setSearch}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddAircraft={openAddModal}
        />

        <div className="relative w-full lg:hidden">
          <AircraftCardsContainer
            aircraft={pageAircraft}
            selected={selected}
            onToggleRow={toggleRow}
            getRowActions={getRowActions}
            onSelectAircraft={handleOpenDetails}
          />
        </div>

        <AircraftTable
          pageAircraft={pageAircraft}
          selected={selected}
          onSelectAll={() =>
            setSelected((prev) =>
              prev.size === pageAircraft?.length ? new Set() : new Set(pageAircraft?.map((ac) => ac?.id))
            )
          }
          onToggleRow={toggleRow}
          getRowActions={getRowActions}
          onSelectAircraft={handleOpenDetails}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="aircraft"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddAircraftDialog />
        <DeleteAircraftDialog />
        <SetMaintenanceDialog />
      </CommonCard>
    </Reveal>
  );
}
