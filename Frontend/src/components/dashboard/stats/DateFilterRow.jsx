import FilterTabs from "@/components/table/common/FilterTabs";

const dateFilters = ["Today", "This Week", "This Month", "Quarter", "Year to Date"];

export default function DateFilterRow({ active = "This Week", onChange }) {
  return (
    <div className="flex items-center justify-between px-4 w-full">
      <FilterTabs options={dateFilters} value={active} onValueChange={onChange} />
    </div>
  );
}
