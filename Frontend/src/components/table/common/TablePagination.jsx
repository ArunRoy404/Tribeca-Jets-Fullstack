import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TablePagination({ totalCount, itemLabel = "items", page, pageCount, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-between p-4 w-full">
      <p className="font-montserrat font-medium text-[12px] text-muted-foreground">
        {totalCount} {itemLabel} · Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev} className="gap-1">
          <ChevronLeft className="size-3.5" />
          Prev
        </Button>
        <div className="flex items-center justify-center size-6 rounded-sm bg-primary text-primary-foreground font-montserrat font-medium text-[12px]">
          {page}
        </div>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={onNext} className="gap-1">
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
