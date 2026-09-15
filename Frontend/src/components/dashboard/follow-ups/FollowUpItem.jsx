import StatusBadge from "@/components/common/StatusBadge";

export default function FollowUpItem({ item, isLast }) {
  return (
    <div
      className={`flex gap-3 items-center px-5 py-3 w-full ${!isLast ? "border-b border-border" : ""}`}
    >
      <div className={`rounded-full size-2 shrink-0 ${item?.dot}`} />
      <div className="flex flex-1 flex-col gap-2 items-start min-w-0">
        <div className="flex gap-2 items-center">
          <p className="font-montserrat font-medium text-[12px] text-foreground whitespace-nowrap">{item?.name}</p>
          <StatusBadge status={item?.status} />
        </div>
        <p className="font-montserrat font-normal text-[12px] text-muted-foreground whitespace-nowrap">{item?.note}</p>
      </div>
      <div className="flex flex-col gap-2 items-start text-center shrink-0">
        <p className="font-montserrat font-normal text-[12px] text-foreground w-full">{item?.date}</p>
        <p className="font-montserrat font-normal text-[10px] text-muted-foreground w-full">{item?.owner}</p>
      </div>
    </div>
  );
}
