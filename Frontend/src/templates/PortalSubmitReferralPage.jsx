import SubmitReferralForm from "@/components/portal/SubmitReferralForm";

/** The partner portal's Submit Referral screen (#11). */
export default function PortalSubmitReferralPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8 w-full max-w-4xl">
      <SubmitReferralForm />
    </div>
  );
}
