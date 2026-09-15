import ClientsStats from "@/components/clients/ClientsStats";
import ClientsContainer from "@/components/table/clients/ClientsContainer";

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <ClientsStats />
      <ClientsContainer />
    </div>
  );
}
