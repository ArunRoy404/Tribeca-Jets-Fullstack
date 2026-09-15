"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommonCard from "@/components/common/CommonCard";
import Reveal from "@/components/common/Reveal";

export default function NotFoundState({
  itemType = "Item",
  title,
  message,
  backUrl,
  backLabel,
  className = "",
}) {
  const router = useRouter();

  const displayTitle = title || `No ${itemType} Found`;
  const displayMessage =
    message ||
    `The ${itemType.toLowerCase()} you are looking for does not exist or may have been deleted.`;
  const displayBackLabel = backLabel || `Back to ${itemType}s`;

  const handleBack = () => {
    if (backUrl) return;
    router.back();
  };

  return (
    <div className={`flex items-center justify-center min-h-[60vh] p-4 sm:p-6 w-full ${className}`}>
      <Reveal className="w-full max-w-md">
        <CommonCard className="flex flex-col items-center justify-center p-8 text-center border-border shadow-card bg-white rounded-lg">
          <div className="size-16 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center mb-4">
            <SearchX className="size-8 text-purple stroke-[1.5]" />
          </div>

          <h2 className="font-montserrat font-bold text-[18px] sm:text-[20px] text-foreground mb-2">
            {displayTitle}
          </h2>

          <p className="font-montserrat text-[12px] sm:text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-xs">
            {displayMessage}
          </p>

          {backUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 px-5 font-montserrat font-medium"
              render={<Link href={backUrl} />}
            >
              <ArrowLeft className="size-4" />
              <span>{displayBackLabel}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-2 px-5 font-montserrat font-medium"
            >
              <ArrowLeft className="size-4" />
              <span>{displayBackLabel}</span>
            </Button>
          )}
        </CommonCard>
      </Reveal>
    </div>
  );
}
