"use client";

import { Eye, Edit, Trash2, Send, Copy } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useEmptyLegsStore } from "@/store/useEmptyLegsStore";
import TablePagination from "@/components/table/common/TablePagination";
import EmptyLegsToolbar from "./EmptyLegsToolbar";
import EmptyLegsCardsContainer from "./EmptyLegsCardsContainer";
import EmptyLegsTable from "./EmptyLegsTable";
import AddEmptyLegDialog from "@/components/empty-legs/AddEmptyLegDialog";
import DeleteEmptyLegDialog from "@/components/empty-legs/DeleteEmptyLegDialog";

export default function EmptyLegsContainer({ revealDelay = 0 }) {
  const search = useEmptyLegsStore((s) => s.search);
  const setSearch = useEmptyLegsStore((s) => s.setSearch);
  const statusFilter = useEmptyLegsStore((s) => s.statusFilter);
  const setStatusFilter = useEmptyLegsStore((s) => s.setStatusFilter);
  const page = useEmptyLegsStore((s) => s.page);
  const nextPage = useEmptyLegsStore((s) => s.nextPage);
  const prevPage = useEmptyLegsStore((s) => s.prevPage);
  const selectLeg = useEmptyLegsStore((s) => s.selectLeg);
  const openAddModal = useEmptyLegsStore((s) => s.openAddModal);
  const openEditModal = useEmptyLegsStore((s) => s.openEditModal);
  const openDeleteModal = useEmptyLegsStore((s) => s.openDeleteModal);

  const getPageEmptyLegs = useEmptyLegsStore((s) => s.getPageEmptyLegs);
  const getPageCount = useEmptyLegsStore((s) => s.getPageCount);
  const getFilteredCount = useEmptyLegsStore((s) => s.getFilteredCount);

  const pageItems = getPageEmptyLegs?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectLeg?.(item?.id),
    },
    {
      label: "Notify Clients",
      icon: <Send />,
      onSelect: () => {
        console.log("Notify clients for empty leg", item?.id);
      },
    },
    {
      label: "Duplicate",
      icon: <Copy />,
      onSelect: () => {
        console.log("Duplicate empty leg", item?.id);
      },
    },
    {
      label: "Edit",
      icon: <Edit />,
      onSelect: () => openEditModal?.(item),
    },
    "separator",
    {
      label: "Delete",
      icon: <Trash2 />,
      variant: "destructive",
      onSelect: () => openDeleteModal?.(item?.id),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <EmptyLegsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddEmptyLeg={openAddModal}
        />

        <div className="relative w-full lg:hidden p-3">
          <EmptyLegsCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectLeg={selectLeg}
          />
        </div>

        <EmptyLegsTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectLeg={selectLeg}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="empty legs"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddEmptyLegDialog />
        <DeleteEmptyLegDialog />
      </CommonCard>
    </Reveal>
  );
}
