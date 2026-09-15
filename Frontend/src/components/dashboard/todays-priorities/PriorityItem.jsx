import Image from "next/image";
import StatusBadge from "@/components/common/StatusBadge";
import PriorityActions from "@/components/dashboard/todays-priorities/PriorityActions";

export default function PriorityItem({ item, isLast, onActionClick }) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-3 items-start p-4 w-full ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <div className="flex items-start pt-[7px] self-stretch shrink-0">
        <div className={`rounded-full size-2 shrink-0 ${item?.dot}`} />
      </div>
      <div className="flex flex-1 flex-col gap-2 items-start min-w-0">
        <div className="flex gap-2 items-center">
          <StatusBadge status={item?.status} />
          <p className="font-montserrat font-normal text-[10px] text-foreground whitespace-nowrap">
            {item?.category}
          </p>
        </div>
        <p className="font-montserrat font-medium text-[14px] text-foreground">
          {item?.title}
        </p>
        <div className="flex gap-3 items-center">
          <div className="flex gap-1 items-center">
            <Image src="/dashboard/icons/clock.svg" alt="" width={16} height={16} />
            <p className="font-montserrat font-normal text-[12px] text-foreground whitespace-nowrap">
              {item?.date}
            </p>
          </div>
          <p className="font-montserrat font-normal text-[12px] text-foreground whitespace-nowrap">
            {item?.meta}
          </p>
        </div>
      </div>
      <PriorityActions
        actions={item?.actions}
        markComplete={item?.markComplete}
        onActionClick={onActionClick}
      />
    </div>
  );
}
