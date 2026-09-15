import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import OperatorSourcingContainer from "@/components/table/operator-sourcing/OperatorSourcingContainer";
import SourcingRequestDetailSheet from "@/components/operator-sourcing/SourcingRequestDetailSheet";
import NewSourcingRequestDialog from "@/components/operator-sourcing/NewSourcingRequestDialog";
import RequestOperatorQuoteDialog from "@/components/operator-sourcing/RequestOperatorQuoteDialog";
import { operatorSourcingStats } from "@/dummyData/operatorSourcing";

export default function OperatorSourcingPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <SimpleStatsRow stats={operatorSourcingStats} />
        <OperatorSourcingContainer />
      </div>

      <SourcingRequestDetailSheet />
      <NewSourcingRequestDialog />
      <RequestOperatorQuoteDialog />
    </>
  );
}
