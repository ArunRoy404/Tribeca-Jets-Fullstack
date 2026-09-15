"use client";

import CreateClientTripCard from "@/components/trips/createForm/CreateClientTripCard";
import CreateRouteScheduleCard from "@/components/trips/createForm/CreateRouteScheduleCard";
import CreateAircraftOperatorCard from "@/components/trips/createForm/CreateAircraftOperatorCard";
import CreatePassengersCard from "@/components/trips/createForm/CreatePassengersCard";
import CreateFinancialsCard from "@/components/trips/createForm/CreateFinancialsCard";
import CreateNotesDocsCard from "@/components/trips/createForm/CreateNotesDocsCard";
import CreateFormActionBar from "@/components/trips/createForm/CreateFormActionBar";

export default function CreateTripForm() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 w-full">
      <CreateClientTripCard />
      <CreateRouteScheduleCard />
      <CreateAircraftOperatorCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <CreatePassengersCard />
        <CreateFinancialsCard />
      </div>

      <CreateNotesDocsCard />
      <CreateFormActionBar />
    </div>
  );
}
