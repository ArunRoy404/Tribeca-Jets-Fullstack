import Image from "next/image";
import { cn } from "@/lib/utils";

export default function Logo({
  variant = "default",
  src,
  width = 80,
  height = 48,
  className = "h-12 w-20",
  ...props
}) {
  const logoSrc =
    src || (variant === "black" ? "/dashboard/img/logo_black.svg" : "/dashboard/img/logo.svg");

  return (
    <Image
      src={logoSrc}
      alt="Tribeca Jets"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      {...props}
    />
  );
}
