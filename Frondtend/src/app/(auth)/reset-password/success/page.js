import SuccessCard from "@/components/auth/SuccessCard";

export default function ResetPasswordSuccessPage() {
  return (
    <SuccessCard
      title="You’re all set"
      description="Your Tribeca Jets Command Center password is changed and ready to go."
      ctaLabel="Continue to Sign in"
      ctaHref="/sign-in"
    />
  );
}
