"use client";

import { Eye, Edit, Trash2 } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useCommissionsStore } from "@/store/useCommissionsStore";
import TablePagination from "@/components/table/common/TablePagination";
import CommissionsToolbar from "./CommissionsToolbar";
import CommissionsCardsContainer from "./CommissionsCardsContainer";
import CommissionsTable from "./CommissionsTable";
import AddCommissionDialog from "@/components/commissions/AddCommissionDialog";
import DeleteCommissionDialog from "@/components/commissions/DeleteCommissionDialog";

export default function CommissionsContainer({ revealDelay = 0 }) {
  const search = useCommissionsStore((s) => s.search);
  const setSearch = useCommissionsStore((s) => s.setSearch);
  const statusFilter = useCommissionsStore((s) => s.statusFilter);
  const setStatusFilter = useCommissionsStore((s) => s.setStatusFilter);
  const page = useCommissionsStore((s) => s.page);
  const nextPage = useCommissionsStore((s) => s.nextPage);
  const prevPage = useCommissionsStore((s) => s.prevPage);
  const selectCommission = useCommissionsStore((s) => s.selectCommission);
  const openAddModal = useCommissionsStore((s) => s.openAddModal);
  const openEditModal = useCommissionsStore((s) => s.openEditModal);
  const openDeleteModal = useCommissionsStore((s) => s.openDeleteModal);

  const getPageCommissions = useCommissionsStore((s) => s.getPageCommissions);
  const getPageCount = useCommissionsStore((s) => s.getPageCount);
  const getFilteredCount = useCommissionsStore((s) => s.getFilteredCount);

  const pageItems = getPageCommissions?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => selectCommission?.(item?.id),
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
        <CommissionsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onAddCommission={openAddModal}
        />

        <div className="relative w-full lg:hidden p-3">
          <CommissionsCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectCommission={selectCommission}
          />
        </div>

        <CommissionsTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectCommission={selectCommission}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="commissions"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddCommissionDialog />
        <DeleteCommissionDialog />
      </CommonCard>
    </Reveal>
  );
}
