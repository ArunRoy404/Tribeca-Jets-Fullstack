"use client";

import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import CommonInput from "@/components/common/CommonInput";
import IconActionButton from "@/components/common/IconActionButton";
import CommonSelect from "@/components/common/CommonSelect";
import SecretField from "@/components/common/secret-field/SecretField";
import SettingsPasswordDialog from "@/components/common/secret-field/SettingsPasswordDialog";
import SettingRow from "@/components/settings/SettingRow";
import SettingsButton from "@/components/settings/SettingsButton";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingsSectionStatus from "@/components/settings/SettingsSectionStatus";
import { useCopyToClipboard } from "@/hooks/common/useCopyToClipboard";
import { dateField, enumParam, filterField, paginationFields, useTableQueryParams } from "@/hooks/common/useTableQueryParams";
import FilterTabs from "@/components/table/common/FilterTabs";
import {
  stageWhatsappRequest,
  useRevealWhatsappSecret,
  useSetWhatsappAssistant,
  useTestWhatsappMeta,
  useTestWhatsappOpenAi,
  useUpdateWhatsappSettings,
  useWhatsappSettings,
} from "@/hooks/settings/useWhatsappSettings";
import { optionalText } from "@/lib/form";
import WhatsappPhoneCard from "./WhatsappPhoneCard";
import WhatsappHistory, { WHATSAPP_HISTORY_TYPES } from "./WhatsappHistory";

const { page, limit } = paginationFields(["createdAt"]);
const VIEW_PARAMS = {
  tab: { default: "setup", parse: enumParam(["setup", "history"]), local: true, resetsPage: true },
  page, limit,
  phoneId: {
    default: "",
    parse: (value) => /^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(value) ? value : undefined,
    resetsPage: true,
  },
  type: filterField(WHATSAPP_HISTORY_TYPES.map(({ value }) => value)),
  from: dateField(),
  to: dateField(),
};

const FIELD_LABELS = {
  openaiApiKey: "API key",
  phoneNumberId: "Phone number ID",
  accessToken: "Access token",
  appSecret: "App secret",
  verifyToken: "Verify token",
};
const OPENAI_FIELDS = ["openaiApiKey", "openaiModel"];
const META_SECRET_FIELDS = ["accessToken", "appSecret", "verifyToken"];
const META_FIELDS = ["phoneNumberId", "graphVersion", ...META_SECRET_FIELDS];
const UNSAVED_CONNECTION = "Connected — not saved yet. Click Save to keep it.";

function generateVerifyToken() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function withoutFields(drafts, fields) {
  return Object.fromEntries(Object.entries(drafts).filter(([field]) => !fields.includes(field)));
}

function cardChanges(fields, drafts, settings) {
  const changes = {};
  for (const field of fields) {
    if (!Object.hasOwn(drafts, field)) continue;
    const draft = drafts[field];

    if (field === "openaiApiKey" || META_SECRET_FIELDS.includes(field)) {
      const replacement = draft === null ? null : optionalText(draft);
      if (replacement !== undefined) changes[field] = replacement;
      continue;
    }

    const value = optionalText(draft, { editing: true });
    if (field === "graphVersion" && !value) continue;
    if (value !== settings[field]) changes[field] = value;
  }
  return changes;
}

function ReadinessItem({ ready, children }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden="true" className={ready ? "text-success" : "text-destructive"}>
        {ready ? "✓" : "✗"}
      </span>
      <span><span className="sr-only">{ready ? "Ready. " : "Missing. "}</span>{children}</span>
    </li>
  );
}

function AssistantCard({ enabled, readiness }) {
  const assistant = useSetWhatsappAssistant();
  const [confirming, setConfirming] = useState(false);
  const { openai, meta, metaMissing, phonesLinked, encryptionReady } = readiness;
  const ready = openai && meta && phonesLinked > 0 && encryptionReady;
  const border = !enabled ? "border-destructive" : ready ? "border-success" : "border-warning";

  function changeEnabled(next) {
    assistant.reset();
    if (next) setConfirming(true);
    else assistant.mutate(stageWhatsappRequest({ enabled: false }));
  }

  async function switchOn(currentPassword) {
    try {
      await assistant.mutateAsync(stageWhatsappRequest({ enabled: true, currentPassword }));
      setConfirming(false);
    } catch {
      // The password dialog displays the mutation error.
    }
  }

  return (
    <SettingsCard title="Assistant" className={border}>
      <SettingRow
        label="WhatsApp assistant"
        description="Off stops the bot at once. It answers only your linked phones."
        checked={enabled}
        onCheckedChange={changeEnabled}
        disabled={assistant.isPending}
      />
      {enabled && !ready && <p role="status" className="text-sm text-warning">Some setup steps are still missing.</p>}
      <ul className="space-y-1 text-sm text-foreground">
        <ReadinessItem ready={openai}>OpenAI key and model saved</ReadinessItem>
        <ReadinessItem ready={meta}>
          Meta settings saved
          {!meta && <span className="block text-muted-foreground">Missing: {metaMissing.map((field) => FIELD_LABELS[field]).join(", ")}</span>}
        </ReadinessItem>
        <ReadinessItem ready={phonesLinked > 0}>{phonesLinked > 0 ? `Phones linked: ${phonesLinked}` : "No phone linked"}</ReadinessItem>
        {!encryptionReady && <ReadinessItem ready={false}>Encryption key on the server</ReadinessItem>}
      </ul>
      {!confirming && assistant.error && <p role="alert" className="text-sm text-destructive">{assistant.error.message}</p>}
      {confirming && (
        <SettingsPasswordDialog
          title="Turn assistant on"
          pending={assistant.isPending}
          error={assistant.error}
          onClose={() => { setConfirming(false); assistant.reset(); }}
          onSubmit={switchOn}
        />
      )}
    </SettingsCard>
  );
}

