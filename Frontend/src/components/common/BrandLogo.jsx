"use client";

import Image from "next/image";
import Logo from "@/components/common/Logo";
import { useBranding } from "@/hooks/settings";
import { passthroughImageLoader, uploadUrl } from "@/services/uploads.service";
import { cn } from "@/lib/utils";

/** The built-in marks, used until the company uploads its own logo. */
const BUILT_IN = {
  light: "/dashboard/img/logo.svg",
  dark: "/dashboard/img/logo_black.svg",
  compact: "/dashboard/img/logo_icon.svg",
};

/**
 * The company's logo, from Settings › Company & Branding — the one place the
 * app's sidebars and sign-in page take it from (owner's decision, 7 Oct 2026).
 *
 * Read from the public branding endpoint, so it renders before sign-in too.
 * Without an uploaded logo the built-in Tribeca Jets marks show: `tone`
 * picks the white mark for dark backgrounds (`"light"`, the sidebar) or the
 * dark one for light backgrounds (`"dark"`); `compact` is the collapsed
 * sidebar's icon; `fallbackSrc` names a different built-in mark for a screen
 * drawn with its own (the sign-in card). While the branding loads, the box keeps its size and shows
 * nothing, so the built-in mark never flashes before the uploaded one.
 */
export default function BrandLogo({
  tone = "light",
  compact = false,
  fallbackSrc,
  width = 160,
  height = 48,
  className,
}) {
  const { data: branding, isPending } = useBranding();
  const name = branding?.companyName || "Company logo";

  if (isPending) {
    return <span aria-hidden className={cn("inline-block", className)} style={{ aspectRatio: `${width} / ${height}` }} />;
  }

  if (branding?.logoUrl) {
    return (
      <Image
        src={uploadUrl(branding.logoUrl)}
        alt={name}
        width={width}
        height={height}
        loader={passthroughImageLoader}
        className={cn("object-contain", className)}
      />
    );
  }

  return (
    <Logo
      src={fallbackSrc ?? (compact ? BUILT_IN.compact : BUILT_IN[tone])}
      alt={name}
      width={width}
      height={height}
      className={className}
    />
  );
}
