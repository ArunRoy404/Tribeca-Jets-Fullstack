import EmptyLegsStats from "@/components/empty-legs/EmptyLegsStats";
import EmptyLegsContainer from "@/components/table/empty-legs/EmptyLegsContainer";
import EmptyLegDetailSheet from "@/components/empty-legs/EmptyLegDetailSheet";

export default function EmptyLegsPage() {
  return (
    <>
      <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
        <EmptyLegsStats />
        <EmptyLegsContainer />
      </div>
      <EmptyLegDetailSheet />
    </>
  );
}
