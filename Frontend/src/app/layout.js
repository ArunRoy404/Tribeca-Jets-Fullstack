import { Montserrat, Space_Grotesk, DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

/**
 * The tab title carries the company's name from Settings › Company &
 * Branding, read on the server from the public branding endpoint and kept
 * for five minutes. A page sets only its own part (`title: "Quotes"`); the
 * template adds the company. Without an answer from the API the title is the
 * product's own name rather than a guessed company.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

async function companyName() {
  try {
    const response = await fetch(`${API_PROXY_TARGET}/api/settings/branding`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return (await response.json())?.data?.companyName ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata() {
  const brand = (await companyName()) ?? "Command Center";
  return {
    title: { default: brand, template: `%s | ${brand}` },
    description: "Charter operations dashboard",
  };
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
