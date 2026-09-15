"use client";

import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";

export default function TwoFactorPage() {
  const router = useRouter();

  const handleVerify = () => {
    router.push("/sign-in/complete");
  };

  return (
    <AuthCard backHref="/sign-in">
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Two-Factor Authentication"
          description="Enter the 6-digit code from your authenticator app to verify it’s really you."
          size="lg"
        />

        <StaggerItem className="w-full">
          <CommonOTPInput fixedWidth />
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button type="button" variant="link" className="h-auto self-start p-0">
            Didn&rsquo;t receive it? Resend code
          </Button>
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button type="button" onClick={handleVerify} size="cta" className="w-full">
            Verify &amp; Sign In
          </Button>
        </StaggerItem>

        <StaggerItem className="w-full">
          <p className="w-full text-center font-montserrat font-normal text-[12px] text-muted-foreground">
            Trouble signing in? Use a backup code instead
          </p>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