function ConnectionTest({ test, disabled, onTest, message }) {
  return (
    <>
      <SettingsButton type="button" disabled={test.isPending || disabled} onClick={onTest}>
        {test.isPending ? "Testing…" : "Test connection"}
      </SettingsButton>
      {test.error && <p role="alert" className="text-sm text-destructive">{test.error.message}</p>}
      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    </>
  );
}

function CardSave({ dirty, saving, onSave }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SettingsButton primary type="button" disabled={!dirty || saving} onClick={onSave}>Save</SettingsButton>
      {dirty && <p className="text-sm text-muted-foreground">Unsaved changes</p>}
    </div>
  );
}

function WhatsappSettingsCards({ settings, onDirtyChange }) {
  const save = useUpdateWhatsappSettings();
  const reveal = useRevealWhatsappSecret();
  const testOpenAi = useTestWhatsappOpenAi();
  const testMeta = useTestWhatsappMeta();
  const copyUrl = useCopyToClipboard({ success: "Webhook URL copied", failure: "Could not copy the webhook URL" });
  const [drafts, setDrafts] = useState({});
  const [confirming, setConfirming] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const openAiTestVersion = useRef(0);

  const openAiChanges = cardChanges(OPENAI_FIELDS, drafts, settings);
  const metaChanges = cardChanges(META_FIELDS, drafts, settings);
  const openAiDirty = Object.keys(openAiChanges).length > 0;
  const metaDirty = Object.keys(metaChanges).length > 0;
  const dirty = openAiDirty || metaDirty;

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  function resetConnectionTest(field, nextDraft) {
    if (optionalText(drafts[field]) === optionalText(nextDraft)) return;
    if (field === "openaiApiKey") {
      openAiTestVersion.current += 1;
      testOpenAi.reset();
    }
    if (["accessToken", "phoneNumberId", "graphVersion"].includes(field)) testMeta.reset();
  }

  function set(field, value) {
    resetConnectionTest(field, value);
    setDrafts((previous) => ({ ...previous, [field]: value }));
  }

  const resetFields = (fields) => setDrafts((previous) => withoutFields(previous, fields));
  const plainValue = (field) => drafts[field] ?? settings[field] ?? "";
  const models = testOpenAi.data?.models ?? [];
  const modelOptions = models.map((id) => ({ label: id, value: id }));
  if (settings.openaiModel && !models.includes(settings.openaiModel)) {
    modelOptions.push({
      value: settings.openaiModel,
      label: testOpenAi.data ? `${settings.openaiModel} (saved — not in your key’s list)` : settings.openaiModel,
    });
  }

  const apiKey = drafts.openaiApiKey?.trim();
  const metaInput = Object.fromEntries(
    ["accessToken", "phoneNumberId", "graphVersion"].flatMap((field) => {
      const value = drafts[field]?.trim();
      return value ? [[field, value]] : [];
    }),
  );
  const localUrl = settings.webhookUrl.startsWith("http://localhost") || settings.webhookUrl.startsWith("http://127.");

  async function revealSecret(field, currentPassword) {
    let value;
    try {
      await reveal.mutateAsync(stageWhatsappRequest({ field, currentPassword }, (revealed) => { value = revealed; }));
      return value;
    } finally {
      value = undefined;
      reveal.reset();
    }
  }

  function secret(field) {
    return (
      <SecretField
        key={field}
        label={FIELD_LABELS[field]}
        secret={settings[field]}
        value={drafts[field]}
        editing={Object.hasOwn(drafts, field)}
        onChange={(value) => set(field, value)}
        onEditingChange={(editing) => {
          if (editing) set(field, "");
          else {
            resetConnectionTest(field);
            resetFields([field]);
          }
        }}
        onReveal={(password) => revealSecret(field, password)}
        onGenerate={field === "verifyToken" ? generateVerifyToken : undefined}
        generateHint={field === "verifyToken" ? "Copy it now and paste it into Meta after you save." : undefined}
        active={activeField === field}
        onView={() => setActiveField(field)}
      />
    );
  }

  function openSave(title, fields, values) {
    save.reset();
    setConfirming({ title, fields, values });
  }

  async function saveCard(currentPassword) {
    try {
      await save.mutateAsync(stageWhatsappRequest({ ...confirming.values, currentPassword }));
      resetFields(confirming.fields);
      if (confirming.fields.includes(activeField)) setActiveField(null);
      setConfirming(null);
      save.reset();
    } catch {
      // The password dialog displays the mutation error.
    }
  }

  async function checkOpenAi() {
    const version = ++openAiTestVersion.current;
    try {
      const { models: returned } = await testOpenAi.mutateAsync(stageWhatsappRequest(apiKey ? { apiKey } : {}));
      if (openAiTestVersion.current !== version) return;
      setDrafts((previous) => previous.openaiModel && !returned.includes(previous.openaiModel)
        ? withoutFields(previous, ["openaiModel"])
        : previous);
    } catch {
      // The card displays the connection error.
    }
  }

  const openAiMessage = testOpenAi.data && (openAiDirty ? UNSAVED_CONNECTION : models.length
    ? "Connected to OpenAI"
    : "Connected. This key returned no supported chat models.");
  const metaMessage = testMeta.data && (metaDirty ? UNSAVED_CONNECTION
    : `Connected: ${testMeta.data.displayPhoneNumber} · ${testMeta.data.verifiedName}`);

  return (
    <>
      <AssistantCard enabled={settings.assistantEnabled} readiness={settings.readiness} />
      <SettingsCard title="OpenAI">
        {secret("openaiApiKey")}
        <ConnectionTest test={testOpenAi} disabled={!apiKey && !settings.openaiApiKey.set} onTest={checkOpenAi} message={openAiMessage} />
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
        <CardSave dirty={openAiDirty} saving={save.isPending} onSave={() => openSave("Save OpenAI settings", OPENAI_FIELDS, openAiChanges)} />
      </SettingsCard>

      <SettingsCard title="Meta (WhatsApp Cloud API)">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <CommonInput name="phoneNumberId" label={FIELD_LABELS.phoneNumberId} value={plainValue("phoneNumberId")}
            onChange={(event) => set("phoneNumberId", event.target.value)} />
          <CommonInput name="graphVersion" label="Graph version" value={plainValue("graphVersion")}
            onChange={(event) => set("graphVersion", event.target.value)}
            onBlur={() => {
              if (drafts.graphVersion !== undefined && !drafts.graphVersion.trim()) resetFields(["graphVersion"]);
            }} />
        </div>
        {META_SECRET_FIELDS.map(secret)}
        <ConnectionTest
          test={testMeta}
          disabled={(!metaInput.accessToken && !settings.accessToken.set)
            || !(metaInput.phoneNumberId || settings.phoneNumberId) || !(metaInput.graphVersion || settings.graphVersion)}
          onTest={() => testMeta.mutate(stageWhatsappRequest(metaInput))}
          message={metaMessage}
        />
        <div className="flex w-full flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <CommonInput name="whatsapp-webhook-url" label="Webhook URL" value={settings.webhookUrl} readOnly />
          </div>
          <IconActionButton icon={Copy} label="Copy webhook URL" tone="success" onClick={() => copyUrl(settings.webhookUrl)} />
        </div>
        {localUrl && <p className="text-sm text-muted-foreground">
          Meta needs a public HTTPS address. Locally, paste your tunnel&apos;s address with /api/webhooks/whatsapp instead.
        </p>}
        <CardSave dirty={metaDirty} saving={save.isPending} onSave={() => openSave("Save Meta settings", META_FIELDS, metaChanges)} />
      </SettingsCard>

      <WhatsappPhoneCard phoneLimit={settings?.readiness?.phoneLimit} />
      {confirming && (
        <SettingsPasswordDialog
          title={confirming.title}
          pending={save.isPending}
          error={save.error}
          onClose={() => { setConfirming(null); save.reset(); }}
          onSubmit={saveCard}
        />
      )}
    </>
  );
}

function WhatsappSetup({ onDirtyChange }) {
  const query = useWhatsappSettings();
  if (!query.data) {
    return <SettingsSectionStatus isPending={query.isPending} error={query.error} onRetry={query.refetch} />;
  }
  return <WhatsappSettingsCards settings={query.data} onDirtyChange={onDirtyChange} />;
}

export default function WhatsappSettingsSection({ onDirtyChange, requestLeave }) {
  const { queryParams, ...table } = useTableQueryParams(VIEW_PARAMS);
  const { from, to, ...filters } = queryParams;
  const params = { ...filters, from, ...(!from || !to || from <= to ? { to } : {}) };
  const history = table.values.tab === "history";
  return (
    <>
      <FilterTabs options={["Setup", "History"]} value={history ? "History" : "Setup"} onValueChange={(value) => {
        const tab = value.toLowerCase();
        if (tab !== table.values.tab) requestLeave?.(() => table.setters.setTab(tab));
      }} />
      {history ? <WhatsappHistory {...table} params={params} /> : <WhatsappSetup onDirtyChange={onDirtyChange} />}
    </>
  );
}
