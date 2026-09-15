import { Pencil, Send, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TripActionBar({ trip }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2 px-4">
          <Pencil className="size-3.5" />
          Edit Operation
        </Button>
        <Button variant="outline" className="gap-2 px-4">
          <Send className="size-3.5" />
          Send Client Update
        </Button>
        <Button variant="outline" className="gap-2 px-4">
          <MessageSquare className="size-3.5" />
          Send Operator Message
        </Button>
      </div>
      {trip?.status === "Completed" && (
        <p className="flex items-center gap-1 font-montserrat font-semibold text-[12px] text-success">
          <Check className="size-3.5" />
          Operation completed
        </p>
      )}
    </div>
  );
}
