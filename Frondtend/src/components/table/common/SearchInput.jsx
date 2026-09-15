import Image from "next/image";
import { cn } from "@/lib/utils";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  size = "default",
  className,
  ...props
}) {
  const isSm = size === "sm";

  return (
    <div
      className={cn(
        "bg-secondary flex items-center border border-border shrink-0",
        isSm
          ? "gap-1.5 px-2 py-1 rounded-sm w-56 sm:w-64 lg:w-72 max-w-full"
          : "gap-2 px-3 py-2 rounded-lg w-full",
        className
      )}
    >
      <Image src="/dashboard/icons/search.svg" alt="" width={isSm ? 14 : 18} height={isSm ? 14 : 18} className="shrink-0" />
      <input
        type="text"
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        className={cn(
          "flex-1 min-w-0 bg-transparent font-montserrat text-foreground placeholder:text-muted-foreground outline-none",
          isSm ? "text-[10px] font-medium" : "text-[12px] font-normal"
        )}
        {...props}
      />
    </div>
  );
}
