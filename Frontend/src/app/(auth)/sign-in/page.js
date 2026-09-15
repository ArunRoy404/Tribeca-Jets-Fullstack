"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import AuthCard from "@/components/auth/AuthCard";
import AuthCardHeader from "@/components/auth/AuthCardHeader";
import CommonInput from "@/components/common/CommonInput";
import StaggerContainer from "@/components/common/StaggerContainer";
import StaggerItem from "@/components/common/StaggerItem";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLogin } from "@/hooks/auth";

function SignInForm() {
  // The hook owns everything that happens after submit — where to navigate,
  // what to toast, whether a second factor is required.
  const { mutate: login, isPending, error } = useLogin();
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    login({
      email: form.get("email"),
      password: form.get("password"),
      rememberMe,
    });
  };

  return (
    <AuthCard showLogo>
      <StaggerContainer className="contents">
        <AuthCardHeader
          title="Sign in"
          description="Access the Tribeca Jets Command Center"
          subtitleTone="slate"
        />

        <StaggerItem as={motion.form} onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
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
          <CommonInput
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={isPending}
            error={error?.fieldErrors?.password}
          />

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="remember" className="flex items-center gap-2.5 font-montserrat font-medium text-[14px] text-slate">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                disabled={isPending}
              />
              Remember me
            </Label>
            <Link href="/forgot-password" className="font-montserrat font-medium text-[16px] text-purple cursor-pointer">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="cta" className="mt-4 w-full" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}

/**
 * `useSearchParams` (via useRedirectTarget) needs a Suspense boundary so the
 * rest of the route can still be prerendered.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
