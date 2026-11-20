"use client";

import { useEffect, useId, useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Sparkles, Trash2, X } from "lucide-react";
import CommonInput from "@/components/common/CommonInput";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import IconActionButton from "@/components/common/IconActionButton";
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
      {/* The buttons sit beside the input and wrap under it only when the
          row is too narrow; items-end keeps them level with the input, not
          its label. */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
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
        <div className="flex gap-2">
          {editing ? (
            <>
              {onGenerate && <IconActionButton icon={Sparkles} label="Generate a new value" tone="primary" onClick={generate} />}
              {showGenerated && <IconActionButton icon={Copy} label="Copy" tone="success" onClick={() => copy(value)} />}
              {secret?.set && value !== null && (
                <IconActionButton icon={Trash2} label="Clear" tone="destructive" onClick={() => setClearing(true)} />
              )}
              <IconActionButton icon={X} label="Cancel" onClick={cancel} />
            </>
          ) : (
            <>
              {shown ? (
                <>
                  <IconActionButton icon={Copy} label="Copy" tone="success" onClick={() => copy(revealed)} />
                  <IconActionButton icon={EyeOff} label="Hide" tone="primary" onClick={() => setRevealed(null)} />
                </>
              ) : secret?.set && <IconActionButton icon={Eye} label="View" tone="primary" onClick={() => {
                onView?.();
                setError(null);
                setAsking(true);
              }} />}
              {onGenerate && <IconActionButton icon={Sparkles} label="Generate a new value" tone="primary" onClick={generate} />}
              <IconActionButton icon={Pencil} label="Edit" onClick={edit} />
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
