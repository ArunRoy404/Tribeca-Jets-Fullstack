import Reveal from "@/components/common/Reveal";
import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import { reportsStats } from "@/dummyData/reports";
import ReportsToolbar from "@/components/reports/ReportsToolbar";
import RevenueProfitPanel from "@/components/reports/RevenueProfitPanel";
import TripsChartPanel from "@/components/reports/TripsChartPanel";
import BrokerPerformancePanel from "@/components/reports/BrokerPerformancePanel";
import TopClientsPanel from "@/components/reports/TopClientsPanel";
import TopRoutesPanel from "@/components/reports/TopRoutesPanel";
import FinancialSummaryPanel from "@/components/reports/FinancialSummaryPanel";
import ExportOperationsDialog from "@/components/reports/ExportOperationsDialog";

export default function ReportsPage() {
  return (
    <>
      <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 w-full">
        <div className="flex flex-col gap-4 sm:gap-6 w-full bg-white border border-border rounded-lg p-4 sm:p-6">
          <ReportsToolbar />
          <SimpleStatsRow stats={reportsStats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <Reveal>
            <RevenueProfitPanel />
          </Reveal>
          <Reveal delay={0.1}>
            <TripsChartPanel />
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <Reveal>
            <BrokerPerformancePanel />
          </Reveal>
          <Reveal delay={0.1}>
            <TopClientsPanel />
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
          <Reveal>
            <TopRoutesPanel />
          </Reveal>
          <Reveal delay={0.1}>
            <FinancialSummaryPanel />
          </Reveal>
        </div>
      </div>

      <ExportOperationsDialog />
    </>
  );
}
