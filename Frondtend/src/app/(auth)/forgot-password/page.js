"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonInput from "@/components/common/CommonInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push("/forgot-password/verify");
  };

  return (
    <AuthCard backHref="/sign-in" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Forgot Password?"
          description="If you need help resetting your password, we can help by sending you a link to reset it."
        />

        <StaggerItem as={motion.form} onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
          <CommonInput label="Email address" name="email" type="email" placeholder="you@tribecajets.com" />

          <Button type="submit" size="cta" className="w-full">
            Continue
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
