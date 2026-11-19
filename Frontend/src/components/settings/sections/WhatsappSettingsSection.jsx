"use client";

import { useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import CommonSelect from "@/components/common/CommonSelect";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingRow from "@/components/settings/SettingRow";
import SettingsSectionStatus from "@/components/settings/SettingsSectionStatus";
import {
  useTestWhatsappMeta,
  useTestWhatsappOpenAi,
  useUpdateWhatsappSettings,
  useWhatsappSettings,
} from "@/hooks/settings/useWhatsappSettings";
import { toastError, toastSuccess } from "@/lib/toast";
import WhatsappPasswordDialog from "./WhatsappPasswordDialog";
import WhatsappPhoneCard from "./WhatsappPhoneCard";

const SECRET_LABELS = {
  openaiApiKey: "API key",
  accessToken: "Access token",
  appSecret: "App secret",
  verifyToken: "Verify token",
};
const META_FIELDS = ["phoneNumberId", "graphVersion"];

function SecretField({ field, saved, draft, onEdit, onSave, onCancel, onClear }) {
  const label = SECRET_LABELS[field];
  if (draft !== undefined) {
    return (
      <div className="flex w-full flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 basis-44">
          <CommonInput
            name={field}
            label={`New ${label.toLowerCase()}`}
            type="password"
            autoComplete="off"
            showPasswordToggle={false}
            value={draft}
            onChange={(event) => onEdit(event.target.value)}
          />
        </div>
        <SettingsButton primary type="button" onClick={onSave} disabled={!draft.trim()}>Save</SettingsButton>
        <SettingsButton type="button" onClick={onCancel}>Cancel</SettingsButton>
      </div>
    );
  }

  const status = saved.set ? (saved.last4 ? `Set · ends in ${saved.last4}` : "Set") : "Not set";
  return (
    <SettingRow label={label} description={status} action={
      <div className="flex flex-wrap justify-end gap-2">
        <SettingsButton type="button" onClick={() => onEdit("")}>Replace</SettingsButton>
        {saved.set && <SettingsButton type="button" onClick={onClear}>Clear</SettingsButton>}
      </div>
    } />
  );
}

function ConnectionResult({ error, message }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>;
  if (message) return <p role="status" className="text-sm text-foreground">{message}</p>;
  return null;
}

function withoutFields(drafts, fields) {
  return Object.fromEntries(Object.entries(drafts).filter(([field]) => !fields.includes(field)));
}

export default function WhatsappSettingsSection() {
  const query = useWhatsappSettings();
  const save = useUpdateWhatsappSettings();
  const testOpenAi = useTestWhatsappOpenAi();
  const testMeta = useTestWhatsappMeta();
  const [drafts, setDrafts] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [clearing, setClearing] = useState(null);

  if (!query.data) {
    return <SettingsSectionStatus isPending={query.isPending} error={query.error} onRetry={query.refetch} />;
  }
  const settings = query.data;
  if (!settings.encryptionReady) {
    return <p role="status" className="rounded-md border border-border bg-background p-4 text-sm">
      Set SETTINGS_ENCRYPTION_KEY on the server to use the WhatsApp assistant
    </p>;
  }

  function plainChanges(fields) {
    const changed = {};
    for (const field of fields) {
      if (drafts[field] === undefined) continue;
      const value = drafts[field].trim();
      if (value !== (settings[field] ?? "")) changed[field] = field === "graphVersion" ? value : value || null;
    }
    return changed;
  }

  function openSave(title, values) {
    save.reset();
    setConfirming({ title, values });
  }

  const modelChanges = plainChanges(["openaiModel"]);
  const metaChanges = plainChanges(META_FIELDS);
  const models = testOpenAi.data?.models ?? [];
  const modelOptions = models.map((id) => ({ label: id, value: id }));
  if (settings.openaiModel && !models.includes(settings.openaiModel)) {
    modelOptions.push({
      value: settings.openaiModel,
      label: testOpenAi.data ? `${settings.openaiModel} (saved — not in your key's list)` : settings.openaiModel,
    });
  }

  const set = (field, value) => setDrafts((previous) => ({ ...previous, [field]: value }));
  const resetFields = (fields) => setDrafts((previous) => withoutFields(previous, fields));
  // Drafts exist only after a control changes. Each field, including the
  // Graph version, reads the saved value on mount and after its draft resets.
  const plainValue = (field) => drafts[field] ?? settings[field] ?? "";
  const secret = (field) => (
    <SecretField
      key={field}
      field={field}
      saved={settings[field]}
      draft={drafts[field]}
      onEdit={(value) => set(field, value)}
      onSave={() => openSave(`Save ${SECRET_LABELS[field].toLowerCase()}`, { [field]: drafts[field].trim() })}
      onCancel={() => resetFields([field])}
      onClear={() => setClearing(field)}
    />
  );

  const apiKey = drafts.openaiApiKey?.trim();
  const metaInput = Object.fromEntries(
    ["accessToken", ...META_FIELDS].flatMap((field) => drafts[field]?.trim() ? [[field, drafts[field].trim()]] : []),
  );
  const localUrl = settings.webhookUrl.startsWith("http://localhost") || settings.webhookUrl.startsWith("http://127.");

  function checkOpenAi() {
    testOpenAi.mutate(apiKey ? { apiKey } : {}, {
      onSuccess: ({ models: returned }) => {
        setDrafts((previous) => previous.openaiModel && !returned.includes(previous.openaiModel)
          ? withoutFields(previous, ["openaiModel"])
          : previous);
      },
    });
  }

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(settings.webhookUrl);
      toastSuccess("Webhook URL copied");
    } catch {
      toastError("Could not copy the webhook URL");
    }
  }

  return (
    <>
      <SettingsCard title="OpenAI">
        {secret("openaiApiKey")}
        <SettingsButton type="button" disabled={testOpenAi.isPending || (!apiKey && !settings.openaiApiKey.set)}
          onClick={checkOpenAi}>
          {testOpenAi.isPending ? "Testing…" : "Test connection"}
        </SettingsButton>
        <ConnectionResult error={testOpenAi.error} message={testOpenAi.data
          ? (models.length ? "Connected to OpenAI" : "Connected. This key returned no supported chat models.")
          : undefined} />
        <div className="flex w-full flex-col gap-2">
          <p className="font-montserrat text-base font-medium text-foreground">Model</p>
          <CommonSelect
            ariaLabel="Model"
            value={plainValue("openaiModel")}
            options={modelOptions}
            onChange={(value) => set("openaiModel", value)}
            placeholder="Choose a model"
            disabled={!modelOptions.length}
          />
          {!testOpenAi.data && <p className="text-sm text-muted-foreground">Test the key to choose a model</p>}
        </div>
        <SettingsButton primary type="button" disabled={!Object.keys(modelChanges).length}
          onClick={() => openSave("Save OpenAI settings", modelChanges)}>Save</SettingsButton>
      </SettingsCard>

      <SettingsCard title="Meta (WhatsApp Cloud API)">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <CommonInput name="phoneNumberId" label="Phone number ID" value={plainValue("phoneNumberId")}
            onChange={(event) => set("phoneNumberId", event.target.value)} />
          <CommonInput name="graphVersion" label="Graph version" value={plainValue("graphVersion")}
            onChange={(event) => set("graphVersion", event.target.value)}
            onBlur={() => {
              if (drafts.graphVersion !== undefined && !drafts.graphVersion.trim()) resetFields(["graphVersion"]);
            }} />
        </div>
        {["accessToken", "appSecret", "verifyToken"].map(secret)}
        <div className="flex w-full flex-wrap gap-2">
          <SettingsButton type="button" disabled={testMeta.isPending || (!metaInput.accessToken && !settings.accessToken.set)
            || !(metaInput.phoneNumberId || settings.phoneNumberId) || !(metaInput.graphVersion || settings.graphVersion)}
            onClick={() => testMeta.mutate(metaInput)}>
            {testMeta.isPending ? "Testing…" : "Test connection"}
          </SettingsButton>
          <SettingsButton primary type="button" disabled={!Object.keys(metaChanges).length}
            onClick={() => openSave("Save Meta settings", metaChanges)}>Save</SettingsButton>
        </div>
        <ConnectionResult error={testMeta.error} message={testMeta.data
          ? `Connected: ${testMeta.data.displayPhoneNumber} · ${testMeta.data.verifiedName}`
          : undefined} />
        <div className="flex w-full flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <CommonInput name="whatsapp-webhook-url" label="Webhook URL" value={settings.webhookUrl} readOnly />
          </div>
          <SettingsButton type="button" onClick={copyWebhookUrl}>Copy URL</SettingsButton>
        </div>
        {localUrl && <p className="text-sm text-muted-foreground">
          Meta needs a public HTTPS address. Locally, paste your tunnel&apos;s address with /api/webhooks/whatsapp instead.
        </p>}
      </SettingsCard>

      <WhatsappPhoneCard linkedPhone={settings.linkedPhone} />
      {clearing && (
        <ConfirmDialog open tone="destructive" title={`Clear ${SECRET_LABELS[clearing].toLowerCase()}?`}
          description="This removes the saved credential."
          confirmLabel="Clear"
          onOpenChange={(open) => { if (!open) setClearing(null); }}
          onConfirm={() => {
            openSave(`Clear ${SECRET_LABELS[clearing].toLowerCase()}`, { [clearing]: null });
            setClearing(null);
          }}
        />
      )}
      {confirming && (
        <WhatsappPasswordDialog
          title={confirming.title}
          pending={save.isPending}
          error={save.error}
          onClose={() => { setConfirming(null); save.reset(); }}
          onSubmit={(currentPassword) => save.mutate({ ...confirming.values, currentPassword }, { onSuccess: () => {
            resetFields(Object.keys(confirming.values));
            setConfirming(null);
            save.reset();
          } })}
        />
      )}
    </>
  );
}
