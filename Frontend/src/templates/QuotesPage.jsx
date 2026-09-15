import QuotesStats from "@/components/quotes/QuotesStats";
import QuotesContainer from "@/components/table/quotes/QuotesContainer";

export default function QuotesPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <QuotesStats />
      <QuotesContainer />
    </div>
  );
}
