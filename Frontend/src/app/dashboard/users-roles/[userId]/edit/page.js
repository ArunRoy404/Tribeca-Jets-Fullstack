import UserFormPage from "@/templates/UserFormPage";

export default async function Page({ params }) {
  const { userId } = await params;
  return <UserFormPage userId={userId} />;
}
