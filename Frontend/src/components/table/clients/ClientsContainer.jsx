"use client";

import { useRouter } from "next/navigation";
import { Eye, PlusCircle, Calendar, Edit, Archive } from "lucide-react";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";
import { useClientsStore } from "@/store/useClientsStore";
import TablePagination from "@/components/table/common/TablePagination";
import ClientsToolbar from "./ClientsToolbar";
import ClientCardsContainer from "./ClientCardsContainer";
import ClientsTable from "./ClientsTable";
import AddClientDialog from "@/components/clients/AddClientDialog";
import ScheduleFollowUpDialog from "@/components/clients/ScheduleFollowUpDialog";
import ArchiveClientDialog from "@/components/clients/ArchiveClientDialog";

export default function ClientsContainer({ revealDelay = 0 }) {
  const router = useRouter();

  const search = useClientsStore((s) => s.search);
  const setSearch = useClientsStore((s) => s.setSearch);
  const statusFilter = useClientsStore((s) => s.statusFilter);
  const setStatusFilter = useClientsStore((s) => s.setStatusFilter);
  const typeFilter = useClientsStore((s) => s.typeFilter);
  const setTypeFilter = useClientsStore((s) => s.setTypeFilter);
  const brokerFilter = useClientsStore((s) => s.brokerFilter);
  const setBrokerFilter = useClientsStore((s) => s.setBrokerFilter);
  const followUpFilter = useClientsStore((s) => s.followUpFilter);
  const setFollowUpFilter = useClientsStore((s) => s.setFollowUpFilter);

  const page = useClientsStore((s) => s.page);
  const nextPage = useClientsStore((s) => s.nextPage);
  const prevPage = useClientsStore((s) => s.prevPage);
  const selectClient = useClientsStore((s) => s.selectClient);

  const openAddModal = useClientsStore((s) => s.openAddModal);
  const openEditModal = useClientsStore((s) => s.openEditModal);
  const openFollowUpModal = useClientsStore((s) => s.openFollowUpModal);
  const openArchiveModal = useClientsStore((s) => s.openArchiveModal);

  const getPageClients = useClientsStore((s) => s.getPageClients);
  const getPageCount = useClientsStore((s) => s.getPageCount);
  const getFilteredCount = useClientsStore((s) => s.getFilteredCount);

  const pageItems = getPageClients?.();
  const pageCount = getPageCount?.();
  const filteredCount = getFilteredCount?.();

  const handleRowClick = (item) => {
    selectClient?.(item?.id);
    router?.push(`/dashboard/clients/${encodeURIComponent(item?.id ?? "")}`);
  };

  const getRowActions = (item) => [
    {
      label: "View Details",
      icon: <Eye />,
      onSelect: () => handleRowClick(item),
    },
    {
      label: "Create Trip",
      icon: <PlusCircle />,
      onSelect: () => router?.push("/dashboard/trips/new"),
    },
    {
      label: "Schedule Follow-up",
      icon: <Calendar />,
      onSelect: () => openFollowUpModal?.(item?.id),
    },
    {
      label: "Edit Client",
      icon: <Edit />,
      onSelect: () => openEditModal?.(item),
    },
    "separator",
    {
      label: "Archive",
      icon: <Archive />,
      variant: "destructive",
      onSelect: () => openArchiveModal?.(item),
    },
  ];

  return (
    <Reveal delay={revealDelay} className="w-full">
      <CommonCard variant="default" className="p-0 rounded-md overflow-hidden border-border w-full">
        <ClientsToolbar
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          brokerFilter={brokerFilter}
          setBrokerFilter={setBrokerFilter}
          followUpFilter={followUpFilter}
          setFollowUpFilter={setFollowUpFilter}
          onAddClient={openAddModal}
          onExport={() => alert("Exporting clients CSV document...")}
        />

        <div className="relative w-full lg:hidden p-3">
          <ClientCardsContainer
            items={pageItems}
            getRowActions={getRowActions}
            onSelectClient={handleRowClick}
          />
        </div>

        <ClientsTable
          pageItems={pageItems}
          getRowActions={getRowActions}
          onSelectClient={handleRowClick}
        />

        <div className="relative w-full">
          <TablePagination
            totalCount={filteredCount}
            itemLabel="clients"
            page={page}
            pageCount={pageCount}
            onPrev={prevPage}
            onNext={nextPage}
          />
        </div>

        <AddClientDialog />
        <ScheduleFollowUpDialog />
        <ArchiveClientDialog />
      </CommonCard>
    </Reveal>
  );
}
