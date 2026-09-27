import NewTripPage from "@/templates/NewTripPage";

export default async function Page({ params }) {
  const { tripId } = await params;
  return <NewTripPage tripId={tripId} />;
}
