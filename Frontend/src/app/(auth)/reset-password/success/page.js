import SuccessCard from "@/components/auth/SuccessCard";

export default function ResetPasswordSuccessPage() {
  return (
    <SuccessCard
      title="You’re all set"
      description="Your Tribeca Jets Command Center password is changed. Every session was signed out, so sign in again with your new password."
      ctaLabel="Continue to Sign in"
      ctaHref="/sign-in"
    />
  );
}
