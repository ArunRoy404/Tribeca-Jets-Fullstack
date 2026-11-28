"use client";

import LuggageFields from "@/components/common/LuggageFields";
import DetailCard from "@/components/trips/DetailCard";
import { useCreateTripStore } from "@/store/useCreateTripStore";
import CreateClientTripCard from "@/components/trips/createForm/CreateClientTripCard";
import CreateRouteScheduleCard from "@/components/trips/createForm/CreateRouteScheduleCard";
import CreateAircraftOperatorCard from "@/components/trips/createForm/CreateAircraftOperatorCard";
import CreatePassengersCard from "@/components/trips/createForm/CreatePassengersCard";
import CreateFinancialsCard from "@/components/trips/createForm/CreateFinancialsCard";
import CreateNotesDocsCard from "@/components/trips/createForm/CreateNotesDocsCard";
import CreateFormActionBar from "@/components/trips/createForm/CreateFormActionBar";

/** The trip form — create and edit alike; the store knows which. */
export default function CreateTripForm() {
  const { luggageCount, luggageWeightLb, setField } = useCreateTripStore();
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
      <CreateClientTripCard />
      <CreateRouteScheduleCard />
      <CreateAircraftOperatorCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <CreatePassengersCard />
          <DetailCard title="Luggage"><LuggageFields luggageCount={luggageCount} luggageWeightLb={luggageWeightLb} onChange={setField} /></DetailCard>
        </div>
        <section id="financials" className="min-w-0 scroll-mt-24" tabIndex={-1} aria-label="Financials">
          <CreateFinancialsCard />
        </section>
      </div>

      <CreateNotesDocsCard />
      <CreateFormActionBar />
    </div>
  );
}
