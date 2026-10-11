"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/auth";
import ProfileCard from "@/components/account/ProfileCard";
import SessionsList from "@/components/account/SessionsList";
import ChangePasswordDialog from "@/components/account/ChangePasswordDialog";
import TwoFactorDialog from "@/components/account/TwoFactorDialog";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingRow from "@/components/settings/SettingRow";
import SettingsButton from "@/components/settings/SettingsButton";

/** My Account — the signed-in user's own profile, password, two-factor and devices. */
export default function AccountPage() {
  const { data: user, isLoading } = useCurrentUser();
  const [changingPassword, setChangingPassword] = useState(false);
  const [twoFactorTarget, setTwoFactorTarget] = useState(null);

  return (
    <div className="flex flex-col gap-6 w-full min-h-full bg-surface px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8 lg:pb-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="font-montserrat font-bold text-[22px] sm:text-[28px] leading-normal text-foreground">
          My Account
        </h2>
        <p className="font-montserrat text-[13px] leading-normal text-muted-foreground">
          Your profile, password, two-factor and signed-in devices.
        </p>
      </div>

      {isLoading || !user ? (
        <div className="flex items-center gap-2 font-montserrat text-[13px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your account…
        </div>
      ) : (
        <div className="flex flex-col gap-5 w-full max-w-4xl">
          <ProfileCard key={user.id} user={user} />

          <SettingsCard title="Sign-in & security" description="Protect your own sign-in.">
            <SettingRow
              label="Two-factor authentication"
              description="Ask for a 6-digit code, sent to your email, every time you sign in."
              pill={user.twoFactorEnabled ? "On" : "Off"}
              pillTone={user.twoFactorEnabled ? "success" : "warning"}
              checked={Boolean(user.twoFactorEnabled)}
              onCheckedChange={(next) => setTwoFactorTarget(next)}
            />
            <SettingRow
              label="Password"
              description="Changing it signs out every other device; this one stays signed in."
              action={<SettingsButton onClick={() => setChangingPassword(true)}>Change Password</SettingsButton>}
            />
          </SettingsCard>

          <SettingsCard title="Signed-in devices" description="Every browser where you are signed in right now.">
            <SessionsList />
          </SettingsCard>
        </div>
      )}

      <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      <TwoFactorDialog
        open={twoFactorTarget !== null}
        enable={Boolean(twoFactorTarget)}
        onOpenChange={(open) => !open && setTwoFactorTarget(null)}
      />
    </div>
  );
}
