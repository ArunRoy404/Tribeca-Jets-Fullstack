import LeadsAgentsStats from "@/components/leads-agents/LeadsAgentsStats";
import LeadsAgentsContainer from "@/components/table/leads-agents/LeadsAgentsContainer";

export default function LeadsAgentsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <LeadsAgentsStats />
      <LeadsAgentsContainer />
    </div>
  );
}
