import FormPageTitle from "@/components/common/FormPageTitle";

/** The form page's title — creating an operation, or editing one by reference. */
export default function CreateTripHeaderTitle({ backUrl = "/dashboard/trips", editing = false, reference }) {
  return (
    <FormPageTitle
      backUrl={backUrl}
      title={editing ? `Edit TJ-${reference ?? ""}` : "Create New Operation"}
      description={
        editing
          ? "Change the route, aircraft, passengers or price. Status moves on the trip page."
          : "Add trip, client, operator, scheduling, and financial information."
      }
    />
  );
}
