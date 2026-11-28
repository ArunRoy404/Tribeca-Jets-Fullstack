import NewTripPage from "@/templates/NewTripPage";

export default async function Page({ searchParams }) {
  const { fromRequest } = await searchParams;
  return <NewTripPage fromRequest={typeof fromRequest === "string" ? fromRequest : null} />;
}
