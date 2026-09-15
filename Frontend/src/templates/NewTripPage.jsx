"use client";

import DetailHeader from "@/components/common/DetailHeader";
import CommonCard from "@/components/common/CommonCard";
import CreateTripHeaderTitle from "@/components/trips/header/CreateTripHeaderTitle";
import CreateTripForm from "@/components/trips/CreateTripForm";

export default function NewTripPage() {
  const breadcrumbs = [
    { label: "Operations" },
    { label: "All Operations", href: "/dashboard/trips" },
    { label: "Create Operation" },
  ];

  return (
    <div className="flex flex-col w-full bg-page-bg min-h-screen">
      {/* Top Header connected with navbar */}
      <DetailHeader
        breadcrumbs={breadcrumbs}
        titleContent={<CreateTripHeaderTitle />}
      />

      {/* Main Form Wrapper using CommonCard */}
      <CommonCard className="m-4 md:m-6">
        <CreateTripForm />
      </CommonCard>
    </div>
  );
}
