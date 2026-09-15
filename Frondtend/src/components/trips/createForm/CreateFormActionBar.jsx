"use client";

import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateTripStore } from "@/store/useCreateTripStore";

export default function CreateFormActionBar() {
  const router = useRouter();
  const setField = useCreateTripStore((s) => s?.setField);

  const handleCreate = () => {
    router.push("/dashboard/trips");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-white p-4">
      <Button variant="outline" className="px-4" onClick={() => router.push("/dashboard/trips")}>
        Cancel
      </Button>
      <Button variant="outline" className="gap-2 px-4" onClick={() => setField?.("status", "Draft")}>
        <Pencil className="size-3.5" />
        Save Draft
      </Button>
      <Button className="gap-2 px-4 ml-auto" onClick={handleCreate}>
        Create Trips
      </Button>
    </div>
  );
}
