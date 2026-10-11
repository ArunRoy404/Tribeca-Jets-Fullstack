"use client";

import SuccessCard from "@/components/auth/SuccessCard";
import { useProductName } from "@/hooks/settings";

export default function ResetPasswordSuccessPage() {
  const productName = useProductName();
  return (
    <SuccessCard
      title="You’re all set"
      description={`Your ${productName} password is changed. Every session was signed out, so sign in again with your new password.`}
      ctaLabel="Continue to Sign in"
      ctaHref="/sign-in"
    />
  );
}
