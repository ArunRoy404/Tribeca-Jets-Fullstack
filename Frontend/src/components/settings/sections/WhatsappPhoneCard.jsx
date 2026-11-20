"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import CommonInput from "@/components/common/CommonInput";
import CommonOTPInput from "@/components/common/CommonOTPInput";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import IconActionButton from "@/components/common/IconActionButton";
import SettingsPasswordDialog from "@/components/common/secret-field/SettingsPasswordDialog";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingsSectionStatus from "@/components/settings/SettingsSectionStatus";
import {
  stageWhatsappRequest, useRenameWhatsappPhone, useSendWhatsappLinkCode,
  useUnlinkWhatsappPhone, useVerifyWhatsappPhone, useWhatsappPhones,
} from "@/hooks/settings/useWhatsappSettings";
import { formatTimestamp } from "@/lib/archive";

function PhoneRow({ phone, onUnlink }) {
  const [label, setLabel] = useState(null);
  const rename = useRenameWhatsappPhone();

  function close() {
    setLabel(null);
    rename.reset();
  }

  async function save(event) {
    event.preventDefault();
    if (rename.isPending || !label?.trim()) return;
    try {
      await rename.mutateAsync({ id: phone?.id, label });
      close();
    } catch {
      // The form displays the API error.
    }
  }

  return (
    <li className="flex flex-wrap items-end justify-between gap-3 border-b border-border py-3">
      {label === null ? (
        <div className="min-w-0">
          <p className="break-words font-medium">{phone?.label} · +…{phone?.last4}</p>
          <p className="text-sm text-muted-foreground">Verified {formatTimestamp(phone?.verifiedAt)}</p>
        </div>
      ) : (
        <form className="flex w-full flex-wrap items-end gap-2" onSubmit={save} onKeyDown={(event) => {
          if (event.key === "Escape" && !rename.isPending) close();
        }}>
          <div className="min-w-40 flex-1">
            <CommonInput name={`label-${phone?.id}`} label="Phone name" autoFocus value={label}
              onChange={(event) => setLabel(event.target.value)} required maxLength={40}
              error={rename.error?.fieldErrors?.label ?? rename.error?.message} />
          </div>
          <IconActionButton icon={Check} label="Save name" tone="primary" type="submit" disabled={rename.isPending || !label?.trim()} />
          <IconActionButton icon={X} label="Cancel rename" onClick={close} disabled={rename.isPending} />
        </form>
      )}
      {label === null && (
        <div className="flex gap-2">
          <IconActionButton icon={Pencil} label={`Rename ${phone?.label}`} onClick={() => setLabel(phone?.label)} />
          <IconActionButton icon={Trash2} label={`Unlink ${phone?.label}`} tone="destructive" onClick={() => onUnlink(phone)} />
        </div>
      )}
    </li>
  );
}

