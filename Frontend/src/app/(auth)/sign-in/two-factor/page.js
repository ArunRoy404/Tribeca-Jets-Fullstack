"use client";

import { useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";
import {
  useVerifyTwoFactor,
  useResendTwoFactor,
  useAuthFlowGuard,
} from "@/hooks/auth";

export default function TwoFactorPage() {
  // Redirects back to sign-in if no challenge is in progress.
  const { challengeEmail } = useAuthFlowGuard("twoFactor", "/sign-in");
  const { mutate: verify, isPending } = useVerifyTwoFactor();
  const { mutate: resend, isPending: isResending } = useResendTwoFactor();
  const [code, setCode] = useState("");

  const isComplete = code?.length === 6;

  return (
    <AuthCard backHref="/sign-in">
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Two-Factor Authentication"
          description={
            challengeEmail ? (
              <>
                Enter the 6-digit code we sent to{" "}
                <span className="text-foreground">{challengeEmail}</span> to verify it&rsquo;s really you.
              </>
            ) : (
              "Enter the 6-digit code we emailed you to verify it’s really you."
            )
          }
          size="lg"
        />

        <StaggerItem className="w-full">
          <CommonOTPInput
            fixedWidth
            value={code}
            onChange={setCode}
            disabled={isPending}
            // Submitting on the sixth digit saves a tap on mobile, which is the
            // primary device for this screen.
            onComplete={(value) => verify({ code: value })}
          />
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button
            type="button"
            variant="link"
            className="h-auto self-start p-0"
            onClick={() => resend()}
            disabled={isResending || isPending}
          >
            {isResending ? "Sending…" : "Didn’t receive it? Resend code"}
          </Button>
        </StaggerItem>

        <StaggerItem className="w-full">
          <Button
            type="button"
            onClick={() => verify({ code })}
            size="cta"
            className="w-full"
            disabled={!isComplete || isPending}
          >
            {isPending ? "Verifying…" : "Verify & Sign In"}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
