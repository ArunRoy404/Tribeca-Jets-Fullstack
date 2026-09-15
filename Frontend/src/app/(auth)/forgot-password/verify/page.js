"use client";

import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();

  const handleVerify = () => {
    router.push("/reset-password");
  };

  return (
    <AuthCard backHref="/forgot-password" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Verify your email"
          description={
            <>
              we sent a 6-digit code to <span className="text-foreground">you@gmail.com</span>
            </>
          }
        />

        <StaggerItem className="flex w-full flex-col items-end gap-2">
          <CommonOTPInput />
          <Button type="button" variant="link" className="h-auto p-0">
            <span className="text-muted-foreground">Didn&rsquo;t receive it? </span>
            Resend code
          </Button>
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button type="button" onClick={handleVerify} size="cta" className="w-full">
            Verify email
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