function LinkPhoneForm({ close }) {
  const [stage, setStage] = useState("phone");
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const send = useSendWhatsappLinkCode();
  const verify = useVerifyWhatsappPhone();

  async function sendCode(currentPassword) {
    try {
      await send.mutateAsync(stageWhatsappRequest({ phone, label, currentPassword }));
      setStage("verify");
      send.reset();
    } catch {
      // The password dialog displays the API error.
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    if (code.length !== 6 || verify.isPending) return;
    try {
      await verify.mutateAsync(stageWhatsappRequest({ code, label }));
      close();
    } catch {
      // The code form displays the API error.
    }
  }

  if (stage === "verify") {
    return (
      <form className="flex w-full flex-col items-start gap-3" onSubmit={verifyCode}>
        <p className="text-sm text-muted-foreground">Enter the six-digit code sent to {phone}.</p>
        <CommonOTPInput aria-label="WhatsApp verification code" autoComplete="one-time-code"
          value={code} onChange={(value) => setCode(value.replace(/\D/g, ""))} />
        {verify.error && <p role="alert" className="text-sm text-destructive">{verify.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <SettingsButton primary type="submit" disabled={verify.isPending || code.length !== 6}>Verify</SettingsButton>
          <SettingsButton type="button" disabled={verify.isPending} onClick={() => {
            setCode("");
            verify.reset();
            setStage("phone");
          }}>Request a new code</SettingsButton>
          <SettingsButton type="button" disabled={verify.isPending} onClick={close}>Cancel</SettingsButton>
        </div>
      </form>
    );
  }

  return (
    <>
      <form className="flex w-full flex-col items-start gap-3" onSubmit={(event) => {
        event.preventDefault();
        if (!phone.trim() || !label.trim() || send.isPending) return;
        send.reset();
        setStage("password");
      }}>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <CommonInput name="whatsapp-label" label="Phone name" value={label} required maxLength={40}
            onChange={(event) => setLabel(event.target.value)} error={send.error?.fieldErrors?.label} />
          <CommonInput name="whatsapp-phone" label="Phone number with country code" type="tel"
            autoComplete="tel" value={phone} required onChange={(event) => setPhone(event.target.value)}
            error={send.error?.fieldErrors?.phone} />
        </div>
        <div className="flex flex-wrap gap-2">
          <SettingsButton primary type="submit" disabled={!phone.trim() || !label.trim() || send.isPending}>Send code</SettingsButton>
          <SettingsButton type="button" disabled={send.isPending} onClick={close}>Cancel</SettingsButton>
        </div>
      </form>
      {stage === "password" && (
        <SettingsPasswordDialog title="Send code" pending={send.isPending} error={send.error}
          onClose={() => setStage("phone")} onSubmit={sendCode} />
      )}
    </>
  );
}

export default function WhatsappPhoneCard({ phoneLimit }) {
  const [adding, setAdding] = useState(false);
  const [unlinking, setUnlinking] = useState(null);
  const query = useWhatsappPhones();
  const unlink = useUnlinkWhatsappPhone();
  const count = query.data?.meta?.total;

  async function unlinkPhone(currentPassword) {
    try {
      await unlink.mutateAsync(stageWhatsappRequest({ id: unlinking?.phone?.id, currentPassword }));
      setUnlinking(null);
      unlink.reset();
    } catch {
      // The password dialog displays the API error.
    }
  }

  return (
    <SettingsCard title="My phones" description={count > 0 ? `${count} of ${phoneLimit} phones linked` : undefined}>
      <SettingsSectionStatus isPending={query.isPending} error={query.error} onRetry={query.refetch} />
      {count > 0 && (
        <ul className="w-full">
          {query.data?.data?.map((phone) => <PhoneRow key={phone?.id} phone={phone}
            onUnlink={(row) => { unlink.reset(); setUnlinking({ phone: row, confirmed: false }); }} />)}
        </ul>
      )}
      {count < phoneLimit && (
        <>
          <p className="text-sm text-muted-foreground">
            Meta’s test number can only reach numbers on its recipient list. Add each number there first.
          </p>
          {adding ? <LinkPhoneForm close={() => setAdding(false)} /> : <SettingsButton type="button" onClick={() => setAdding(true)}>Add a phone</SettingsButton>}
        </>
      )}
      {unlinking && !unlinking.confirmed && (
        <ConfirmDialog open tone="destructive" title={`Unlink ${unlinking.phone?.label}?`}
          description="This phone will stop receiving assistant replies." confirmLabel="Unlink"
          onOpenChange={(open) => { if (!open) setUnlinking(null); }}
          onConfirm={() => setUnlinking({ ...unlinking, confirmed: true })} />
      )}
      {unlinking?.confirmed && (
        <SettingsPasswordDialog title="Unlink phone" pending={unlink.isPending} error={unlink.error}
          onClose={() => { setUnlinking(null); unlink.reset(); }} onSubmit={unlinkPhone} />
      )}
    </SettingsCard>
  );
}
