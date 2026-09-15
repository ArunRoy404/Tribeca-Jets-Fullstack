"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonInput from "@/components/common/CommonInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push("/reset-password/success");
  };

  return (
    <AuthCard backHref="/forgot-password/verify" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Reset Password?"
          description="Please enter a new password for your account. Use a strong password to keep your account secure."
        />

        <StaggerItem as={motion.form} onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
          <CommonInput label="New Password" name="new-password" type="password" placeholder="Enter your password" />
          <CommonInput label="Confirm Password" name="confirm-password" type="password" placeholder="Enter your password" />

          <Button type="submit" size="cta" className="mt-4 w-full">
            Reset Password
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
