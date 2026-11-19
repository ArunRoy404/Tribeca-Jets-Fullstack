"use client";

import { useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingRow from "@/components/settings/SettingRow";
import { useSendWhatsappLinkCode, useUnlinkWhatsappPhone, useVerifyWhatsappPhone } from "@/hooks/settings/useWhatsappSettings";
import { formatTimestamp } from "@/lib/archive";
import WhatsappPasswordDialog from "./WhatsappPasswordDialog";

export default function WhatsappPhoneCard({ linkedPhone }) {
  const [stage, setStage] = useState(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [unlinking, setUnlinking] = useState(false);
  const send = useSendWhatsappLinkCode();
  const verify = useVerifyWhatsappPhone();
  const unlink = useUnlinkWhatsappPhone();

  return (
    <SettingsCard title="Your phone">
      {linkedPhone && (
        <SettingRow
          label={`+${linkedPhone.phone}`}
          description={`Verified ${formatTimestamp(linkedPhone.verifiedAt)}`}
          pill="Linked"
          action={<SettingsButton type="button" onClick={() => { unlink.reset(); setUnlinking(true); }}>Unlink</SettingsButton>}
        />
      )}
      {linkedPhone && stage === null ? (
        <SettingsButton type="button" onClick={() => setStage("phone")}>Link a different number</SettingsButton>
      ) : stage === "verify" ? (
        <form className="flex w-full flex-col items-start gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (code.length !== 6 || verify.isPending) return;
          verify.mutate({ code }, { onSuccess: () => {
            setPhone("");
            setCode("");
            setStage(null);
            verify.reset();
          } });
        }}>
          <p className="text-sm text-muted-foreground">Enter the six-digit code sent to {phone}.</p>
          <CommonOTPInput
            aria-label="WhatsApp verification code"
            autoComplete="one-time-code"
            value={code}
            onChange={(value) => setCode(value.replace(/\D/g, ""))}
          />
          {verify.error && <p role="alert" className="text-sm text-destructive">{verify.error.message}</p>}
          <div className="flex flex-wrap gap-2">
            <SettingsButton primary type="submit" disabled={verify.isPending || code.length !== 6}>Verify</SettingsButton>
            <SettingsButton type="button" disabled={verify.isPending} onClick={() => {
              setCode("");
              verify.reset();
              setStage("phone");
            }}>Request a new code</SettingsButton>
          </div>
        </form>
      ) : (
        <form className="flex w-full flex-col items-start gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (!phone.trim() || send.isPending) return;
          send.reset();
          setStage("password");
        }}>
          <p className="text-sm text-muted-foreground">
            The code arrives on WhatsApp from the business number. Meta’s test number can only reach numbers on its recipient list.
          </p>
          <CommonInput
            name="whatsapp-phone"
            label="Phone number with country code"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={send.error?.fieldErrors?.phone}
            required
          />
          <SettingsButton primary type="submit" disabled={!phone.trim() || send.isPending}>Send code</SettingsButton>
        </form>
      )}

      {stage === "password" && (
        <WhatsappPasswordDialog
          title="Send code"
          pending={send.isPending}
          error={send.error}
          onClose={() => setStage("phone")}
          onSubmit={(currentPassword) => send.mutate({ phone, currentPassword }, {
            onSuccess: () => { setStage("verify"); send.reset(); },
          })}
        />
      )}
      {unlinking && (
        <WhatsappPasswordDialog
          title="Unlink phone"
          pending={unlink.isPending}
          error={unlink.error}
          onClose={() => { setUnlinking(false); unlink.reset(); }}
          onSubmit={(currentPassword) => unlink.mutate({ currentPassword }, { onSuccess: () => {
            setPhone("");
            setCode("");
            setStage(null);
            setUnlinking(false);
            unlink.reset();
          } })}
        />
      )}
    </SettingsCard>
  );
}
