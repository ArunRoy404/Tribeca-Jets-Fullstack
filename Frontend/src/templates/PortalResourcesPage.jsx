import PortalResourcesList from "@/components/portal/PortalResourcesList";

/** The partner portal's Resources screen (#11). */
export default function PortalResourcesPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <PortalResourcesList />
    </div>
  );
}
