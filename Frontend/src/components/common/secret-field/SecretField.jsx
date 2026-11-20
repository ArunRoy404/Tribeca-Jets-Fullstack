"use client";

import { useEffect, useId, useState } from "react";
import CommonInput from "@/components/common/CommonInput";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import SettingsButton from "@/components/settings/SettingsButton";
import { useCopyToClipboard } from "@/hooks/common/useCopyToClipboard";
import SettingsPasswordDialog from "./SettingsPasswordDialog";

const REVEAL_MS = 30_000;

export default function SecretField({
  label,
  secret,
  onReveal,
  value,
  onChange,
  editing,
  onEditingChange,
  onGenerate,
  generateHint,
  active = true,
  onView,
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(null);
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [generated, setGenerated] = useState(false);
  const copy = useCopyToClipboard();

  if ((!active || editing || !secret?.set) && revealed !== null) setRevealed(null);
  if (!editing && generated) setGenerated(false);

  useEffect(() => {
    if (revealed === null) return;
    const timeout = setTimeout(() => setRevealed(null), REVEAL_MS);
    return () => clearTimeout(timeout);
  }, [revealed]);

  async function reveal(password) {
    setPending(true);
    setError(null);
    try {
      setRevealed(await onReveal(password));
      setAsking(false);
    } catch (reason) {
      setError(reason);
    } finally {
      setPending(false);
    }
  }

  function edit() {
    setRevealed(null);
    onEditingChange?.(true);
  }

  // Reachable without Edit first, so a new value is one click away.
  function generate() {
    setRevealed(null);
    if (!editing) onEditingChange?.(true);
    onChange?.(onGenerate());
    setGenerated(true);
  }

  function cancel() {
    setGenerated(false);
    onEditingChange?.(false);
  }

  const shown = active && revealed !== null;
  const showGenerated = editing && generated && Boolean(value);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <CommonInput
            key={editing ? "edit" : "saved"}
            name={id}
            label={label}
            type={editing && !showGenerated ? "password" : "text"}
            value={editing ? value ?? "" : shown ? revealed : secret?.masked ?? ""}
            placeholder={editing ? (value === null ? "Marked to clear" : "Enter a new value") : "Not set"}
            readOnly={!editing}
            autoComplete={editing ? "new-password" : "off"}
            spellCheck={false}
            onChange={(event) => {
              setGenerated(false);
              onChange?.(event.target.value);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              {onGenerate && <SettingsButton type="button" onClick={generate}>Generate</SettingsButton>}
              {showGenerated && <SettingsButton type="button" onClick={() => copy(value)}>Copy</SettingsButton>}
              <SettingsButton type="button" onClick={cancel}>Cancel</SettingsButton>
              {secret?.set && value !== null && (
                <SettingsButton type="button" onClick={() => setClearing(true)}>Clear</SettingsButton>
              )}
            </>
          ) : (
            <>
              {shown ? (
                <>
                  <SettingsButton type="button" onClick={() => copy(revealed)}>Copy</SettingsButton>
                  <SettingsButton type="button" onClick={() => setRevealed(null)}>Hide</SettingsButton>
                </>
              ) : secret?.set && <SettingsButton type="button" onClick={() => {
                onView?.();
                setError(null);
                setAsking(true);
              }}>View</SettingsButton>}
              {onGenerate && <SettingsButton type="button" onClick={generate}>Generate</SettingsButton>}
              <SettingsButton type="button" onClick={edit}>Edit</SettingsButton>
            </>
          )}
        </div>
      </div>
      {showGenerated && generateHint && (
        <p role="status" className="text-sm text-muted-foreground">{generateHint}</p>
      )}
      {editing && value === null && (
        <p role="status" className="text-sm text-muted-foreground">This credential will be cleared when you save.</p>
      )}
      {asking && (
        <SettingsPasswordDialog
          title={`View ${label.toLowerCase()}`}
          pending={pending}
          error={error}
          onClose={() => setAsking(false)}
          onSubmit={reveal}
        />
      )}
      {clearing && (
        <ConfirmDialog
          open
          tone="destructive"
          title={`Clear ${label.toLowerCase()}?`}
          description="Saving this card will remove the stored credential."
          confirmLabel="Clear"
          onOpenChange={setClearing}
          onConfirm={() => {
            setGenerated(false);
            onChange?.(null);
            setClearing(false);
          }}
        />
      )}
    </div>
  );
}
