import NoAccessState from "@/components/common/NoAccessState";

/**
 * Where `proxy.js` sends a CRM page the person's permissions leave out
 * (7 Oct 2026). `?module=` names what was refused; an unknown value just
 * reads "this page".
 */
export default async function Page({ searchParams }) {
  const { module: requested } = (await searchParams) ?? {};
  return <NoAccessState module={typeof requested === "string" ? requested : null} />;
}
