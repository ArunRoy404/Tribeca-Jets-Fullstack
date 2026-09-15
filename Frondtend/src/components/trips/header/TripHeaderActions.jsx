import { Pencil, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TripHeaderActions({ onEdit, onMore }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2 px-4" onClick={onEdit}>
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <Button variant="outline" className="gap-2 px-4" onClick={onMore}>
        <MoreHorizontal className="size-3.5" />
        More
      </Button>
    </div>
  );
}
