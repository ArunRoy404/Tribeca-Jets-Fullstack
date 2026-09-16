import Image from "next/image";
import { cn } from "@/lib/utils";

const CARD_VARIANTS = {
  stat: "/dashboard/bg/stat-card-row1.png",
  default: "/dashboard/bg/plane.png",
};

export default function CommonCard({
  variant = "default",
  className,
  children,
  ...props
}) {
  const bgImage = CARD_VARIANTS[variant] || CARD_VARIANTS.default;
  const isStat = variant === "stat";

  return (
    <div
      className={cn(
        "relative flex-1 flex flex-col min-w-0 rounded-lg border border-border overflow-hidden bg-white",
        isStat ? "p-2.5 sm:p-4 gap-3 sm:gap-6 items-center" : "gap-3 sm:gap-6",
        className
      )}
      {...props}
    >
      <Image
        src={bgImage}
        alt=""
        fill
        className="object-cover opacity-25 pointer-events-none"
        sizes="(max-width: 768px) 100vw, 400px"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/75 to-[#e5eeff]/75 pointer-events-none" />

      <div className="relative w-full z-0 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
