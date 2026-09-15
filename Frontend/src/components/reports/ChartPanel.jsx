import DarkPanel from "@/components/common/DarkPanel";
import FilterTabs from "@/components/table/common/FilterTabs";
import { reportsChartRangeOptions } from "@/dummyData/reports";

export default function ChartPanel({ title, range, onRangeChange, children }) {
  return (
    <DarkPanel
      title={title}
      action={<FilterTabs options={reportsChartRangeOptions} value={range} onValueChange={onRangeChange} />}
      bodyClassName="p-3 sm:p-4"
    >
      {children}
    </DarkPanel>
  );
}
