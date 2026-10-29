const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

async function fetchBrandName() {
  try {
    const response = await fetch(`${API_PROXY_TARGET}/api/settings/branding`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json())?.data?.companyName ?? null;
  } catch {
    return null;
  }
}

/**
 * Dynamic Web App Manifest (`/manifest.webmanifest`) for PWA installation (#35).
 * Reads the live company name from Settings › Company & Branding so the
 * installed desktop/mobile app carries the brokerage's configured identity.
 */
export default async function manifest() {
  const companyName = (await fetchBrandName()) ?? "Tribeca Jets";

  return {
    name: `${companyName} — Command Center`,
    short_name: companyName,
    description: "Private aviation charter brokerage command center",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#FAF9F6",
    theme_color: "#18181B",
    categories: ["business", "productivity", "finance"],
    icons: [
      {
        src: "/dashboard/img/logo_icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/dashboard/img/logo_black.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

