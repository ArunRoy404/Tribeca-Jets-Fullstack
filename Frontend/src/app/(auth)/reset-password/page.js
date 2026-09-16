"use client";

import { motion } from "framer-motion";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonInput from "@/components/common/CommonInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";
import { useResetPassword, useAuthFlowGuard } from "@/hooks/auth";

export default function ResetPasswordPage() {
  // Redirects back if the code was never verified.
  useAuthFlowGuard("passwordReset", "/forgot-password");
  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    resetPassword({
      newPassword: form.get("newPassword"),
      confirmPassword: form.get("confirmPassword"),
    });
  };

  return (
    <AuthCard backHref="/forgot-password/verify" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Reset Password?"
          description="Please enter a new password for your account. Use at least 10 characters with an uppercase letter, a lowercase letter and a number."
        />

        <StaggerItem as={motion.form} onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
          <CommonInput
            label="New Password"
            name="newPassword"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            required
            disabled={isPending}
            error={error?.fieldErrors?.newPassword}
          />
          <CommonInput
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            required
            disabled={isPending}
            error={error?.fieldErrors?.confirmPassword}
          />

          <Button type="submit" size="cta" className="mt-4 w-full" disabled={isPending}>
            {isPending ? "Resetting…" : "Reset Password"}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
