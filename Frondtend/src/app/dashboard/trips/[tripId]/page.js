import TripDetailPage from "@/templates/TripDetailPage";

export default async function Page({ params }) {
  const { tripId } = await params;
  return <TripDetailPage tripId={tripId} />;
}
