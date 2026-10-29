import { use } from "react";
import ClientPortalView from "@/components/client-portal/ClientPortalView";

export const metadata = {
  title: "Client Dossier · Tribeca Jets",
};

export default function ClientPortalPage({ params }) {
  const unwrapped = use(params);
  const token = decodeURIComponent(unwrapped?.token || "");
  return <ClientPortalView token={token} />;
}
