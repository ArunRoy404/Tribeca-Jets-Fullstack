import Link from "next/link";

/** Shared by the row, mobile card and request detail. */
export default function ConvertedTripLink({ trip }) {
  if (!trip?.id) return null;
  return <Link href={`/dashboard/trips/${trip.id}`} onClick={(event) => event.stopPropagation()} className="block text-purple text-xs hover:underline">Converted to TJ-{trip.reference}</Link>;
}
