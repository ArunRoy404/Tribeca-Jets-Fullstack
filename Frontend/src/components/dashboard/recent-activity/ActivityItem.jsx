import UserAvatar from "@/components/common/UserAvatar";

export default function ActivityItem({ item, isLast }) {
  return (
    <div
      className={`flex gap-3 items-start p-4 w-full ${!isLast ? "border-b border-border" : ""}`}
    >
      <UserAvatar name={item?.name} size="sm" className="mt-0.5" />
      <div className="flex flex-1 flex-col items-start min-w-0">
        <p className="font-montserrat font-medium text-[12px] text-foreground w-full">
          {item?.name} {item?.action} {item?.subject}
        </p>
        <p className="font-dm-sans font-normal text-[11px] text-muted-foreground w-full">{item?.time}</p>
      </div>
    </div>
  );
}
