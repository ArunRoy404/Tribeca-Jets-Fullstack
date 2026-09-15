"use client";

import { useRouter } from "next/navigation";
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

export default function SignInPage() {
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    router.push("/sign-in/two-factor");
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
          <CommonInput label="Email address" name="email" type="email" placeholder="you@tribecajets.com" />
          <CommonInput label="Password" name="password" type="password" placeholder="Enter your password" />

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="remember" className="flex items-center gap-2.5 font-montserrat font-medium text-[14px] text-slate">
              <Checkbox id="remember" />
              Remember me
            </Label>
            <Link href="/forgot-password" className="font-montserrat font-medium text-[16px] text-purple cursor-pointer">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" size="cta" className="mt-4 w-full">
            Sign In
          </Button>
        </StaggerItem>
      </StaggerContainer>
    </AuthCard>
  );
}
