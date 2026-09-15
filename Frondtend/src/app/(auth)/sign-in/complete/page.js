import SuccessCard from "@/components/auth/SuccessCard";

export default function SignInCompletePage() {
  return (
    <SuccessCard
      title="You’re all set"
      description="Your Tribeca Jets Command Center account is verified and ready to go."
      ctaLabel="Continue to Dashboard"
      ctaHref="/dashboard"
    />
  );
}
