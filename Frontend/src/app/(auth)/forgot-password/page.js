"use client";

import { motion } from "framer-motion";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonInput from "@/components/common/CommonInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";
import { useForgotPassword } from "@/hooks/auth";

export default function ForgotPasswordPage() {
  const { mutate: requestReset, isPending, error } = useForgotPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    requestReset({ email: new FormData(e.currentTarget).get("email") });
  };

  return (
    <AuthCard backHref="/sign-in" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Forgot Password?"
          description="Enter your email address and we’ll send you a 6-digit code to reset your password."
        />

        <StaggerItem as={motion.form} onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <CommonInput
            label="Email address"
            name="email"
            type="email"
            placeholder="you@tribecajets.com"
            autoComplete="email"
            required
            disabled={isPending}
            error={error?.fieldErrors?.email}
          />

          <Button type="submit" size="cta" className="w-full" disabled={isPending}>
            {isPending ? "Sending code…" : "Continue"}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
