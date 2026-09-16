"use client";

import { useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Button } from "@/components/ui/button";
import {
  useVerifyResetCode,
  useResendResetCode,
  useAuthFlowGuard,
} from "@/hooks/auth";

export default function VerifyEmailPage() {
  // Redirects back if no reset is in progress.
  const { challengeEmail } = useAuthFlowGuard("passwordReset", "/forgot-password");
  const { mutate: verify, isPending } = useVerifyResetCode();
  const { mutate: resend, isPending: isResending } = useResendResetCode();
  const [code, setCode] = useState("");

  const isComplete = code?.length === 6;

  return (
    <AuthCard backHref="/forgot-password" showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Verify your email"
          description={
            <>
              we sent a 6-digit code to{" "}
              <span className="text-foreground">{challengeEmail ?? "your email"}</span>
            </>
          }
        />

        <StaggerItem className="flex w-full flex-col items-end gap-2">
          <CommonOTPInput
            value={code}
            onChange={setCode}
            disabled={isPending}
            onComplete={(value) => verify({ code: value })}
          />
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => resend()}
            disabled={isResending || isPending}
          >
            <span className="text-muted-foreground">Didn&rsquo;t receive it? </span>
            {isResending ? "Sending…" : "Resend code"}
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
            {isPending ? "Verifying…" : "Verify email"}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
