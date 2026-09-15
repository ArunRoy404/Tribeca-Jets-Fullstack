import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import OperatorsContainer from "@/components/table/operators/OperatorsContainer";
import { operatorsStats } from "@/dummyData/operators";

export default function OperatorsPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={operatorsStats} />
      <OperatorsContainer />
    </div>
  );
}
