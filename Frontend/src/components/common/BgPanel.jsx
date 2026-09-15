import Image from "next/image";
import { cn } from "@/lib/utils";

export default function BgPanel({
  src,
  imageOpacity = "opacity-10",
  blur = "backdrop-blur-3xl",
  gradient = "from-white/70 to-[#e5eeff]/70",
  rounded = "rounded-lg",
  sizes = "1200px",
  className,
  contentClassName,
  children,
  ...props
}) {
  return (
    <div className={cn("relative overflow-hidden", rounded, className)} {...props}>
      <Image src={src} alt="" fill className={cn("object-cover pointer-events-none", imageOpacity)} sizes={sizes} />
      <div className={cn("absolute inset-0 bg-gradient-to-r pointer-events-none", gradient, blur)} />
      <div className={cn("relative", contentClassName)}>{children}</div>
    </div>
  );
}
