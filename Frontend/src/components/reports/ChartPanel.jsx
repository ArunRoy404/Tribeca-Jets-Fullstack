import DarkPanel from "@/components/common/DarkPanel";
import FilterTabs from "@/components/table/common/FilterTabs";
import TableStatus from "@/components/table/common/TableStatus";
import { SERIES_BUCKETS, SERIES_BUCKET_LABELS } from "@/lib/reports";

const BUCKET_BY_LABEL = Object.fromEntries(SERIES_BUCKETS.map((bucket) => [SERIES_BUCKET_LABELS[bucket], bucket]));

/** A chart with its Weekly / Monthly / Yearly switch; `bucket` is the API's WEEK | MONTH | YEAR. */
export default function ChartPanel({ title, bucket, onBucketChange, query, children }) {
  return (
    <DarkPanel
      title={title}
      action={
        <FilterTabs
          options={SERIES_BUCKETS.map((value) => SERIES_BUCKET_LABELS[value])}
          value={SERIES_BUCKET_LABELS[bucket]}
          onValueChange={(label) => onBucketChange(BUCKET_BY_LABEL[label])}
        />
      }
      bodyClassName="p-3 sm:p-4"
    >
      {query?.isPending || query?.error ? (
        <TableStatus isLoading={query?.isPending} error={query?.error} onRetry={query?.refetch} />
      ) : (
        children
      )}
    </DarkPanel>
  );
}
